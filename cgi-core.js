"use strict";
// cgi-core
// Thin wrapper for CGI scripts
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

import { STATUS_CODES } from 'node:http';
import { resolve } from 'node:path';
import { access, constants } from 'node:fs/promises';
import { exec } from 'node:child_process';
import {
  getUrlFilePath,
  getExecPath,
  createEnvObject,
  parseResponse,
  getRequestLog
} from './lib/util.js';

export const defaultExtensions = {
  "/usr/bin/perl": ["pl", "cgi"],
  "/usr/bin/python": ["py"],
  "/usr/local/bin/node": ["js", "node"]
};
export const defaultConfig = {
  urlPath: "/cgi-bin",
  filePath: process.cwd(),
  extensions: defaultExtensions,
  indexExtension: "js",
  debugOutput: false,
  logRequests: false,
  maxBuffer: 2 * 1024**2
};

export function createHandler (configOptions={}) {
  const config = {...defaultConfig, ...configOptions};

  return async function(req, res) {
    const filePath = getUrlFilePath(req.url, config);
    if(filePath === null) {
      return false;
    }
    req.pause();
    if(parseInt(req.headers['content-length']) > config.maxBuffer) {
      terminateRequest(req, res, 413, config);
      return true;
    }
    const fullFilePath = resolve(config.filePath, filePath);
    const execPath = getExecPath(filePath, config.extensions);
    const fullExecPath = `${execPath ? execPath + ' ' : ''}${fullFilePath}`;
    const env = createEnvObject(req, {filePath, fullFilePath});

    // Check if the file exists
    try {
      if(!filePath) {
        throw 'no filePath';
      }
      await access(fullFilePath, constants.F_OK);
    } catch(err) {
      terminateRequest(req, res, 404, config);
      return true;
    }

    // TODO: use spawn for a better handling of child.stdin, child.stdout
    const child = exec(fullExecPath, { env, maxBuffer: config.maxBuffer }, async (error, stdout, stderr) => {
      if (error) {
        if(res.headersSent) {
          return;
        }
        let statusCode;
        switch (error.code) {
          case 'ENOENT':
            statusCode = 404;
            break;
          case 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER':
            statusCode = 413;
            break;
          default:
            statusCode = 500;
        }
        if(config.debugOutput) {
          res.writeHead(statusCode, {'Content-Type': 'text/plain'});
          res.write(`${statusCode}: ${STATUS_CODES[statusCode]}\n\n`);
          res.end(stderr);
          req.destroy(); // Terminate the request
          if(config.logRequests) {
            console.log(getRequestLog(req, statusCode));
          }
        } else {
          terminateRequest(req, res, statusCode, config);
        }
        return;
      }
      
      const {headers, bodyContent} = await parseResponse(stdout);

      res.writeHead(200, headers);
      res.end(bodyContent);
      if(config.logRequests) {
        console.log(getRequestLog(req, 200));
      }
    });

    streamRequestPayload(child, req);

    return true;
  }
}

export function terminateRequest(req, res, statusCode=500, config) {
  res.writeHead(statusCode, {'Content-Type': 'text/plain'});
  res.end(STATUS_CODES[statusCode]);
  req.destroy(); // Terminate the request
  if(config.logRequests) {
    console.log(getRequestLog(req, statusCode));
  }
}

export function streamRequestPayload(child, req) {
  if(child.stdin) {
    // this just prevents exiting main node process and exits child process instead
    child.stdin.on('error', () => {});
    //req.pipe(child.stdin);

    const handleRequestPayload = function() {
      let chunk;
      while (null !== (chunk = req.read(10240))) {
        child.stdin.write(chunk);
      }
    }
    handleRequestPayload();
    req.on('readable', handleRequestPayload);
    req.on('end', () => {
      child.stdin.end('');
    });
  }
}
