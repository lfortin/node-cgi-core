# Sample CGI/Perl Scripts

Here are some sample Perl scripts to try with `cgi-core`.

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
```

Feel free to modify and test these scripts in your CGI environment!
