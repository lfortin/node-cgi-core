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

const { STATUS_CODES } = require("node:http");
const { parseResponse, getRequestLogger } = require("./util");

const requestLogger = getRequestLogger();

function logRequest(req, statusCode) {
  const log = requestLogger(req, statusCode);
  if (log) {
    console.log(log);
  }
}

function errorHandler(data) {
  const { req, res, config } = this;
  //const error = data.toString();
  //console.log(error);

  const statusCode = 500;

  if (config.debugOutput) {
    res.statusCode = statusCode;
    if (!res.headersSent) {
      res.setHeaders(new Headers({ "Content-Type": "text/plain" }));
    }
    res.write(`${statusCode}: ${STATUS_CODES[statusCode]}\n\n`);
    res.end(data);
    req.destroy(); // Terminate the request
    if (config.logRequests) {
      logRequest(req, res.statusCode);
    }
  } else {
    terminateRequest(req, res, statusCode, config);
  }
}

function terminateRequest(req, res, statusCode = 500, config) {
  res.statusCode = statusCode;
  if (!res.headersSent) {
    res.setHeaders(new Headers({ "Content-Type": "text/plain" }));
  }
  res.end(STATUS_CODES[statusCode]);
  req.destroy(); // Terminate the request
  if (config.logRequests) {
    logRequest(req, res.statusCode);
  }
}

async function streamRequestPayload(child, req, config) {
  if (child.stdin) {
    // this just prevents exiting main node process and exits child process instead
    child.stdin.on("error", () => {});
    //req.pipe(child.stdin);

    const handleRequestPayload = function () {
      let chunk;
      while (null !== (chunk = req.read(config.requestChunkSize))) {
        child.stdin.write(chunk);
      }
    };
    handleRequestPayload();
    req.on("readable", handleRequestPayload);

    return new Promise((resolve) => {
      req.on("end", () => {
        child.stdin.end("");
        resolve(true);
      });
    });
  }
}

async function streamResponsePayload(child, req, res, config) {
  if (res.headersSent) {
    return;
  }
  if (child.stdout) {
    let initChunkRead = false;
    let stdoutEnded = false;
    let headers;
    let bodyContent;
    let status;
    child.stdout.pause();
    // this just prevents exiting main node process and exits child process instead
    child.stdout.on("error", () => {});

    const handleResponsePayload = async function () {
      let chunk;
      while (null !== (chunk = child.stdout.read(config.responseChunkSize))) {
        if (!initChunkRead) {
          try {
            ({ headers, bodyContent, status } = await parseResponse(chunk));
          } catch (err) {
            terminateRequest(req, res, 500, config);
            initChunkRead = true;
            child.stdout.removeListener("readable", handleResponsePayload);
            child.stdout.resume();
            return;
          }

          if (!res.headersSent) {
            res.statusCode = status || 200;
            res.setHeaders(new Headers(headers));
          }
          res.write(bodyContent);
        } else {
          res.write(chunk);
        }
        initChunkRead = true;
      }
      process.nextTick(() => {
        if (stdoutEnded) {
          res.end("");
          if (config.logRequests) {
            logRequest(req, res.statusCode);
          }
        }
      });
    };
    handleResponsePayload();
    child.stdout.on("readable", handleResponsePayload);
    child.stdout.on("end", () => {
      stdoutEnded = true;
    });
  } else {
    res.statusCode = 204;
    res.end("");
    if (config.logRequests) {
      logRequest(req, res.statusCode);
    }
  }
}

module.exports = {
  logRequest,
  errorHandler,
  terminateRequest,
  streamRequestPayload,
  streamResponsePayload,
};
