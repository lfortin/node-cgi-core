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

import { extname, resolve } from 'node:path';
import { PassThrough } from 'node:stream';
import { createInterface } from 'node:readline';
import { EOL } from 'node:os';

export function getUrlFilePath(url, basePath) {
  // Parse the URL using a URL object
  const parsedUrl = new URL(url, 'http://example.com');

  // Extract the pathname (path portion) after removing leading slash
  //let filePath = parsedUrl.pathname.slice(1);
  let filePath = parsedUrl.pathname;

  // Ensure basePath consistency (avoid double slashes)
  //basePath = basePath.replace(/\/$/, ''); // Remove trailing slash from basePath
  basePath = resolve(basePath);

  // Check if file path starts with the base path (case-insensitive)
  if (basePath && filePath.toLowerCase().startsWith(basePath.toLowerCase())) {
    // Extract the remaining path after the base path
    filePath = filePath.slice(basePath.length);
  } else {
    return null;
  }

  // remove leading slash(es)
  filePath = filePath.replace(/^\/+/, "");

  // Decode, then sanitize the file path
  return sanitizePath(decodeURIComponent(filePath));
}

export function sanitizePath(path) {
  return path.replace(/\.\.|\r|\n/g, "");
}

// Function to get the execution path based on file extension
export function getExecPath(filePath, extensions) {
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

export function createEnvObject(req) {
  const env = {};
  for(const header of Object.keys(req.headers)) {
    const snakeCase = header.replace(/\-/g, "_").toUpperCase();
    env[`HTTP_${snakeCase}`] = req.headers[header];
  }

  // here, insert CGI specific env vars
  const parsedUrl = new URL(req.url, 'http://example.com');
  env.QUERY_STRING = parsedUrl.search.replace(/^\?/, '');
  env.REQUEST_METHOD = req.method;

  return env;
}

export async function parseResponse(output) {

  // Initialize variables to store headers and body
  const headers = {};
  let bodyContent = '';

  // Flag to determine if we are parsing headers
  let parsingHeaders = true;

  const through = new PassThrough();
  const rl = createInterface({
    input: through,
    crlfDelay: Infinity
  });
  process.nextTick(() => {
    through.end(output);
  });

  for await (let line of rl) {
    if (parsingHeaders) {
      line = line.trim();

      // Check if the line is empty (indicating separation between headers and body)
      if (line === '') {
        parsingHeaders = false; // Stop parsing headers
        continue; // Skip to next iteration
      }

      // Split the line into key and value based on the first colon
      const index = line.indexOf(':');
      if (index !== -1) {
        const key = line.slice(0, index).trim();
        const value = line.slice(index + 1).trim();
        headers[key] = value;
      }
    } else {
      // Concatenate lines to form the body content
      bodyContent += line + EOL;
    }
  }

  // Return an object containing headers and bodyContent
  return { headers, bodyContent };
}
