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
  parseResponse
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
  debugOutput: false
};

export function createHandler (config=defaultConfig) {
  return async function(req, res) {

    const filePath = getUrlFilePath(req.url, config.urlPath);
    if(!filePath) {
      return false;
    }
    const fullFilePath = resolve(config.filePath, filePath);
    const execPath = getExecPath(filePath, config.extensions);
    const fullExecPath = `${execPath ? execPath + ' ' : ''}${fullFilePath}`;
    const env = createEnvObject(req);

    // Check if the file exists
    try {
      await access(fullFilePath, constants.F_OK);
    } catch(err) {
      res.writeHead(404, {'Content-type': 'text/plain'});
      res.end(STATUS_CODES[404]);
      return true;
    }

    const child = exec(fullExecPath, { env }, async (error, stdout, stderr) => {
      if (error) {
        const statusCode = error.code === 'ENOENT' ? 404 : 500;
        res.writeHead(statusCode, {'Content-type': 'text/plain'});
        if(config.debugOutput) {
          res.write(`${statusCode}: ${STATUS_CODES[statusCode]}\n\n`);
          res.end(stderr);
        } else {
          res.end(STATUS_CODES[statusCode]);
        }
        return;
      }
      
      const {headers, bodyContent} = await parseResponse(stdout);

      res.writeHead(200, headers);
      res.end(bodyContent);
    });
    if(child.stdin) {
      req.pipe(child.stdin);
    }

    return true;
  }
}
