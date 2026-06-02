#!/usr/bin/perl
use strict;
use warnings;

while (<>) {
    if (/domain:\s*'logic_reasoning'/ && /'find_numbers'/) {
        s/'find_numbers',\s*//g;
        s/,\s*'find_numbers'//g;
        s/'find_numbers'//g;
        # Clean up: remove leading comma after bracket, fix double commas
        s/\[,\s*/[/g;
        s/,\s*,/,/g;
    }
    print;
}
