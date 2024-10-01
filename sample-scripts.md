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

Feel free to modify and test these scripts in your CGI environment!
