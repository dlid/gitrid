

const path = require('path');
const { spawn } = require('child_process');
const readline = require("readline");
const { argv } = require('process');
const fs = require('fs');

let workingFolder = path.resolve('./');
let automaticallySayYes = false;


if (argv.length === 3 && (argv[2] === '--version' || argv[2] === '-v')) {
    const packageContent = fs.readFileSync( path.join(__dirname, '../', 'package.json'));
    const packageJson = JSON.parse(packageContent);
    loginfo(`Gitrid Version ${packageJson.version}`);
    return;
}

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

        const {active, branches } = await getLocalBranches();
        const remoteBranches = await getRemoteBranches();

        loginfo(`Found {color:cyan}${branches.length}{color} local branches and {color:cyan}${remoteBranches.length}{color} remote branches`);

        let branchesToDelete = [];

        for (let i = 0; i < branches.length; i++) {
            const remoteBranchExists = remoteBranches.includes(branches[i]);

            if (!remoteBranchExists) {

                if (active === branches[i]) {
                    loginfo(`[{color:yellow} (OK) {color}] Branch '{color:yellow}${branches[i]}{color}' only exists locally but is active and can not be deleted`);
                    continue;
                }

                const hasPendingCommits = await branchHasPendingCommits(branches[i]);

                if (hasPendingCommits) {
                    loginfo(`[{color:yellow} (OK) {color}] Branch '{color:yellow}${branches[i]}{color}' only exists locally but has pending commits and can not be deleted`);
                    continue;
                }

                loginfo(`[{color:yellow}ZOMBIE{color}] Branch '{color:yellow}${branches[i]}{color}' only exists locally`);

                branchesToDelete.push(branches[i] );
            } else {
                loginfo(`[{color:green}  OK  {color}] Branch '${branches[i]}' exists in remote repository`)
            }
        }

        if (branchesToDelete.length > 0) {
            loginfo(null);
            loginfo(null);
            const deleteThem = await confirm(`{color:yellow}REMOVE ${branchesToDelete.length} ZOMBIE BRANCH${branchesToDelete.length > 1 ? 'ES' : ''}?{color} (y/n): `);
            
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


let gitLogNotRemotes = null;

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  }

async function branchHasPendingCommits(name) {


    if (!gitLogNotRemotes) {
        var { code, data } = await executeCommand('git', ['log', '--branches', '--not', '--remotes', '--source']);
        if (code === 0) {
            data = data.trim();
            gitLogNotRemotes = data;
        } else {
            loginfo(`{color:red}Failed{color} Could not get repository URL for folder '{color:cyan}${workingFolder}{color}' ({color:yellow}git remote get-url origin{color})`);
            loginfo(`{color:red}${data}`);
            process.exit(1);
        }
    }

    var re = new RegExp(`commit [a-z0-9]+\t+${escapeRegExp(name)}`, 'ig');
    re.global = true;
    re.ignoreCase = true;
    re.multiline = true;

    const mama = re.exec(gitLogNotRemotes);
    if (mama) {
        return true;
    }

    return false;

    // Check git log --branches --not --remotes 
    // See if we have any rows matching commit 175c4235190472e4115cb3b841d5dc6b96ef9384 (HEAD -> pbi/33452-wizard-summary-step)
    // where pbi/33452-wizard-summary-step is the branch name.... Then it's probably a brand new branch with pending commits

}

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
    const currentRegex = /^[\s\*]+/;
    let active = '';
    if (code === 0) {
        data = data.trim();
        let branches = data.split('\n').map(branchLine => {
            if (branchLine.indexOf('*') === 0) {
                active = branchLine.replace(currentRegex, '');
            }
            return branchLine.replace(currentRegex, '');
        });

        return { active, branches };
    }
    loginfo(`{color:red}Failed{color} Could not get local branches for folder '{color:cyan}${workingFolder}{color}' ({color:yellow}git branch{color})`);
    loginfo(`{color:red}${data}`);
    process.exit(1);
}

async function getRemoteBranches() {
    var { code, data } = await executeCommand('git', ['branch', '-r']);
    const currentRegex = /^\s*origin\/+/;
    if (code === 0) {
        data = data.trim();
        let branches = data.split('\n').map(branchLine => {
            return branchLine.replace(currentRegex, '');
        });

        return branches;
    }
    loginfo(`{color:red}Failed{color} Could not get remote branches for folder '{color:cyan}${workingFolder}{color}' ({color:yellow}git branch -r{color})`);
    loginfo(`{color:red}${data}`);
    process.exit(1);
}

// Maybe we will not need this at all. Leaving it for now though...
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
