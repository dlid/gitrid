const { spawn } = require('child_process');
const log = require('./log');

class GitHelper {

    #workingDirectory;
    #workingDirectoryValidated = false;
    #repositoryUrl;
    #checkOfPendingCommitsCache;
    #checkOfPendingCommitsDone;

    /**
     *Creates an instance of GitHelper for the given directory path
     * @param {string} workingDirectory
     * @memberof GitHelper
     */
    constructor(workingDirectory) {
        this.#workingDirectory = workingDirectory;
    }


    /**
     * Get a list of local branches
     *
     * @memberof GitHelper
     * @returns {string[]} List of branches
     */
    async #getLocalBranches() {

        var { code, data } = await this.#executeGitCommand('branch');
        const currentRegex = /^[\s\*]+/;
        let active = '';
        if (code === 0) {
            data = data.trim();
            let localBranches = data.split('\n').map(branchLine => {
                if (branchLine.indexOf('*') === 0) {
                    active = branchLine.replace(currentRegex, '');
                }
                return branchLine.replace(currentRegex, '');
            });
    
            return { active, localBranches };
        }
        log.info(`{color:red}Failed{color} Could not get local branches for folder '{color:cyan}${config.workingFolder}{color}' ({color:yellow}git branch{color})`);
        log.info(`{color:red}${data}`);
        process.exit(1);
    }

    /**
     * Get a list of remote branches
     *
     * @memberof GitHelper
     * @returns {string[]} List of branches
     */
    async #getRemoteBranches() {

        var { code, data } = await this.#executeGitCommand('ls-remote', '--heads', this.#repositoryUrl);
        const currentRegex = /.*?\trefs\/heads\/(.+)$/;
        if (code === 0) {
            data = data.trim();
            let branches = data.split('\n').map(branchLine => {
                return branchLine.replace(currentRegex, '$1');
            });
    
            return branches;
        }
        log.info(`{color:red}Failed{color} Could not get remote branches for folder '{color:cyan}${config.workingFolder}{color}' ({color:yellow}git branch -r{color})`);
        log.info(`{color:red}${data}`);
        process.exit(1);
    }


    /**
     * Get a list of the branches that do not exist remotely
     *
     * @memberof GitHelper
     * @return {Promise<Array<{ branchName: string, error?: string }>>}
     */
    async getZombieBranches() {
        const self = this;

        log.info('Validating repository...');
        await this.#validateRepository();
        
        log.info('Gathering info about your branches...');
        const { active, localBranches } = await this.#getLocalBranches();
        const remoteBranches = await this.#getRemoteBranches();

        const zombieBranches = localBranches.filter(localBranch => !remoteBranches.includes(localBranch));
        let result = [];
        for (let i=0; i < zombieBranches.length; i++) {
            let error = active === zombieBranches[i] ? 'Only exists locally but is {color:green}checked out{color} and can not be deleted' : null;
            error = error ? error : (await this.#branchHasPendingCommits(zombieBranches[i]) ? 'Only exists locally but has unpushed content' : '');
            result.push({
                branchName: zombieBranches[i],
                error: error 
            });
        }
        return result;
    }

    #escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    async deleteLocalBranch(branchName) {
        var { code, data } = await this.#executeGitCommand('branch', '-d', branchName);
        if (code === 0) {
            data = data.trim();
            return data;
        }
        log.error(`{color:red}Failed{color} Could not delete branch '{color:cyan}${branchName}{color}' ({color:yellow}git branch -d ${branchName}{color})`);
        log.error(`{color:red}${data}`);
        process.exit(1);
    }


    async #branchHasPendingCommits(name) {
        if (!this.#checkOfPendingCommitsDone) {
            var { code, data } = await this.#executeGitCommand('log', '--branches', '--not', '--remotes', '--source');
            if (code === 0) {
                data = data.trim();
                this.#checkOfPendingCommitsCache = data;
                this.#checkOfPendingCommitsDone = true;
            } else {
                log.info(`{color:red}Failed{color} Could not run git log for folder '{color:cyan}${config.workingFolder}{color}' ({color:yellow}git log --branches --not --remotes --sources{color})`);
                log.info(`{color:red}${data}`);
                process.exit(1);
            }
        }
    
        var re = new RegExp(`commit [a-z0-9]+\t+${this.#escapeRegExp(name)}`, 'igm');
    
        const mama = re.exec(this.#checkOfPendingCommitsCache);
        if (mama) {
            return true;
        }
        return false;
    }


    /**
     * Attempt to get the repository URL for the specified directory
     *
     * @memberof GitHelper
     */
    async #validateRepository() {

        if (this.#workingDirectoryValidated) {
            return;
        }

        var { code, data } = await this.#executeGitCommand('remote', 'get-url', 'origin');
        if (code === 0) {
            this.#workingDirectoryValidated = true;
            data = data.trim();
            this.#repositoryUrl = data;
            return data;
        }
        log.error(`{color:red}Failed{color} Could not get repository URL for folder '{color:cyan}${this.#workingDirectory}{color}' ({color:yellow}git remote get-url origin{color})`);
        log.fail(`{color:red}${data}`);
    }

    async #executeGitCommand() {
        let content = '';
        let processError;
        const process = 'git';

        
        const args = Array.from(arguments);

        return new Promise((resolve, reject) => {

            // Always add the working folder as an argument so we execute all GIT commands in the right place
            if (args.indexOf('-C') === -1) {
                args.splice(0, 0, '-C', this.#workingDirectory);
            }

            this.#logCommand(args);
    
            // Spawn the process
            const child = spawn(process, args);
            
            // Capture stdout data
            child.stdout.on('data', function (data) {
                content += data.toString();
            });

            // Capture stderr data
            child.stderr.on('data', function (data) {
                content += data.toString();
            });
    
            // Capture error
            child.on('error', function(d) {
                processError += d.toString();
            })
            
            // Capture close event
            child.on('close', function (code) {
                
                if (processError) {
                    log.verbose(`{color:red}ERR{color} Child process exited with code (${code})`);
                    return reject(processError);
                }
                log.verbose(`{color:green}OK{color} Child process exited with code (${code})`);
                const data = content;
                log.verbose(data);
                resolve({code, data});
            });
    
        });
    }

    /***
     * @param {Array<string>} args Command parameters
     */
    #logCommand(args) {
        let output = `{color:yellow}git`;
        
        args.forEach(arg => {
            if (arg.indexOf('-') === 0) {
                output += ` ${arg}`;
            } else {
                output += ` ${arg}`;
            }
        });
        
        log.verbose(output);

    }

}


module.exports = GitHelper;

