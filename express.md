# Using cgi-core with Express

```javascript
import express from "express";
import { createHandler } from "cgi-core";

// create a http server that handles CGI requests under the url path /cgi-bin

const config = {
  urlPath: "/cgi-bin",
  filePath: "./cgi-bin",
  extensions: {
    "/usr/bin/perl": ["pl", "cgi"],
    "/usr/bin/python": ["py"],
    "/usr/local/bin/node": ["js", "node"],
  },
  debugOutput: false,
};

const app = express();

app.all("/cgi-bin*", createHandler(config));

app.use((req, res) => {
  res.type("html");
  res.status(200);
  res.send("<html><body>outside of url path /cgi-bin</body></html>");
});

app.listen(3000);
```
