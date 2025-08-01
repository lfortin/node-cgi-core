// Copyright (c) 2024-2025 lfortin
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
import serveStatic from "serve-static";
import finalhandler from "finalhandler";
import { createHandler } from "cgi-core";

const port = process.env.PORT || 3001;

const staticHandler = serveStatic("/usr/src/app/htdocs", {
  index: ["index.html", "index.htm"],
});

const cgiHandler = createHandler({
  filePath: "/usr/src/app/cgi-bin",
  debugOutput: true,
  env: (env, req) => {
    return {
      REMOTE_AGENT: req.headers["user-agent"],
      UNIQUE_ID: randomUUID(),
    };
  },
});

const app = createServer(async (req, res) => {
  const requestHandled = await cgiHandler(req, res);

  if (!requestHandled) {
    staticHandler(req, res, finalhandler(req, res));
  }
});
app.listen(port, () => {
  console.log(`listening on port ${port}`);
});
