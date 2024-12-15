# cgi-core

[![Node.js (install and test)](https://github.com/lfortin/node-cgi-core/actions/workflows/node.js.yml/badge.svg?event=push)](https://github.com/lfortin/node-cgi-core/actions/workflows/node.js.yml)

A minimalistic, zero-dependency wrapper for hosting [CGI scripts](https://github.com/lfortin/node-cgi-core/blob/master/sample-scripts.md) with HTTP/1.1 support. Released under the [MIT License](https://opensource.org/license/mit).

## Getting Started

Install the latest stable version of `cgi-core`:

```bash
npm install cgi-core
```

Then, start a CGI server:

```bash
npx cgi-server --filePath ./cgi-bin
```

# Basic Usage

Here’s an example of how to set up a CGI server with `cgi-core`:

```javascript
import { createServer } from "node:http";
import { createHandler } from "cgi-core";

// create a http server that handles CGI requests under the url path /cgi-bin

const handler = createHandler({
  urlPath: "/cgi-bin",
  filePath: "./cgi-bin",
  extensions: {
    "/usr/bin/perl": ["pl", "cgi"],
    "/usr/bin/python": ["py"],
    "/usr/local/bin/node": ["js", "node"],
  },
  debugOutput: false,
});

const app = createServer(async (req, res) => {
  const requestHandled = await handler(req, res);

  if (!requestHandled) {
    // here, handle any routing outside of urlPath === '/cgi-bin'
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("outside of urlPath");
  }
});
app.listen(3000);
```

Usage example using [Express](https://github.com/lfortin/node-cgi-core/blob/master/express.md).

# Configuration options

### urlPath

Base url for routing. Default: '/cgi-bin'

### filePath

File path where the CGI scripts are located. It is strongly advised to set a value for `filePath` (example: './cgi-bin'). Default: `process.cwd()`

### extensions

Object containing file extension values for given interpreter paths. If no interpreter path is found for a file extension, the CGI script will be called as a standalone executable.
Default:

```javascript
// on POSIX systems
{
  "/usr/bin/perl": ["pl", "cgi"],
  "/usr/bin/python": ["py"],
  "/usr/local/bin/node": ["js", "node"]
}

// on Windows systems
{
  "perl": ["pl", "cgi"],
  "python": ["py"],
  "node": ["js", "node"]
}
```

### indexExtension

File extension to lookup for an index CGI script in any given directory. Default: 'js'

### debugOutput

Set true to enable debug output. Default: `false`

### logRequests

Set true to print HTTP request logs to STDOUT. Default: `false`

### maxBuffer

Size of the allowed HTTP request and response payloads in bytes. Default: `2 * 1024 * 1024` (2 MB)

### requestChunkSize

Size of the HTTP request payload data chunks in bytes. Default: `16 * 1024` (16 KB)

### responseChunkSize

Size of the HTTP response payload data chunks in bytes. Default: `16 * 1024` (16 KB)

### statusPages

Object containing custom HTTP response payloads per status code. Default: `{}`

```javascript
// Example:
{
  404: {
    content: `<html>
                <body>404: File not found</body>
              </html>`,
    contentType: "text/html"
  },
  500: {
    content: `<html>
                <body>500: Internal server error</body>
              </html>`,
    contentType: "text/html"
  }
}
```

### env

Object containing custom environment variables to pass to the CGI scripts. Default: `{}`

```javascript
// Example:
{
  SERVER_ADMIN: "admin@example.com",
  ANOTHER_VAR: "another value"
}
```

An updater function can also be passed to the `env` option to update the environment variables on each request. It gets the environment variables object and the incoming HTTP request as arguments.

```javascript
// Example:
(env, req) => {
  return {
    SERVER_ADMIN: "admin@example.com",
    ANOTHER_VAR: "another value",
    VALUE_FROM_REQUEST: req.headers["x-custom-header"],
  };
}
```

# Start a CGI Server from the Command Line

The command `cgi-server` can be used to run an HTTP server to serve CGI scripts.

```bash
npx cgi-server --port 3001 --urlPath /cgi-bin --filePath ./cgi-bin
```

### Available arguments

```
  -h, --help                    Display help
  --urlPath <urlPath>           Set base url path for routing
  --filePath <filePath>         Set file path where the CGI scripts are located
  --indexExtension <extension>  Set file extension to lookup for index files
  -d, --debugOutput             Output errors for HTTP status 500
  -l, --logRequests             Log HTTP requests to STDOUT
  -p, --port <port>             Set the port to listen on
```

# Supported CGI environment variables

In addition to the standard HTTP-related variables, the following CGI environment variables are supported:

```
CONTENT_LENGTH
CONTENT_TYPE
PATH
PATH_INFO
SCRIPT_FILENAME
SCRIPT_NAME
SERVER_PROTOCOL
SERVER_SOFTWARE
QUERY_STRING
REQUEST_METHOD
REQUEST_URI
```

# License

`cgi-core` is released under the [MIT License](https://github.com/lfortin/node-cgi-core/blob/master/LICENSE).

**100% Free:** `cgi-core` can be used freely in both proprietary and open-source projects.

**Attribution is required:** You must retain the author's name and the license information in any distributed code. These items do not need to be user-facing and can remain within the codebase.
