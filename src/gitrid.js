

const path = require('path');
const { spawn } = require('child_process');
const readline = require("readline");
const { argv } = require('process');
const fs = require('fs');

let workingFolder = path.resolve('./');
let automaticallySayYes = false;

async function confirm(question) {
    let confirmed = false;
    return new Promise((resolve, reject) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        rl.question(colorize(question), function(data) {
            rl.close();
            if (data.toLowerCase() === 'y') {
                confirmed = true;
                resolve(true);
            } else {
                resolve(false);
            }
        });
    });
}


function loginfo(text) {
    if (text === null) {
        console.log('');
        return;
    }
    const date = new Date();
    const prefix = '[gitrid] ' + date.getHours() + ':' + date.getMinutes().toString().padStart(2, '0') + ':' + date.getSeconds().toString().padStart(2, '0') + ' ';
    console.log(`${prefix}${colorize(text)}`);
}

function colorize(str) {

    const regexp = /\{color(?::(red|yellow|cyan|blue|magenta|green|white)|)\}/i;
    const colors = {
        red: '\x1b[31m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m',
        magenta: '\x1b[35m',
        cyan: '\x1b[36m',
        white: '\x1b[37m'
    };

    let ix;
    do {
        ix = regexp.exec(str);
        if (ix) {
            if (!ix[1]) {
                str = str.replace(ix[0], `\x1b[0m`);
            } else {
                str = str.replace(ix[0], colors[ix[1]]);
                const endIx = regexp.exec(str);

                if (!endIx) {
                    str = str + `\x1b[0m`;
                } else {
                    str = str.substr(0, endIx.index) + `\x1b[0m` + str.substr(endIx.index) ;
                }
            }
        }
    } while(ix);

    return str;
}



if (process.argv.length > 2) {
    let args = process.argv.slice(2);

    const ix = args.findIndex(v => v === '--yes' || v === '-y');
    if (ix !== -1) {
        automaticallySayYes = true;
        args.splice(ix, 1);
    }

    const pathFromArgument = path.resolve(process.argv[2]);
    if (fs.existsSync(pathFromArgument)) {
        workingFolder = pathFromArgument;
    } else {
        loginfo(`{color:red}Failed{color} Path not found '{color:cyan}${pathFromArgument}{color}'`);
        process.exit(1);
    }
}

(async () => {
    try {

        const gitUrl = await getRepositoryUrl();
        loginfo(`Found repository url '{color:cyan}${gitUrl}{color}' for folder '{color:cyan}${workingFolder}{color}'`);

        const branches = await getLocalBranches();
        loginfo(`Found {color:cyan}${branches.length}{color} local branches`);

        let branchesToDelete = [];

        for (let i = 0; i < branches.length; i++) {
            const remoteBranchExists = await testRemoteBranchExists(gitUrl, branches[i]);

            if (!remoteBranchExists) {
                loginfo(`[{color:yellow}ZOMBIE{color}] Branch '{color:yellow}${branches[i]}{color}' only exists locally`)
                branchesToDelete.push(branches[i] );
            } else {
                loginfo(`[{color:green}  OK  {color}] Branch '${branches[i]}' exists in remote repository`)
            }
        }

        if (branchesToDelete.length > 0) {
            loginfo(null);
            loginfo(null);
            const deleteThem = await confirm(`{color:yellow}REMOVE ${branchesToDelete.length} BRANCH${branchesToDelete.length > 1 ? 'ES' : ''}?{color} (y/n): `);
            
            if (deleteThem) {
                for (var i = 0; i < branchesToDelete.length; i++) {
                    loginfo(`Deleting branch {color:cyan}'${branchesToDelete[i]}{color}'`);
                    try {
                        await deleteLocalBranch(branchesToDelete[i]);
                    } catch (e) {
                        loginfo(`{color:red}ERROR{color} Could not delete branch {color:cyan}${branchesToDelete[i]}{color}'`);
                    }
                }
            } else {
                loginfo(`User cancelled`);
            }
        } else {
            loginfo(`No zombie branches found`);
        }

    } catch (e) {
        
        loginfo(`{color:red}Completed with error{color} The operation completed with errors`, e);
        loginfo(e);
        process.exit(1);
    }
})();



async function getRepositoryUrl() {
    var { code, data } = await executeCommand('git', ['remote', 'get-url', 'origin']);
    if (code === 0) {
        data = data.trim();
        return data;
    }
    loginfo(`{color:red}Failed{color} Could not get repository URL for folder '{color:cyan}${workingFolder}{color}' ({color:yellow}git remote get-url origin{color})`);
    loginfo(`{color:red}${data}`);
    process.exit(1);
}


async function deleteLocalBranch(branchName) {
    var { code, data } = await executeCommand('git', ['branch', '-d', branchName]);
    if (code === 0) {
        data = data.trim();
        return data;
    }
    console.log(`{color:red}Failed{color} Could not delete branch '{color:cyan}${branchName}{color}' ({color:yellow}git branch -d ${branchName}{color})`);
    loginfo(`{color:red}${data}`);
    process.exit(1);
}

async function getLocalBranches() {
    var { code, data } = await executeCommand('git', ['branch']);
    if (code === 0) {
        data = data.trim();
        return data.split('\n').map(branchLine => {
            return branchLine.replace(/^[\s*]+/, '');
        });
    }
    loginfo(`{color:red}Failed{color} Could not get local branches URL for folder '{color:cyan}${workingFolder}{color}' ({color:yellow}git branch{color})`);
    loginfo(`{color:red}${data}`);
    process.exit(1);
}

async function testRemoteBranchExists(repositoryUrl, branchName) {
    var { code, data } = await executeCommand('git', ['ls-remote', '--heads', repositoryUrl, branchName]);
    if (code === 0) {
        data = data.trim();
        if (data) {
            return true;
        } else {
            return false;
        }
    }
    loginfo(`{color:red}Failed{color} Could not test if branch exists remotely ({color:yellow}git ls-remote --heads ${repositoryUrl} ${branchName}{color})`);
    loginfo(`{color:red}${data}`);
    process.exit(1);
}


async function executeCommand(process, args) {

    let content = '';
    let processError;

    return new Promise((resolve, reject) => {

        if (process === 'git') {
            if (args.indexOf('-C') === -1) {
                args.splice(0, 0, '-C', workingFolder);
            }
        }

        const child = spawn(process, args);
        
        child.stdout.on('data', function (data) {
            content += data.toString();
        });

        child.stderr.on('data', function (data) {
            content += data.toString();
        });

        child.on('error', function(d) {
            processError += d.toString();
        })
        
        child.on('close', function (code) {
            if (processError) {
                return reject(processError);
            }
            const data = content;
            resolve({code, data});
        });

    });

}
