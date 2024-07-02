import assert from 'node:assert';
import {
  getUrlFilePath,
  sanitizePath,
  getExecPath,
  createEnvObject,
  parseResponse
} from '../lib/util.js';

describe('cgi-core', () => {
  describe('getUrlFilePath', () => {
    it('should return filePath', async () => {
      const filePath = getUrlFilePath('http://test.com/cgi-bin/files/script.cgi', '/cgi-bin');
      assert.strictEqual(filePath, 'files/script.cgi');
    });
    it('should return null if url not within urlPath range', async () => {
      const filePath = getUrlFilePath('http://test.com/images/picture.jpg', '/cgi-bin');
      assert.strictEqual(filePath, null);
    });
  });
  describe('sanitizePath', () => {
    it('should remove \'..\' from the path', async () => {
      const path = sanitizePath('./../../cgi-bin/');
      assert.strictEqual(path, './//cgi-bin/');
    });
  });
  describe('getExecPath', () => {
    it('should return an execPath', async () => {
      const extensions = {
        "/usr/bin/perl": ["pl", "cgi"],
        "/usr/bin/python": ["py"],
        "/usr/local/bin/node": ["js", "node"]
      };
      const execPath = getExecPath('/cgi-bin/script.cgi', extensions);
      assert.strictEqual(execPath, '/usr/bin/perl');
    });
    it('should return null', async () => {
      const extensions = {
        "/usr/bin/perl": ["pl", "cgi"],
        "/usr/bin/python": ["py"],
        "/usr/local/bin/node": ["js", "node"]
      };
      const execPath = getExecPath('/cgi-bin/script.exe', extensions);
      assert.strictEqual(execPath, null);
    });
  });
  describe('createEnvObject', () => {
    it('should return an env object', async () => {
      const req = {
        url: '/cgi-bin/script.cgi?param1=test&param2=test',
        headers: {
          'Content-type': 'application/json',
          'Cookie': 'yummy_cookie=choco; tasty_cookie=strawberry',
          'Host': 'www.example.org'
        },
        method: 'GET'
      };
      const env = createEnvObject(req);
      assert.strictEqual(env.HTTP_CONTENT_TYPE, 'application/json');
      assert.strictEqual(env.HTTP_COOKIE, 'yummy_cookie=choco; tasty_cookie=strawberry');
      assert.strictEqual(env.HTTP_HOST, 'www.example.org');
      assert.strictEqual(env.QUERY_STRING, 'param1=test&param2=test');
      assert.strictEqual(env.REQUEST_METHOD, 'GET');
    });
  });
  describe('parseResponse', () => {
    it('should return a parsed response', async () => {
      const output = `Content-type: text/html\nSet-Cookie: yummy_cookie=choco

      <html>
      <body>
      hello world
      </body>
      </html>
      `;

      const { headers, bodyContent } = await parseResponse(output);
      assert.strictEqual(headers['Content-type'], 'text/html');
      assert.strictEqual(headers['Set-Cookie'], 'yummy_cookie=choco');
      assert.ok(bodyContent.match(/hello world/));
    });
  });
});

