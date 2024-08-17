// Copyright (c) 2024 lfortin
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
action="/cgi-bin/env.js" method="GET"<br /><br />
<form action="/cgi-bin/env.js" method="GET">
input1 <input name="input1" size="30" maxlength="100" /><br /><br />
input2 <input name="input2" size="30" maxlength="100" /><br /><br />
radio1 <input id="radio1" name="radio1" type="radio" value="1" /><label for="radio1">1</label>
<input id="radio2" name="radio1" type="radio" value="2" /><label for="radio2">2</label>
<input id="radio3" name="radio1" type="radio" value="3" /><label for="radio3">3</label><br /><br />
<label for="checkbox1">checkbox1</label> <input id="checkbox1" name="checkbox1" type="checkbox" value="true" />
<label for="checkbox2">checkbox2</label> <input id="checkbox2" name="checkbox2" type="checkbox" value="true" />
<label for="checkbox3">checkbox3</label> <input id="checkbox3" name="checkbox3" type="checkbox" value="true" /><br /><br />
select1 <select name="select1">
<option value="" selected>-- select a value --</option>
<option value="value1">value 1</option>
<option value="value2">value 2</option>
<option value="value3">value 3</option>
</select><br /><br />
textarea1 <textarea name="textarea1" width="30" height="5" maxlength="100"></textarea><br /><br />
color1 <input name="color1" type="color" /><br /><br />
<input type="submit" value="send request" />
</form>
`);

process.stdout.write('</body>\n');

process.stdout.write('</html>\n');
