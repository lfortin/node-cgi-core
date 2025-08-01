<p align="center">
<img src="https://github.com/lfortin/node-cgi-core/blob/master/images/logo.jpg?raw=true" height="120">
</p>

<h1 align="center">
cgi-core
</h1>
<p align="center">
A lightweight, zero-dependency middleware for hosting <a href="https://github.com/lfortin/node-cgi-core/blob/master/docs/sample-scripts.md">CGI scripts</a> with HTTP/1.1 support. Aims to support The Common Gateway Interface (CGI) Version 1.1 as defined in <a href="https://www.ietf.org/rfc/rfc3875.txt">RFC 3875</a>.<br>
<br>
Released under the <a href="https://opensource.org/license/mit">MIT License</a>.
</p>

[![Node.js (install and test)](https://github.com/lfortin/node-cgi-core/actions/workflows/node.js.yml/badge.svg?event=push)](https://github.com/lfortin/node-cgi-core/actions/workflows/node.js.yml)

## Features

- ⚡ Zero dependency — no external packages required
- 🌐 Full HTTP/1.1 support
- 🧩 Simple middleware for handling CGI routes
- 🛠️ Run from the CLI or embed directly in Node.js apps
- ⚙️ Supports CGI scripts in any language (Perl, Python, Bash, Node.js, etc.)
- 🔧 Fully configurable: timeouts, chunk sizes, environment variables, and more
- 📜 Custom error/status pages per HTTP status code
- 🛡️ Built-in path sanitization and error handling for safer execution

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

Usage example using [Express](https://github.com/lfortin/node-cgi-core/blob/master/docs/express.md).

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

Size of the HTTP request payload data chunks in bytes, used for internal buffering when reading request data. Default: `32 * 1024` (32 KB)

### responseChunkSize

Size of the HTTP response payload data chunks in bytes, applicable when `Transfer-Encoding: chunked` is used. If `Content-Length` is set, chunking is disabled, and the response is sent as a single block. Default: `32 * 1024` (32 KB)

### requestTimeout

Timeout delay for the HTTP request in milliseconds. If the request takes longer than the specified time, the server will respond with a `504 Gateway Timeout` error. Default: `30000` (30 seconds)

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
  -v, --version                 Display cgi-core version string
  --urlPath <urlPath>           Set base url path for routing
  --filePath <filePath>         Set file path where the CGI scripts are located
  --indexExtension <extension>  Set file extension to lookup for index files
  --maxBuffer <bytes>           Set the allowed HTTP request and response payloads size in bytes
  --requestChunkSize <bytes>    Set the HTTP request payload data chunks size in bytes
  --responseChunkSize <bytes>   Set the HTTP response payload data chunks size in bytes
  --requestTimeout <ms>         Set the HTTP request timeout delay in milliseconds
  -d, --debugOutput             Output errors for HTTP status 500
  -l, --logRequests             Log HTTP requests to STDOUT
  -p, --port <port>             Set the port to listen on
```

# Supported CGI environment variables

In addition to the standard HTTP-related variables, the following CGI environment variables are supported:

```
AUTH_TYPE
CONTENT_LENGTH
CONTENT_TYPE
GATEWAY_INTERFACE
HTTPS
PATH
PATH_INFO
QUERY_STRING
REMOTE_ADDR
REQUEST_METHOD
REQUEST_URI
SCRIPT_FILENAME
SCRIPT_NAME
SERVER_NAME
SERVER_PORT
SERVER_PROTOCOL
SERVER_SOFTWARE
```

# 🔁 Using a Reverse Proxy (e.g., Nginx)

While `cgi-core` is capable of serving CGI scripts directly over HTTP/1.1, it's often recommended to use a **reverse proxy** like **Nginx** in front of your Node.js server for:

- Improved performance via caching
- Better static asset delivery
- TLS termination and header management
- Simplified load balancing or security

### Example: `nginx.conf`

Below is an example Nginx configuration that:

- Proxies `/cgi-bin` requests to the Node.js/`cgi-core` server running on `localhost:3001`
- Enables **caching** for `GET` responses
- Serves static assets directly from the filesystem with browser caching

```nginx
worker_processes 1;

events {
  worker_connections 1024;
}

http {
  proxy_cache_path /tmp/nginx_cache levels=1:2 keys_zone=STATIC:10m max_size=100m inactive=60m use_temp_path=off;

  server {
    listen      3002;
    server_name 127.0.0.1;

    # Proxy CGI requests and enable caching
    location /cgi-bin {
      proxy_pass http://127.0.0.1:3001;
      proxy_http_version 1.1;
      proxy_set_header Connection "";
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;

      proxy_cache STATIC;
      proxy_cache_methods GET;
      proxy_cache_key "$scheme$request_method$host$request_uri";
      proxy_cache_valid 200 302 10m;
      proxy_cache_valid 404 1m;
      add_header X-Proxy-Cache $upstream_cache_status;
    }

    # Serve static files and enable browser caching
    location / {
      root /path/to/your/htdocs;
      index index.htm index.html;

      location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 30d;
        add_header Cache-Control "public";
        access_log off;
      }
    }
  }
}
```

### ⚠️ Note on Proxy Headers and CGI Environment Variables

If you run `cgi-core` behind a reverse proxy (such as **Nginx**), certain CGI environment variables may be influenced by proxy headers, including:

- `REMOTE_ADDR` — may reflect the proxy's IP unless `X-Forwarded-For` is set
- `HTTPS` — determined by `X-Forwarded-Proto` if TLS is terminated at the proxy
- `SERVER_NAME` — usually derived from the `Host` header sent by the proxy

By default, `cgi-core` **does not validate proxy headers**. If untrusted clients can set headers like `X-Forwarded-For`, this could result in spoofed values being passed to your CGI scripts.

🔐 **Important**: Make sure your reverse proxy is properly configured and only accepts requests from trusted sources. If needed, filter or overwrite proxy headers before they reach your Node.js server.

_You may choose to implement your own logic for handling trusted proxies or wait for future support of a `trustProxy` option._

# License

`cgi-core` is released under the [MIT License](https://github.com/lfortin/node-cgi-core/blob/master/LICENSE).

**100% Free:** `cgi-core` can be used freely in both proprietary and open-source projects.

**Attribution is required:** You must retain the author's name and the license information in any distributed code. These items do not need to be user-facing and can remain within the codebase.
