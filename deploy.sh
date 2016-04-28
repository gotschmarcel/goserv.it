#!/bin/bash

if [ ! command -v sass > /dev/null 2>&1 ]; then
    echo "Error: sass not found"
    exit 1
fi

echo -e "\033[0;32mDeploying updates to Github...\033[0m"

# Build themes.
sass --scss --style compressed --sourcemap=none --no-cache themes/light/scss/main.scss themes/light/static/css/theme.css
sass --scss --style compressed --sourcemap=none --no-cache themes/blue/scss/main.scss themes/blue/static/css/theme.css

# Build the project.
hugo

# Assure CNAME file
if [ ! -f public/CNAME ]; then
    echo "goserv.it" > public/CNAME
fi

# Add changes to git.
git add -A

# Commit changes.
msg="rebuilding site `date`"
if [ $# -eq 1 ]
  then msg="$1"
fi
git commit -m "$msg"

# Push source and build repos.
git push origin master
git subtree push --prefix=public git@github.com:gotschmarcel/goserv.it.git gh-pages
