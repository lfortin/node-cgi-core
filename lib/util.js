"use strict";
// Copyright (c) 2024 lfortin
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

const { extname, resolve, normalize } = require("node:path");
const { PassThrough } = require("node:stream");
const { createInterface } = require("node:readline");
const os = require("node:os");

function getUrlFilePath(url, config) {
  // Parse the URL using a URL object
  const parsedUrl = new URL(url, "http://example.com");

  // Extract the pathname (path portion) after removing leading slash
  //let filePath = parsedUrl.pathname.slice(1);
  let completeFilePath = parsedUrl.pathname;
  let filePath = completeFilePath.split(/(?<=\.[a-zA-Z]+)(\/)/)[0];

  // Ensure basePath consistency (avoid double slashes)
  //basePath = basePath.replace(/\/$/, ''); // Remove trailing slash from basePath
  const basePath = resolve(config.urlPath);
  if (!extname(filePath)) {
    filePath = resolve(`${filePath}/index.${config.indexExtension}`);
  }

  // Check if file path starts with the base path (case-insensitive)
  if (basePath && filePath.toLowerCase().startsWith(basePath.toLowerCase())) {
    // Extract the remaining path after the base path
    filePath = filePath.slice(basePath.length);
  } else {
    return null;
  }

  // remove leading slash(es)
  filePath = filePath.replace(/^\/+/, "");

  if (os.platform() === "win32") {
    filePath = filePath.replace(/\//g, "\\");
  }

  // Decode, then sanitize the file path
  return sanitizePath(decodeURIComponent(filePath));
}

function sanitizePath(path) {
  return path
    .replace(/(\.\.)+|[\r\n\x00-\x1F\x7F]/g, "")
    .replace(/\/+/g, "/")
    .replace(/\\+/g, "\\");
}

// Function to get the execution path based on file extension
function getExecPath(filePath, extensions) {
  // Extract the extension from filePath
  const fileExt = extname(filePath).slice(1); // slice(1) to remove the dot (.)

  // Iterate over each key-value pair in extensions
  for (let execPath in extensions) {
    // Check if the fileExt is in the array of extensions for this execPath
    if (extensions[execPath].includes(fileExt)) {
      return execPath; // Return the execution path
    }
  }

  return null; // Return null if no matching extension found
}

function createEnvObject(req, extraInfo) {
  const env = {};
  for (const header of Object.keys(req.headers)) {
    const snakeCase = header.replace(/\-/g, "_").toUpperCase();
    env[`HTTP_${snakeCase}`] = req.headers[header];
  }

  // here, insert CGI specific env vars
  const parsedUrl = new URL(req.url, "http://example.com");
  env.QUERY_STRING = parsedUrl.search.replace(/^\?/, "");
  env.REQUEST_METHOD = req.method;
  env.REQUEST_URI = req.url;
  env.PATH = process.env.PATH;
  env.SERVER_PROTOCOL = `HTTP/${req.httpVersion}`;
  env.SERVER_SOFTWARE = `Node.js/${process.version}`;
  env.SCRIPT_FILENAME = normalize(extraInfo.fullFilePath);
  env.SCRIPT_NAME = normalize("/" + extraInfo.filePath);

  if (env.HTTP_CONTENT_TYPE) {
    env.CONTENT_TYPE = env.HTTP_CONTENT_TYPE;
  }
  if (env.HTTP_CONTENT_LENGTH) {
    env.CONTENT_LENGTH = env.HTTP_CONTENT_LENGTH;
  }
  
  const [, separator, pathInfo] =
    parsedUrl.pathname.split(/(?<=\.[a-zA-Z]+)(\/)/);
  if (separator || pathInfo) {
    env.PATH_INFO = `${separator}${pathInfo}`.replace(/\/+/g, "/");
  }

  if (extraInfo.env) {
    Object.assign(env, extraInfo.env);
  }
  return env;
}

async function parseResponse(output) {
  // Initialize variables to store headers and body
  const headers = {};
  let bodyContent = "";
  let status;

  // Flag to determine if we are parsing headers
  let parsingHeaders = true;

  const through = new PassThrough();
  const rl = createInterface({
    input: through,
    crlfDelay: Infinity,
  });
  process.nextTick(() => {
    through.end(output);
  });

  for await (let line of rl) {
    if (parsingHeaders) {
      line = line.trim();

      // Check if the line is empty (indicating separation between headers and body)
      if (line === "") {
        parsingHeaders = false; // Stop parsing headers
        continue; // Skip to next iteration
      }

      // Split the line into key and value based on the first colon
      const index = line.indexOf(":");
      if (index !== -1) {
        const key = line.slice(0, index).trim();
        const value = line.slice(index + 1).trim();
        if (key.toLowerCase() === "status") {
          status = parseInt(value);
        } else {
          headers[key] = value;
        }
      } else if (line.trim().match(/^HTTP\/1\.1/i)) {
        status = parseInt(line.split(/\s+/)[1]);
      }
    } else {
      // Concatenate lines to form the body content
      bodyContent += line + os.EOL;
    }
  }

  // Return an object containing headers and bodyContent
  return { headers, bodyContent, status };
}

function getRequestLogger() {
  let requestsLogged = new Map();
  return function (req, status) {
    if (requestsLogged.get(req)) {
      return;
    }
    if (requestsLogged.size > 1000) {
      requestsLogged.clear();
    }
    requestsLogged.set(req, true);
    return `${req.method} ${req.url} : ${status}`;
  };
}

module.exports = {
  getUrlFilePath,
  sanitizePath,
  getExecPath,
  createEnvObject,
  parseResponse,
  getRequestLogger,
};
