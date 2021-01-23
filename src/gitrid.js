const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const log = require('./log')
const config = require('./config')
const GitHelper = require('./git');
const confirm = require('./confirm');

if (config.action === 'version') {
    const packageContent = fs.readFileSync( path.join(__dirname, '../', 'package.json'));
    const packageJson = JSON.parse(packageContent);
    log.info(`Gitrid Version ${packageJson.version}`);
    process.exit(0);
} else if (config.action === 'help') {
    const help = require('./help');
    console.log(help);
    process.exit(0);
}

(async () => {
    try {

        var git = new GitHelper(config.workingFolder);

        // Get list zombie branches
        const zombies = await git.getZombieBranches();
        

        if (zombies.length > 0) {

            log.info();
            log.info(`Found {color:cyan}${zombies.length}{color} branch${zombies.length > 1 ? 'es' : ''} not in remote repository:`);

            // Inform the user
            zombies.forEach(zombie => {
                if (!zombie.error) {
                    log.info(`[{color:green} ZOMBIE{color}] {color:cyan}${zombie.branchName}{color} can be deleted`);
                } else {
                    log.info(`[{color:yellow}WARNING{color}] {color:cyan}${zombie.branchName}{color} ${zombie.error}`);
                }
            })



        }


        const branchesToDelete = zombies.filter(f => !f.error);

        // If any branches that can be deleted
        if (branchesToDelete.length > 0) {

        

            // Wait for user confirmation
            const yesDelete = config.automaticallySayYes || await confirm(`{color:white}Remove ${branchesToDelete.length} Branch${branchesToDelete.length > 1 ? 'es' : ''}?{color} (y/n): `);

            if (!yesDelete) {
                log.fail('Cancelled by user');
            }

            // Delete branches
            branchesToDelete.forEach(async branch => {
                log.info(`Deleting branch {color:cyan}${branch.branchName}`);
                await git.deleteLocalBranch(branch.branchName)
            });
        } else if (zombies.length > 0) {
            log.info(`{color:yellow}${zombies.length}{color} zombie branch${branchesToDelete.length > 1 ? 'es' : ''} was found, but {color:yellow}none{color} can be deleted`);
        } else {
            log.info(`No zombie branches was found`);
        }


    } catch (e) {
        
        log.error(`{color:red}Completed with error{color} The operation completed with errors`, e);
        log.error(e);
        process.exit(1);
    }
})();
