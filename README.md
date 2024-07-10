# cgi-core

A thin wrapper for supporting CGI scripts in Node.js.

> :construction: This is a work in progress. :construction:
>
> TODO roadmap:
> -add more environment variables
> -support Windows systems


## Installation

To install the latest stable version of `cgi-core`:

    npm install cgi-core


# Synopsis

```javascript
import { createServer } from 'node:http';
import { createHandler } from 'cgi-core';

// create a http server that handles CGI requests under the url path /cgi-bin

const handler = createHandler({
  urlPath: '/cgi-bin',
  filePath: process.cwd(),
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


# config options

###  urlPath

Base url for routing. Default: '/cgi-bin'

###  filePath

File path where the cgi files are located. Default: process.cwd()

###  extensions

Object containing file extension values, for given interpreter paths.
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

Set true to enable debug output. Default: false

###  maxBuffer

Size of the allowed http request and response payloads in bytes. Default: 2 * 1024 * 1024
