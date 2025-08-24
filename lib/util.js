"use strict";
// Copyright (c) 2024-2025 lfortin
//
// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
// LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

Object.defineProperty(exports, "__esModule", { value: true });

const { extname, normalize } = require("node:path");
const { PassThrough } = require("node:stream");
const { createInterface } = require("node:readline");
const { version } = require("../package.json");
const {
  DEFAULT_URL_BASE,
  FILE_PATH_SPLIT_REGEX,
  SANITIZE_PATH_REGEX,
  GATEWAY_INTERFACE,
  PATH_INFO_SPLIT_REGEX,
  HEADER_BODY_SEPARATOR_LF,
  HEADER_BODY_SEPARATOR_CRLF,
  REQUEST_LOG_MAX_SIZE,
  IS_WINDOWS,
} = require("./constants");

function getUrlFilePath(url, config) {
  const parsedUrl = new URL(url, DEFAULT_URL_BASE);

  let completeFilePath = parsedUrl.pathname;
  let filePath = completeFilePath.split(FILE_PATH_SPLIT_REGEX)[0];

  if (!extname(filePath)) {
    filePath = `${filePath}/index.${config.indexExtension}`;
  }

  // clean up config.urlPath
  const basePath = config.urlPath.replace(/\/+$/, "").replace(/\/+/g, "/");

  // Check if the file path starts with the base path (case-insensitive)
  if (basePath && filePath.toLowerCase().startsWith(basePath.toLowerCase())) {
    // Extract the remaining file path after the base path
    filePath = filePath.slice(basePath.length);
  } else {
    return null; // Return null if it doesn't match
  }

  return sanitizePath(decodeURIComponent(filePath));
}

function sanitizePath(path) {
  return path
    .replace(SANITIZE_PATH_REGEX, "")
    .replace(/^[a-zA-Z]:[\\/]+/, "")
    .replace(/^\/+/, "")
    .replace(/^\\+/, "")
    .replace(/\/+/g, "/")
    .replace(/\\+/g, "\\");
}

function getExecPath(filePath, extensions) {
  // Extract the extension from filePath
  const fileExt = extname(filePath).slice(1); // slice(1) to remove the dot (.)

  for (let execPath in extensions) {
    if (extensions[execPath].includes(fileExt)) {
      return execPath;
    }
  }

  return null;
}

function createEnvObject(req, extraInfo) {
  const { trustProxy } = extraInfo;

  const env = {};
  for (const header of Object.keys(req.headers)) {
    const snakeCase = header.replace(/\-/g, "_").toUpperCase();
    env[`HTTP_${snakeCase}`] = req.headers[header];
  }

  // here, insert CGI specific env vars
  const parsedUrl = new URL(req.url, DEFAULT_URL_BASE);
  env.QUERY_STRING = parsedUrl.search.replace(/^\?/, "");
  env.REQUEST_METHOD = req.method;
  env.REQUEST_URI = req.url;
  env.PATH = process.env.PATH;
  env.GATEWAY_INTERFACE = GATEWAY_INTERFACE;
  env.SERVER_PROTOCOL = `HTTP/${req.httpVersion}`;
  env.SERVER_SOFTWARE = `Node.js/${process.version} (cgi-core/v${version})`;
  env.SCRIPT_FILENAME = normalize(extraInfo.fullFilePath);
  env.SCRIPT_NAME = normalize("/" + extraInfo.filePath);

  if (env.HTTP_CONTENT_TYPE) {
    env.CONTENT_TYPE = env.HTTP_CONTENT_TYPE;
  }
  if (env.HTTP_CONTENT_LENGTH) {
    env.CONTENT_LENGTH = env.HTTP_CONTENT_LENGTH;
  }

  const [, separator, pathInfo] = parsedUrl.pathname.split(
    PATH_INFO_SPLIT_REGEX
  );
  if (separator || pathInfo) {
    env.PATH_INFO = `${separator}${pathInfo}`.replace(/\/+/g, "/");
  }

  // REMOTE_ADDR may be affected by X-Forwarded-For
  const clientIp =
    trustProxy && req.headers["x-forwarded-for"]
      ? req.headers["x-forwarded-for"].split(",")[0].trim()
      : req.socket?.remoteAddress || req.connection?.remoteAddress;
  env.REMOTE_ADDR = clientIp;

  // HTTPS is set to "on" if the connection is encrypted or proxied via X-Forwarded-Proto
  if (
    (trustProxy && req.headers["x-forwarded-proto"] === "https") ||
    req.socket?.encrypted
  ) {
    env.HTTPS = "on";
  }

  // SERVER_NAME may reflect the Host header
  if (trustProxy && req.headers["host"]) {
    const [name, port] = req.headers["host"].split(":");
    env.SERVER_NAME = name;
    env.SERVER_PORT = port || (env.HTTPS === "on" ? "443" : "80");
  } else if (req.socket?.localAddress) {
    env.SERVER_NAME = req.socket?.localAddress;
    env.SERVER_PORT = String(
      req.socket?.localPort || req.connection?.localPort
    );
  }

  if (req.headers["authorization"]) {
    env.AUTH_TYPE = req.headers["authorization"].split(" ")[0];
  }

  if (extraInfo.env) {
    if (typeof extraInfo.env === "function") {
      Object.assign(env, extraInfo.env(env, req));
    } else {
      Object.assign(env, extraInfo.env);
    }
  }
  return env;
}

