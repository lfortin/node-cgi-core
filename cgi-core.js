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
import { spawn } from 'node:child_process';
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

    const child = spawn(fullExecPath, { env, shell: true, windowsHide: true, maxBuffer: config.maxBuffer });

    child.on('close', (code) => {
      //console.log(`child process exited with code ${code}`);
    });
    child.on('error', error => {
      //console.log('error', error);
    });
    child.stderr.on('data', data => {
      const error = data.toString();
      //console.log(error);
      if(res.headersSent) {
        return;
      }
      const statusCode = 500;

      if(config.debugOutput) {
        res.writeHead(statusCode, {'Content-Type': 'text/plain'});
        res.write(`${statusCode}: ${STATUS_CODES[statusCode]}\n\n`);
        res.end(data);
        req.destroy(); // Terminate the request
        if(config.logRequests) {
          console.log(getRequestLog(req, statusCode));
        }
      } else {
        terminateRequest(req, res, statusCode, config);
      }
    });

    await streamRequestPayload(child, req);
    streamResponsePayload(child, req, res, config);

    res.on('close', () => {
      req.destroy();
    });

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

export async function streamRequestPayload(child, req) {
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

    return new Promise(resolve => {
      req.on('end', () => {
        child.stdin.end('');
        resolve(true);
      });
    });
  }
}

export async function streamResponsePayload(child, req, res, config) {
  if(res.headersSent) {
    return;
  }
  if(child.stdout) {
    // this just prevents exiting main node process and exits child process instead
    child.stdout.on('error', () => {});

    const {headers, bodyContent} = await parseResponse(child.stdout);

    if(res.headersSent) {
      return;
    }
    res.writeHead(200, headers);
    res.end(bodyContent);
    if(config.logRequests) {
      console.log(getRequestLog(req, 200));
    }
  } else {
    res.writeHead(204);
    res.end('');
    if(config.logRequests) {
      console.log(getRequestLog(req, 204));
    }
  }
}
