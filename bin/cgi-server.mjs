#!/usr/bin/env node

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
import { parseArgs } from "node:util";
import { randomUUID } from "node:crypto";
import { createHandler, defaultConfig } from "../cgi-core.mjs";

const options = {
  help: {
    type: "boolean",
    short: "h",
  },
  urlPath: {
    type: "string",
  },
  filePath: {
    type: "string",
  },
  indexExtension: {
    type: "string",
  },
  debugOutput: {
    type: "boolean",
    short: "d",
  },
  logRequests: {
    type: "boolean",
    short: "l",
  },
  port: {
    type: "string",
    short: "p",
  },
};

let values;
try {
  ({ values } = parseArgs({ options }));
} catch (err) {
  console.log("invalid config");
  process.exit();
}

if (values.help) {
  console.log(`
  -h, --help                    Display help
  --urlPath <urlPath>           Set base url path for routing
  --filePath <filePath>         Set file path where the CGI scripts are located
  --indexExtension <extension>  Set file extension to lookup for index files
  -d, --debugOutput             Output errors for HTTP status 500
  -l, --logRequests             Log HTTP requests to STDOUT
  -p, --port <port>             Set the port to listen on
    `);
  process.exit();
}
const port = parseInt(values.port, 10) || 3001;

const config = {
  ...defaultConfig,
  ...values,
  env: (env, req) => {
    return {
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
};
const cgiHandler = createHandler(config);

const app = createServer(async (req, res) => {
  const requestHandled = await cgiHandler(req, res);

  if (!requestHandled) {
    // here, handle any routing outside of urlPath
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(`outside of url path ${config.urlPath}`);
  }
});
app.listen(port, () => {
  console.log(`listening on port ${port}`);
});
