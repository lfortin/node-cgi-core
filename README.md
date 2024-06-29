# cgi-core

A thin wrapper for supporting CGI script in Node.js.

> :construction: This is a work in progress. :construction:


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
    "/usr/local/bin/node": ["js", "node"]
  },
  debugOutput: false
});

const app = createServer(handler);
app.listen(3000);

```
