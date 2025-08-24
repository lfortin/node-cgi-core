const assert = require("node:assert");
const { randomUUID } = require("node:crypto");
const {
  getUrlFilePath,
  sanitizePath,
  getExecPath,
  createEnvObject,
  parseResponse,
  HeaderError,
  splitOutput,
  getRequestLogger,
  isAbsolutePosixPath,
  isAbsoluteWindowsPath,
} = require("../lib/util");
const { version } = require("../package.json");

const config = {
  urlPath: "/cgi-bin",
  filePath: process.cwd(),
  extensions: {
    "/usr/bin/perl": ["pl", "cgi"],
    "/usr/bin/python": ["py"],
    "/usr/local/bin/node": ["js", "node"],
  },
  indexExtension: "js",
  debugOutput: false,
  maxBuffer: 2 * 1024 ** 2,
  requestChunkSize: 32 * 1024,
  responseChunkSize: 32 * 1024,
};

describe("cgi-core", () => {
  describe("getUrlFilePath", () => {
    it("should return filePath", async () => {
      const filePath = getUrlFilePath(
        "http://test.com/cgi-bin/files/subfolder/script.cgi/path/info?test=1",
        config
      );
      assert.strictEqual(filePath, "files/subfolder/script.cgi");
    });
    it("should return filePath using indexExtension", async () => {
      const filePath = getUrlFilePath(
        "http://test.com/cgi-bin/files/subfolder",
        config
      );
      assert.strictEqual(filePath, "files/subfolder/index.js");
    });
    it("should return null if url not within urlPath range", async () => {
      const filePath = getUrlFilePath(
        "http://test.com/images/picture.jpg",
        config
      );
      assert.strictEqual(filePath, null);
    });
  });
  describe("sanitizePath", () => {
    it("should remove '..' from the path", async () => {
      const path = sanitizePath("../../.../files/");
      assert.strictEqual(path, "./files/");
    });
    it("should remove CRLF from the path", async () => {
      const path = sanitizePath(`files/
script.cgi`);
      assert.strictEqual(path, "files/script.cgi");
    });
    it("should remove leading drive letter", async () => {
      let path = sanitizePath("C:\\files\\script.cgi");
      assert.strictEqual(path, "files\\script.cgi");
      path = sanitizePath("D:\\files\\script.cgi");
      assert.strictEqual(path, "files\\script.cgi");
      path = sanitizePath("c:/files/script.cgi");
      assert.strictEqual(path, "files/script.cgi");
    });
    it("should collapse multiple slashes into one", async () => {
      const path = sanitizePath("files///");
      assert.strictEqual(path, "files/");
    });
    it("should collapse multiple backslashes into one", async () => {
      const path = sanitizePath("files\\\\");
      assert.strictEqual(path, "files\\");
    });
    it("should remove leading slashes", async () => {
      const path = sanitizePath("/files/script.cgi");
      assert.strictEqual(path, "files/script.cgi");
    });
    it("should remove leading backslashes", async () => {
      const path = sanitizePath("\\files\\script.cgi");
      assert.strictEqual(path, "files\\script.cgi");
    });
  });
  describe("getExecPath", () => {
    it("should return an execPath", async () => {
      const execPath = getExecPath("/cgi-bin/script.cgi", config.extensions);
      assert.strictEqual(execPath, "/usr/bin/perl");
    });
    it("should return null", async () => {
      const execPath = getExecPath("/cgi-bin/script.exe", config.extensions);
      assert.strictEqual(execPath, null);
    });
  });
  describe("createEnvObject", () => {
    it("should return an env object", async () => {
      const req = {
        url: "/cgi-bin/script.cgi/extra/path?param1=test&param2=test",
        socket: {
          remoteAddress: "100.100.100.100",
          localAddress: "127.0.0.1",
          localPort: "3001",
        },
        headers: {
          "content-type": "application/json",
          "content-length": 1024,
          cookie: "yummy_cookie=choco; tasty_cookie=strawberry",
          authorization: "Bearer [token]",
          "x-forwarded-for": "200.200.200.200",
          "x-forwarded-proto": "https",
          host: "www.example.org:3002",
        },
        method: "GET",
        httpVersion: "1.1",
        uniqueId: randomUUID(),
      };
      const extraInfo = {
        filePath: "files/script.cgi",
        fullFilePath: "/home/username/cgi-bin/files/script.cgi",
        env: { ANOTHER_VAR: "another value" },
        trustProxy: false,
      };
      let env = createEnvObject(req, extraInfo);

      assert.strictEqual(env.HTTP_CONTENT_TYPE, "application/json");
      assert.strictEqual(env.HTTP_CONTENT_LENGTH, 1024);
      assert.strictEqual(env.CONTENT_TYPE, "application/json");
      assert.strictEqual(env.CONTENT_LENGTH, 1024);
      assert.strictEqual(
        env.HTTP_COOKIE,
        "yummy_cookie=choco; tasty_cookie=strawberry"
      );
      assert.strictEqual(env.QUERY_STRING, "param1=test&param2=test");
      assert.strictEqual(env.REQUEST_METHOD, "GET");
      assert.strictEqual(env.PATH, process.env.PATH);
      assert.strictEqual(env.PATH_INFO, "/extra/path");
      assert.strictEqual(
        env.REQUEST_URI,
        "/cgi-bin/script.cgi/extra/path?param1=test&param2=test"
      );
      assert.strictEqual(env.SERVER_PROTOCOL, "HTTP/1.1");
      assert.strictEqual(
        env.SERVER_SOFTWARE,
        `Node.js/${process.version} (cgi-core/v${version})`
      );
      assert.strictEqual(
        env.SCRIPT_FILENAME,
        "/home/username/cgi-bin/files/script.cgi"
      );
      assert.strictEqual(env.HTTP_HOST, "www.example.org:3002");
      assert.strictEqual(env.REMOTE_ADDR, "100.100.100.100");
      assert.strictEqual(env.SERVER_PORT, "3001");
      assert.strictEqual(env.SERVER_NAME, "127.0.0.1");
      assert.notStrictEqual(env.HTTPS, "on");
      assert.strictEqual(env.AUTH_TYPE, "Bearer");
      assert.strictEqual(env.SCRIPT_NAME, "/files/script.cgi");
      assert.strictEqual(env.ANOTHER_VAR, "another value");

      env = createEnvObject(
        req,
        Object.assign({}, extraInfo, {
          trustProxy: true,
          env: function (env, req) {
            return {
              UNIQUE_ID: req.uniqueId,
            };
          },
        })
      );

      assert.strictEqual(env.REMOTE_ADDR, "200.200.200.200");
      assert.strictEqual(env.SERVER_PORT, "3002");
      assert.strictEqual(env.SERVER_NAME, "www.example.org");
      assert.strictEqual(env.HTTPS, "on");
      assert.strictEqual(env.UNIQUE_ID, req.uniqueId);
    });
    it("should fall back gracefully without host or proxy headers", async () => {
      const req = {
        url: "/cgi-bin/test.cgi",
        method: "GET",
        httpVersion: "1.1",
        headers: {},
        socket: {
          localAddress: "127.0.0.1",
          localPort: "8080",
          remoteAddress: "192.168.1.10",
        },
      };
      const extraInfo = {
        filePath: "test.cgi",
        fullFilePath: "/var/www/cgi-bin/test.cgi",
        trustProxy: true,
      };

      const env = createEnvObject(req, extraInfo);
      assert.strictEqual(env.SERVER_NAME, "127.0.0.1");
      assert.strictEqual(env.SERVER_PORT, "8080");
      assert.strictEqual(env.REMOTE_ADDR, "192.168.1.10");
    });
  });
  describe("parseResponse", () => {
    it("should return a parsed response", async () => {
      const output =
        Buffer.from(`Content-Type: text/html\nSet-Cookie: yummy_cookie=choco

      <html>
      <body>
      hello world
      </body>
      </html>
      `);

      const { headers, bodyContent, status } = await parseResponse(output);
      assert.strictEqual(headers["Content-Type"], "text/html");
      assert.strictEqual(headers["Set-Cookie"], "yummy_cookie=choco");
      assert.ok(bodyContent.toString().match(/hello world/));
      assert.strictEqual(status, undefined);
    });
    it("should return a parsed response with a status header", async () => {
      let output, headers, bodyContent, status;

      output = Buffer.from(`HTTP/1.1 403 Forbidden\nContent-Type: text/html

      <html>
      <body>
      forbidden
      </body>
      </html>
      `);

      ({ headers, bodyContent, status } = await parseResponse(output));
      assert.strictEqual(headers["Content-Type"], "text/html");
      assert.ok(bodyContent.toString().match(/forbidden/));
      assert.strictEqual(status, 403);

      output = Buffer.from(`Content-Type: text/html\nStatus: 403 Forbidden

      <html>
      <body>
      forbidden
      </body>
      </html>
      `);

      ({ headers, bodyContent, status } = await parseResponse(output));
      assert.strictEqual(headers["Content-Type"], "text/html");
      assert.ok(bodyContent.toString().match(/forbidden/));
      assert.strictEqual(status, 403);
    });
    it("should throw if end of headers line is missing", async () => {
      const output = Buffer.from("Content-Type: text/html\n");

      await assert.rejects(
        async () => {
          await parseResponse(output);
        },
        (err) => {
          assert.ok(err instanceof HeaderError);
          assert.match(err.message, /Missing end of headers line/);
          return true;
        }
      );
    });
    it("should throw if invalid header", async () => {
      const output = Buffer.from(`Content-Type: text/html\nInvalid_header

      <html>
      <body>
      hello world
      </body>
      </html>
      `);

      await assert.rejects(
        async () => {
          await parseResponse(output);
        },
        (err) => {
          assert.ok(err instanceof HeaderError);
          assert.match(err.message, /not supported header line/);
          assert.match(err.message, /Invalid_header/);
          return true;
        }
      );
    });
  });
  describe("splitOutput", () => {
    it("should return 2 buffers using CRLFCRLF", async () => {
      const output = Buffer.from(
        `Content-Type: text/plain\r\n\r\nhello world\r\n\r\nhello world`
      );

      const [first, second] = splitOutput(output);
      assert.strictEqual(first.toString(), "Content-Type: text/plain");
      assert.strictEqual(second.toString(), "hello world\r\n\r\nhello world");
    });
    it("should return 2 buffers using LFLF", async () => {
      const output = Buffer.from(
        `Content-Type: text/plain\n\nhello world\n\nhello world`
      );

      const [first, second] = splitOutput(output);
      assert.strictEqual(first.toString(), "Content-Type: text/plain");
      assert.strictEqual(second.toString(), "hello world\n\nhello world");
    });
    it("should return null", async () => {
      const output = Buffer.from(`Content-Type: text/html`);

      const result = splitOutput(output);
      assert.strictEqual(result, null);
    });
  });
  describe("getRequestLogger", () => {
    it("should return a formatted request log", async () => {
      const requestLogger = getRequestLogger();
      const req = {
        url: "/cgi-bin/script.cgi?param1=test&param2=test",
        method: "GET",
      };

      const log = requestLogger(req, 200);
      assert.strictEqual(
        log,
        "GET /cgi-bin/script.cgi?param1=test&param2=test : 200"
      );
    });
    it("should not log twice the same request", async () => {
      const requestLogger = getRequestLogger();
      const req = {
        url: "/cgi-bin/script.cgi?param1=test&param2=test",
        method: "GET",
      };
      requestLogger(req, 200);

      const log = requestLogger(req, 200);
      assert.strictEqual(log, undefined);
    });

    it("should clear internal Map if size > 1000", async () => {
      const requestLogger = getRequestLogger();
      const req = {
        url: "/cgi-bin/script.cgi?param1=test&param2=test",
        method: "GET",
      };
      requestLogger(req, 200);
      assert.strictEqual(requestLogger(req, 200), undefined);

      for (let i = 0; i <= 1000; i++) {
        requestLogger({}, 200);
      }

      const log = requestLogger(req, 200);
      assert.strictEqual(
        log,
        "GET /cgi-bin/script.cgi?param1=test&param2=test : 200"
      );
    });
  });
  describe("isAbsolutePosixPath", () => {
    it("should return true", async () => {
      assert.strictEqual(isAbsolutePosixPath("/usr/bin/perl"), true);
    });
    it("should return false", async () => {
      assert.strictEqual(isAbsolutePosixPath("perl"), false);
      assert.strictEqual(isAbsolutePosixPath("usr/bin/perl"), false);
    });
  });
  describe("isAbsoluteWindowsPath", () => {
    it("should return true", async () => {
      assert.strictEqual(
        isAbsoluteWindowsPath("C:\\Program Files\\perl"),
        true
      );
      assert.strictEqual(isAbsoluteWindowsPath("C:/Program Files/perl"), true);
      assert.strictEqual(isAbsoluteWindowsPath("\\\\volume\\perl"), true);
    });
    it("should return false", async () => {
      assert.strictEqual(isAbsoluteWindowsPath("perl"), false);
      assert.strictEqual(isAbsoluteWindowsPath("Program Files\\perl"), false);
    });
  });
});
