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
const {
  getUrlFilePath,
  getExecPath,
  createEnvObject,
  isAbsolutePath,
} = require("./lib/util");
const {
  errorHandler,
  terminateRequest,
  streamRequestPayload,
  streamResponsePayload,
} = require("./lib/wrapper");
const {
  DEFAULT_EXTENSIONS,
  DEFAULT_CONFIG,
  NUMERIC_CONFIG_KEYS,
} = require("./lib/constants");

function createHandler(configOptions = {}) {
  const config = { ...DEFAULT_CONFIG, ...configOptions };

  // Coerce numeric config options
  for (const key of NUMERIC_CONFIG_KEYS) {
    const value = configOptions[key];
    if (value !== undefined) {
      const coerced = Number(value);
      if (Number.isNaN(coerced)) {
        throw new Error(`Invalid number for config.${key}`);
      }
      config[key] = coerced;
    }
  }

  if (config.requestChunkSize > config.maxBuffer) {
    throw new Error(
      `requestChunkSize cannot be greater than maxBuffer (${config.maxBuffer})`
    );
  }
  if (config.responseChunkSize > config.maxBuffer) {
    throw new Error(
      `responseChunkSize cannot be greater than maxBuffer (${config.maxBuffer})`
    );
  }

  const absolutePaths = {};
  Object.keys(config.extensions).forEach((execPath) => {
    absolutePaths[execPath] = isAbsolutePath(execPath);
  });

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
    let env;

    try {
      if (!filePath) {
        throw new Error("missing filePath");
      }
      // Check file permissions
      await access(fullFilePath, constants.F_OK);
      if (config.requireExecBit || !execPath) {
        await access(fullFilePath, constants.X_OK);
      }

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
      if (err.code === "EACCES") {
        const message = `${fullFilePath} is not executable.`;
        errorHandler.apply({ req, res, config }, [message]);
        return true;
      }
      errorHandler.apply({ req, res, config }, [err.message]);
      return true;
    }

    const { cgiProcess, ac, timeoutId } = spawnProcess({
      execPath,
      fullFilePath,
      env,
      config,
      req,
      res,
      useShell: execPath ? !absolutePaths[execPath] : false,
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
  const { execPath, fullFilePath, env, config, req, res, useShell } = params;

  const ac = new AbortController();

  const exec = execPath || fullFilePath;
  const args = execPath ? [fullFilePath] : [];

  // If execPath is provided, use it as interpreter (e.g., /usr/bin/perl), passing fullFilePath as argument
  // If not, assume fullFilePath is executable (script with shebang or binary)
  const cgiProcess = spawn(exec, args, {
    env,
    shell: useShell,
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
  defaultExtensions: DEFAULT_EXTENSIONS,
  defaultConfig: DEFAULT_CONFIG,
  createHandler,
};