async function parseResponse(output) {
  const headers = {};
  let status;

  const result = splitOutput(output);

  if (result === null) {
    throw new HeaderError(`HTTP Response Headers:
  
  Missing end of headers line. This could be due to one of the following reasons:
  -The CGI script did not return a proper end of headers line('\\n').
  -The responseChunkSize configuration option is set too low; consider increasing it.
    `);
  }

  const [headersContent, bodyContent] = result;

  const through = new PassThrough();
  const rl = createInterface({
    input: through,
    crlfDelay: Infinity,
  });
  process.nextTick(() => {
    through.end(headersContent);
  });

  for await (let line of rl) {
    line = line.trim();

    const index = line.indexOf(":");
    if (index !== -1) {
      const key = line.slice(0, index).trim();
      const value = line.slice(index + 1).trim();
      if (key.toLowerCase() === "status") {
        status = parseInt(value, 10);
      } else {
        headers[key] = value;
      }
    } else if (line.match(/^HTTP\/1\.1/i)) {
      status = parseInt(line.split(/\s+/)[1], 10);
    } else {
      throw new HeaderError(`HTTP Response Headers:
  
  Invalid or not supported header line: ${line}
      `);
    }
  }

  return { headers, bodyContent, status };
}

class HeaderError extends Error {
  constructor(message) {
    super(message);
    this.name = "HeaderError";
  }
}

function splitOutput(output) {
  let index = output.indexOf(HEADER_BODY_SEPARATOR_LF);
  let offset = 2;

  if (index === -1) {
    index = output.indexOf(HEADER_BODY_SEPARATOR_CRLF);
    offset = 4;
  }

  if (index === -1) {
    return null;
  }

  const first = output.slice(0, index);
  const second = output.slice(index + offset);

  return [first, second];
}

function getRequestLogger(maxSize = REQUEST_LOG_MAX_SIZE) {
  let requestsLogged = new Map();
  return function (req, status) {
    if (requestsLogged.has(req)) {
      return;
    }

    // If the map size exceeds 1000, remove the oldest entry
    if (requestsLogged.size >= maxSize) {
      // Remove the first entry in the Map (the least recently used)
      const firstKey = requestsLogged.keys().next().value;
      requestsLogged.delete(firstKey);
    }

    requestsLogged.set(req, true);
    return `${req.method} ${req.url} : ${status}`;
  };
}

function isAbsolutePosixPath(path) {
  return path.startsWith("/");
}

function isAbsoluteWindowsPath(path) {
  return /^[a-zA-Z]:[\\/]|^\\\\/.test(path);
}

function isAbsolutePath(path) {
  return IS_WINDOWS ? isAbsoluteWindowsPath(path) : isAbsolutePosixPath(path);
}

module.exports = {
  getUrlFilePath,
  sanitizePath,
  getExecPath,
  createEnvObject,
  parseResponse,
  HeaderError,
  splitOutput,
  getRequestLogger,
  isAbsolutePosixPath,
  isAbsoluteWindowsPath,
  isAbsolutePath,
};
