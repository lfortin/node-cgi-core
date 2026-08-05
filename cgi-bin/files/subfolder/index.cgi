#!/usr/bin/perl

# Copyright (c) 2024-2026 lfortin
#
# Permission is hereby granted, free of charge, to any person obtaining
# a copy of this software and associated documentation files (the
# "Software"), to deal in the Software without restriction, including
# without limitation the rights to use, copy, modify, merge, publish,
# distribute, sublicense, and/or sell copies of the Software, and to
# permit persons to whom the Software is furnished to do so, subject to
# the following conditions:
#
# The above copyright notice and this permission notice shall be
# included in all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
# EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
# MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
# NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
# LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
# OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
# WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

use strict;
use warnings;
use CGI qw(escapeHTML);
use File::Spec;
use File::Basename qw(dirname);
use URI::Escape qw(uri_escape);

# 1. Graceful Error Handling Function
sub show_error {
    my ($message, $status) = @_;
    $status ||= '500 Internal Server Error';
    
    print "Status: $status\r\n";
    print "Content-Type: text/html; charset=UTF-8\r\n\r\n";
    print <<"HTML";
<!DOCTYPE html>
<html>
<head><title>Error</title></head>
<body>
  <h1>Error</h1>
  <p>@{[ escapeHTML($message) ]}</p>
</body>
</html>
HTML
    exit;
}

# 2. Get and validate script path
my $script_path = $ENV{'SCRIPT_FILENAME'}
    or show_error("SCRIPT_FILENAME environment variable is not set.", '500 Server Misconfiguration');

my $script_dir = dirname($script_path);

# 3. Cleanly resolve script URL prefix without duplicate slashes
my $web_base_url    = "/cgi-bin";
my $raw_script_name = $ENV{'SCRIPT_NAME'} // '';
(my $script_url_path = $raw_script_name) =~ s/[^\/]+$//; # Remove script file name

# Normalize base path concatenation
my $base_href = "$web_base_url/$script_url_path";
$base_href =~ s{/{2,}}{/}g; # Replace multiple consecutive slashes with a single slash

# 4. Open and read directory safely
opendir(my $dh, $script_dir) 
    or show_error("Cannot read directory: $!", '500 Internal Server Error');

# Case-insensitive natural sort (directories first, then files)
my @raw_items = grep { $_ ne '.' && $_ ne '..' } readdir($dh);
closedir($dh);

my @items = sort {
    my $path_a = File::Spec->catfile($script_dir, $a);
    my $path_b = File::Spec->catfile($script_dir, $b);
    
    # Sort directories before files, then alphabetically
    (-d $path_b <=> -d $path_a) || (lc($a) cmp lc($b))
} @raw_items;

# 5. Output HTTP Header & Page Content
print "Content-Type: text/html; charset=UTF-8\r\n\r\n";
print <<"HTML";
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Directory Listing</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; }
    ul { list-style-type: none; padding-left: 0; }
    li { margin: 0.3rem 0; }
    .dir { font-weight: bold; color: #1a0dab; }
    .tag { font-size: 0.8em; color: #666; font-weight: normal; }
  </style>
</head>
<body>
  <h1>Files and Folders in @{[ escapeHTML($script_dir) ]}</h1>
HTML

if (@items) {
    print "  <ul>\n";
    for my $item (@items) {
        my $full_path = File::Spec->catfile($script_dir, $item);
        my $is_dir    = -d $full_path;
        
        my $encoded   = uri_escape($item);
        my $label     = escapeHTML($item);
        
        # Build clean absolute web link
        my $href = $base_href . $encoded . ($is_dir ? '/' : '');

        my $dir_class = $is_dir ? ' class="dir"' : '';
        my $dir_tag   = $is_dir ? ' <span class="tag">[DIR]</span>' : '';

        print qq{    <li><a href="$href"$dir_class target="_blank">$label</a>$dir_tag</li>\n};
    }
    print "  </ul>\n";
} else {
    print "  <p>No files or directories found.</p>\n";
}

print <<"HTML";
</body>
</html>
HTML

1;
