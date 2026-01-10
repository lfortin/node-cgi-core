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
use CGI qw(:standard);
use File::Spec;
use File::Basename;
use URI::Escape;

# Use SCRIPT_FILENAME environment variable to get script directory
my $script_path = $ENV{'SCRIPT_FILENAME'}
    or die "SCRIPT_FILENAME environment variable is not set.";
my $script_dir = dirname($script_path);

my $web_base_url = "/cgi-bin";
# Get the current script's URL path
my $script_url_path = $ENV{'SCRIPT_NAME'};
$script_url_path =~ s/[^\/]+$//;  # Remove script filename, keep path prefix
# prepend "/cgi-bin/" to the path
$script_url_path = $web_base_url . $script_url_path;

print header(-type => 'text/html; charset=UTF-8');
print start_html("Directory Listing");
print h1("Files and Folders in $script_dir");

opendir(my $dh, $script_dir) or die "Cannot open directory $script_dir: $!";
my @items = grep { $_ ne '.' && $_ ne '..' } readdir($dh);
closedir($dh);

if (@items) {
    print ul(
        map {
            my $full_path = File::Spec->catfile($script_dir, $_);
            my $encoded   = uri_escape($_);
            my $label     = $_;
            my $is_dir    = -d $full_path;

            # Create the correct URL pointing to the file or folder
            my $href = $script_url_path . $encoded;
            $href .= '/' if $is_dir;

            li(
                a({ href => $href, target => '_blank' }, $label)
                . ($is_dir ? " [DIR]" : "")
            );
        } sort @items
    );
} else {
    print p("No files or directories found.");
}

print end_html;

1;
