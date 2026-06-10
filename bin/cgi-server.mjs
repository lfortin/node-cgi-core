#!/usr/bin/env node

// Copyright (c) 2024-2026 lfortin
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
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHandler, defaultConfig } from "../cgi-core.mjs";

const DEFAULT_CONFIG_FILE = "cgi-core.config.json";

const require = createRequire(import.meta.url);
const { version } = require("../package.json");

const options = {
  help: {
    type: "boolean",
    short: "h",
  },
  version: {
    type: "boolean",
    short: "v",
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
  maxBuffer: {
    type: "string",
  },
  requestChunkSize: {
    type: "string",
  },
  responseChunkSize: {
    type: "string",
  },
  requestTimeout: {
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
  trustProxy: {
    type: "boolean",
  },
  port: {
    type: "string",
    short: "p",
  },
  teapot: {
    type: "boolean",
  },
  config: {
    type: "string",
    short: "c",
  },
};

function loadConfigFile(configPath, required) {
  let content;
  try {
    content = readFileSync(configPath, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") {
      if (required) {
        throw new Error(`Config file not found: ${configPath}`);
      }
      return {};
    }
    throw err;
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    throw new Error(
      `Invalid JSON in config file ${configPath}: ${err.message}`,
    );
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Config file must contain a JSON object: ${configPath}`);
  }

  return parsed;
}

let values;
try {
  ({ values } = parseArgs({ options }));
} catch (err) {
  console.error("invalid config");
  process.exit(1);
}

if (values.help) {
  console.log(`
  cgi-server (cgi-core v${version}). Released under the MIT License.

  -h, --help                    Display help
  -v, --version                 Display cgi-core version string
  -c, --config <file>           Load settings from a JSON config file

  --urlPath <urlPath>           Set base url path for routing
  --filePath <filePath>         Set file path where the CGI scripts are located
  -p, --port <port>             Set the port to listen on

  --indexExtension <extension>  Set file extension to lookup for index files
  --maxBuffer <bytes>           Set the allowed HTTP request and response payloads size in bytes
  --requestChunkSize <bytes>    Set the HTTP request payload data chunks size in bytes
  --responseChunkSize <bytes>   Set the HTTP response payload data chunks size in bytes
  --requestTimeout <ms>         Set the HTTP request timeout delay in milliseconds
  --trustProxy                  Trust proxy headers (X-Forwarded-For, etc.)

  -d, --debugOutput             Output errors for HTTP status 500
  -l, --logRequests             Log HTTP requests to STDOUT
    `);
  process.exit();
}

if (values.version) {
  console.log(`v${version}`);
  process.exit();
}

let fileConfig;
try {
  if (values.config !== undefined) {
    fileConfig = loadConfigFile(resolve(values.config), true);
  } else {
    fileConfig = loadConfigFile(
      resolve(process.cwd(), DEFAULT_CONFIG_FILE),
      false,
    );
  }
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

const { port: filePort, teapot: fileTeapot, ...fileHandlerConfig } = fileConfig;

const cliHandlerConfig = Object.fromEntries(
  Object.entries(values).filter(
    ([key, value]) =>
      value !== undefined &&
      key !== "help" &&
      key !== "version" &&
      key !== "config" &&
      key !== "port" &&
      key !== "teapot",
  ),
);

const port = parseInt(values.port ?? filePort, 10) || 3001;
const teapot = values.teapot ?? fileTeapot ?? false;

const config = {
  ...defaultConfig,
  ...fileHandlerConfig,
  ...cliHandlerConfig,
  env: (env, req) => {
    return {
      REMOTE_AGENT: req.headers["user-agent"],
      UNIQUE_ID: randomUUID(),
    };
  },
};
const cgiHandler = createHandler(config);

const app = createServer(async (req, res) => {
  const requestHandled = await cgiHandler(req, res);

  if (!requestHandled) {
    // here, handle any routing outside of urlPath

    if (teapot && req.url === "/teapot") {
      res.writeHead(418, { "Content-Type": "text/html" });
      res.end(`
        <html>
          <body style="font-family: sans-serif; text-align: center; margin-top: 5rem;">
            <h1>&#x1FAD6; 418: I'm a Teapot</h1>
            <p>This server refuses to brew coffee.</p>
          </body>
        </html>
      `);
      return;
    }

    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(`outside of url path ${config.urlPath}`);
  }
});
app.listen(port, () => {
  console.log(`listening on port ${port}`);
});
