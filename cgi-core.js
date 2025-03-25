"use strict";
// cgi-core
// Thin wrapper for CGI scripts
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

const { resolve } = require("node:path");
const { access, constants } = require("node:fs/promises");
const { spawn } = require("node:child_process");
const { getUrlFilePath, getExecPath, createEnvObject } = require("./lib/util");
const {
  errorHandler,
  terminateRequest,
  streamRequestPayload,
  streamResponsePayload,
} = require("./lib/wrapper");

const defaultExtensions =
  process.platform === "win32"
    ? {
        perl: ["pl", "cgi"],
        python: ["py"],
        node: ["js", "node"],
      }
    : {
        "/usr/bin/perl": ["pl", "cgi"],
        "/usr/bin/python": ["py"],
        "/usr/local/bin/node": ["js", "node"],
      };

const defaultConfig = {
  urlPath: "/cgi-bin",
  filePath: process.cwd(),
  extensions: defaultExtensions,
  indexExtension: "js",
  debugOutput: false,
  logRequests: false,
  maxBuffer: 2 * 1024 ** 2,
  requestChunkSize: 32 * 1024,
  responseChunkSize: 32 * 1024,
  requestTimeout: 30000,
  forceKillDelay: 1000,
  statusPages: {},
  env: {},
};

function createHandler(configOptions = {}) {
  const config = { ...defaultConfig, ...configOptions };

  return async function (req, res) {
    const filePath = getUrlFilePath(req.url, config);

    if (filePath === null) {
      return false;
    }

    req.pause();

    if (parseInt(req.headers["content-length"], 10) > config.maxBuffer) {
      terminateRequest(req, res, 413, config);
      return true;
    }

    const fullFilePath = resolve(config.filePath, filePath);
    const execPath = getExecPath(filePath, config.extensions);
    const fullExecPath = `${execPath ? execPath + " " : ""}${fullFilePath}`;
    let env;

    try {
      if (!filePath) {
        throw new Error("missing filePath");
      }
      // Check file permissions
      await access(fullFilePath, constants.F_OK);
      await access(fullFilePath, constants.X_OK);

      // Create the environment object
      env = createEnvObject(req, {
        filePath,
        fullFilePath,
        env: config.env,
      });
    } catch (err) {
      if (err.code === "ENOENT") {
        terminateRequest(req, res, 404, config);
        return true;
      }
      errorHandler.apply({ req, res, config }, [err.message]);
      return true;
    }

    const { cgiProcess, ac, timeoutId } = spawnProcess({
      fullExecPath,
      env,
      config,
      req,
      res,
    });

    await streamRequestPayload(cgiProcess, req, config);
    streamResponsePayload(cgiProcess, req, res, config);

    res.on("close", () => {
      ac.abort();
      req.destroy();
      clearTimeout(timeoutId);
    });

    return true;
  };
}

function spawnProcess(params) {
  const { fullExecPath, env, config, req, res } = params;

  const ac = new AbortController();

  const cgiProcess = spawn(fullExecPath, {
    env,
    shell: true,
    windowsHide: true,
    maxBuffer: config.maxBuffer,
    signal: ac.signal,
  });

  const timeoutId = setTimeout(() => {
    ac.abort();
    terminateRequest(req, res, 504, config);

    const forceKillTimeoutId = setTimeout(() => {
      cgiProcess.kill("SIGKILL");
    }, config.forceKillDelay);

    cgiProcess.on("exit", () => {
      clearTimeout(forceKillTimeoutId);
    });
  }, config.requestTimeout);

  cgiProcess.on("close", (code) => {
    clearTimeout(timeoutId);
    //console.log(`child process exited with code ${code}`);
  });
  cgiProcess.on("error", (error) => {
    clearTimeout(timeoutId);
  });
  cgiProcess.stderr.on("data", errorHandler.bind({ req, res, config }));

  return { cgiProcess, ac, timeoutId };
}

module.exports = {
  defaultExtensions,
  defaultConfig,
  createHandler,
};
