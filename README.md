# cgi-core

[![Node.js (install and test)](https://github.com/lfortin/node-cgi-core/actions/workflows/node.js.yml/badge.svg?event=push)](https://github.com/lfortin/node-cgi-core/actions/workflows/node.js.yml)

A minimalistic, zero-dependency wrapper for hosting CGI scripts with HTTP/1.1 support.

> :construction: This is a work in progress. :construction:
>
> TODO roadmap:
>
> -add more environment variables
>
> -support Windows systems


## Installation

To install the latest stable version of `cgi-core`:

    npm install cgi-core


# Synopsis

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
    "/usr/local/bin/node": ["js", "node"]
  },
  debugOutput: false
});

const app = createServer(async (req, res) => {
  if(!await handler(req, res)) {
    // here, handle any routing outside of urlPath === '/cgi-bin'
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('outside of urlPath');
  }
});
app.listen(3000);

```


# Config options

###  urlPath

Base url for routing. Default: '/cgi-bin'

###  filePath

File path where the CGI scripts are located. It is strongly advised to set a value for `filePath` (example: './cgi-bin'). Default: `process.cwd()`

###  extensions

Object containing file extension values for given interpreter paths. If no interpreter path is found for a file extension, the CGI script will be called as a standalone executable.
Default:
```javascript
{
  "/usr/bin/perl": ["pl", "cgi"],
  "/usr/bin/python": ["py"],
  "/usr/local/bin/node": ["js", "node"]
}
```

###  indexExtension

File extension to lookup for an index CGI script in any given directory. Default: 'js'

###  debugOutput

Set true to enable debug output. Default: `false`

###  logRequests

Set true to print HTTP request logs to STDOUT. Default: `false`

###  maxBuffer

Size of the allowed HTTP request and response payloads in bytes. Default: `2 * 1024 * 1024` (2 MB)

###  requestChunkSize

Size of the HTTP request payload data chunks in bytes. Default: `16 * 1024` (16 KB)

###  responseChunkSize

Size of the HTTP response payload data chunks in bytes. Default: `16 * 1024` (16 KB)

###  statusPages

Object containing custom HTTP response payloads per status code. Default: `{}`
Example:
```javascript
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


# Supported CGI environment variables

In addition to the standard HTTP-related variables, the following CGI environment variables are supported:

```
PATH
SCRIPT_FILENAME
SCRIPT_NAME
SERVER_PROTOCOL
SERVER_SOFTWARE
QUERY_STRING
REQUEST_METHOD
REQUEST_URI
```