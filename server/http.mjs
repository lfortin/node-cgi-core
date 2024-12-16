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

import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { createHandler } from "../cgi-core.js";

const port = process.env.PORT || 3001;

const callback = createHandler({
  urlPath: "/cgi-bin",
  filePath: "./cgi-bin",
  extensions: {
    "/usr/bin/perl -w": ["pl", "cgi"],
    "/usr/bin/python": ["py"],
    "/usr/bin/ruby": ["rb"],
    "/bin/bash": ["sh"],
    "/usr/local/bin/node": ["js", "node"],
  },
  indexExtension: "js",
  debugOutput: true,
  logRequests: true,
  maxBuffer: 4 * 1024 ** 2,
  requestChunkSize: 4 * 1024,
  responseChunkSize: 4 * 1024,
  env: (env, req) => {
    return {
      REMOTE_ADDR:
        req.headers["x-forwarded-for"] ||
        req.socket.remoteAddress ||
        req.connection.remoteAddress,
      REMOTE_HOST: req.headers["host"],
      REMOTE_AGENT: req.headers["user-agent"],
      HTTPS:
        req.headers["x-forwarded-proto"] === "https" ||
        req.socket.encrypted ||
        req.connection.encrypted
          ? "on"
          : undefined,
      SERVER_PORT: port,
      UNIQUE_ID: randomUUID({ disableEntropyCache: true }),
    };
  },
});

const app = createServer(async (req, res) => {
  const requestHandled = await callback(req, res);

  if (!requestHandled) {
    // here, handle any routing outside of urlPath
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end("<html><body>outside of url path /cgi-bin</body></html>");
  }
});
app.listen(port, () => {
  console.log(`go to http://127.0.0.1:${port}/cgi-bin/env.js ;)`);
});
