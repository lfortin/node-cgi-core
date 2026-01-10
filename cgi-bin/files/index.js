// Copyright (c) 2024-2026 lfortin
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

process.stdout.write('Content-Type: text/html\n\n');

process.stdout.write('<!doctype html>\n');
process.stdout.write('<html>\n');
process.stdout.write('<head>\n');
process.stdout.write(`<link rel="stylesheet" href="/cgi-bin/css/styles.js" />\n`);
process.stdout.write('</head>\n');
process.stdout.write('<body>\n');

for(const i in process.env) {
  process.stdout.write(`<div>${i}: ${process.env[i]}</div>\n`);
}

process.stdout.write('<br /><br />\n');
process.stdin.pipe(process.stdout);

process.stdout.write('</body>\n');
process.stdout.write('</html>\n');
