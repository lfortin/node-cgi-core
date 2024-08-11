import assert from 'node:assert';
import { PassThrough } from 'node:stream';
import {
  getUrlFilePath,
  sanitizePath,
  getExecPath,
  createEnvObject,
  parseResponse,
  getRequestLog
} from '../lib/util.js';

const config = {
  urlPath: "/cgi-bin",
  filePath: process.cwd(),
  extensions: {
    "/usr/bin/perl": ["pl", "cgi"],
    "/usr/bin/python": ["py"],
    "/usr/local/bin/node": ["js", "node"]
  },
  indexExtension: "js",
  debugOutput: false,
  maxBuffer: 2 * 1024**2
};

describe('cgi-core', () => {
  describe('getUrlFilePath', () => {
    it('should return filePath', async () => {
      const filePath = getUrlFilePath('http://test.com/cgi-bin/files/script.cgi', config);
      assert.strictEqual(filePath, 'files/script.cgi');
    });
    it('should return filePath using indexExtension', async () => {
      const filePath = getUrlFilePath('http://test.com/cgi-bin/files', config);
      assert.strictEqual(filePath, 'files/index.js');
    });
    it('should return null if url not within urlPath range', async () => {
      const filePath = getUrlFilePath('http://test.com/images/picture.jpg', config);
      assert.strictEqual(filePath, null);
    });
  });
  describe('sanitizePath', () => {
    it('should remove \'..\' from the path', async () => {
      const path = sanitizePath('./../../cgi-bin/');
      assert.strictEqual(path, './//cgi-bin/');
    });
    it('should remove CRLF from the path', async () => {
      const path = sanitizePath(`/cgi-bin/
script.cgi`);
      assert.strictEqual(path, '/cgi-bin/script.cgi');
    });
  });
  describe('getExecPath', () => {
    it('should return an execPath', async () => {
      const execPath = getExecPath('/cgi-bin/script.cgi', config.extensions);
      assert.strictEqual(execPath, '/usr/bin/perl');
    });
    it('should return null', async () => {
      const execPath = getExecPath('/cgi-bin/script.exe', config.extensions);
      assert.strictEqual(execPath, null);
    });
  });
  describe('createEnvObject', () => {
    it('should return an env object', async () => {
      const req = {
        url: '/cgi-bin/script.cgi?param1=test&param2=test',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'yummy_cookie=choco; tasty_cookie=strawberry',
          'Host': 'www.example.org'
        },
        method: 'GET',
        httpVersion: '1.1'
      };
      const extraInfo = {
        filePath: 'files/script.cgi',
        fullFilePath: '/home/username/cgi-bin/files/script.cgi'
      };
      const env = createEnvObject(req, extraInfo);
      assert.strictEqual(env.HTTP_CONTENT_TYPE, 'application/json');
      assert.strictEqual(env.HTTP_COOKIE, 'yummy_cookie=choco; tasty_cookie=strawberry');
      assert.strictEqual(env.HTTP_HOST, 'www.example.org');
      assert.strictEqual(env.QUERY_STRING, 'param1=test&param2=test');
      assert.strictEqual(env.REQUEST_METHOD, 'GET');
      assert.strictEqual(env.PATH, process.env.PATH);
      assert.strictEqual(env.REQUEST_URI, '/cgi-bin/script.cgi?param1=test&param2=test');
      assert.strictEqual(env.SERVER_PROTOCOL, 'HTTP/1.1');
      assert.strictEqual(env.SERVER_SOFTWARE, `Node.js/${process.version}`);
      assert.strictEqual(env.SCRIPT_FILENAME, '/home/username/cgi-bin/files/script.cgi');
      assert.strictEqual(env.SCRIPT_NAME, '/files/script.cgi');
    });
  });
  describe('parseResponse', () => {
    it('should return a parsed response', async () => {
      const output = new PassThrough();
      output.end(`Content-Type: text/html\nSet-Cookie: yummy_cookie=choco

      <html>
      <body>
      hello world
      </body>
      </html>
      `);

      const { headers, bodyContent } = await parseResponse(output);
      assert.strictEqual(headers['Content-Type'], 'text/html');
      assert.strictEqual(headers['Set-Cookie'], 'yummy_cookie=choco');
      assert.ok(bodyContent.match(/hello world/));
    });
  });
  describe('getRequestLog', () => {
    it('should return a formatted request log', async () => {
      const req = {
        url: '/cgi-bin/script.cgi?param1=test&param2=test',
        method: 'GET'
      };
      const log = getRequestLog(req, 200);
      assert.strictEqual(log, 'GET /cgi-bin/script.cgi?param1=test&param2=test : 200');
    });
  });
});
