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

process.stdout.write('Content-Type: text/html\n\n');

process.stdout.write('<!doctype html>\n');
process.stdout.write('<html>\n');
process.stdout.write('<body>\n');

process.stdout.write(`
action="/cgi-bin/env.js" method="POST" enctype="multipart/form-data"<br /><br />
<form action="/cgi-bin/env.js" method="POST" enctype="multipart/form-data">
input1 <input name="input1" size="30" maxlength="100" /><br /><br />
input2 <input name="input2" size="30" maxlength="100" /><br /><br />
file1 <input name="file1" type="file" /><br /><br />
<input type="submit" value="send request" />
</form>
`);

process.stdout.write('</body>\n');
process.stdout.write('</html>\n');
