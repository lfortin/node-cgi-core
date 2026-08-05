# Sample CGI/Perl Scripts

Here are some sample Perl scripts to try with `cgi-core`.

> ⚠️ **Disclaimer**: These script examples are intentionally minimal to demonstrate CGI concepts. They omit many security, input validation, and error-handling practices required for production use.

## Script 1: Display CGI Environment Variables
This script generates an HTML page displaying all CGI environment variables available.

```perl
#!/usr/bin/perl

# print the Content-Type HTTP header
print "Content-Type: text/html\n\n";

# print an HTML page displaying all CGI environment variables available
print "<!doctype html>\n";
print "<html>\n";
print "<body>\n";

foreach my $key (keys %ENV) {
  print "<div>$key: $ENV{$key}</div>\n";
}

print "</body>\n";
print "</html>\n";

1;
```

## Script 2: Using `CGI.pm` Module

This script also displays all CGI environment variables but utilizes the `CGI.pm` module for handling HTTP headers.

```perl
#!/usr/bin/perl

use strict;
use warnings;
use CGI;

my $cgi = CGI->new;

print $cgi->header(
    -status => "200 OK",
    -type   => 'text/html'
);

# print an HTML page with all CGI environment variables available
print "<!doctype html>\n";
print "<html>\n";
print "<body>\n";

foreach my $key (keys %ENV) {
  print "<div>$key: $ENV{$key}</div>\n";
}

print "</body>\n";
print "</html>\n";

1;
```

## Script 3: Simple Form Submission

This script demonstrates how to create a simple HTML form and process its submission.

```perl
#!/usr/bin/perl

use strict;
use warnings;
use CGI;

my $cgi = CGI->new;

print $cgi->header;

if ($cgi->param('name')) {
    my $name = $cgi->param('name');
    print "<p>Hello, $name!</p>\n";
} else {
    print $cgi->start_html("Simple Form");
    print $cgi->start_form;
    print $cgi->textfield(-name => 'name', -placeholder => 'Enter your name');
    print $cgi->submit(-value => 'Submit');
    print $cgi->end_form;
    print $cgi->end_html;
}

1;
```

## Script 4: File Upload

This script demonstrates how to handle file uploads.

```perl
#!/usr/bin/perl

use strict;
use warnings;
use CGI;

my $cgi = CGI->new;

print $cgi->header;

if ($cgi->param('uploaded_file')) {
    my $filehandle = $cgi->upload('uploaded_file');
    my $filename = $cgi->param('uploaded_file');

    open(my $out, '>', $filename) or die "Cannot open file: $!";
    binmode $out;
    while (my $bytesread = <$filehandle>) {
        print $out $bytesread;
    }
    close($out);

    print "<p>File '$filename' uploaded successfully!</p>\n";
} else {
    print $cgi->start_html("File Upload");
    print $cgi->start_form(-enctype => 'multipart/form-data');
    print $cgi->filefield(-name => 'uploaded_file');
    print $cgi->submit(-value => 'Upload');
    print $cgi->end_form;
    print $cgi->end_html;
}

1;
```

## Script 5: Directory Listing

This script demonstrates how to list the contents of the current directory.

```perl
#!/usr/bin/perl

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

```

Feel free to modify and test these scripts in your CGI environment!
