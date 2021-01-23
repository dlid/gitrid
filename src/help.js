
const path = require('path');
const fs = require('fs');

const packageContent = fs.readFileSync( path.join(__dirname, '../', 'package.json'));
const packageJson = JSON.parse(packageContent);

module.exports = `
Gitrid ${packageJson.version}
"Git rid" of those lingering local branches.

Usage: gitrid [folder] [--yes|-y] (--verbose | --silent) [--plain-text]

Working Directory:
    folder is the git directory you want to check if you do not want to use current working folder


Options:
   yes          Automatically delete any found zombie branches without asking for confirmation
   verbose      Log in more detail what is done
   silent       Log nothing but errors (must be used toghether with [--yes])
   plain-text   Will strip away console colors from all output

`;