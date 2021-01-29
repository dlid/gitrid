

const { argv } = require('process');
const path = require('path');
const fs = require('fs');
const log = require('./log');

class AppConfig {

    actionValue;
    workingFolder;
    automaticallySayYes = false;

    fromArgv(argv) {
        this.workingFolder = path.resolve('./');

        if (argv.length === 3 && (argv[2] === '--version' || argv[2] === '-v')) {
            this.actionValue = 'version';
            return;
        }

        if (argv.length === 3 && (argv[2] === '--help' || argv[2] === '-h')) {
            this.actionValue = 'help';
            return;
        }

        if (process.argv.length > 2) {
            let args = process.argv.slice(2);
        
            let ix = args.findIndex(v => v === '--yes' || v === '-y');
            if (ix !== -1) {
                this.automaticallySayYes = true;
                args.splice(ix, 1);
            }

            if (args.includes('--verbose') && args.includes('--silent')) {
                log.fail(`{color:red}Failed{color} Parameters {color:yellow}--silent{color} and {color:yellow}--verbose{color} can not be used together`);
            }

            ix = args.findIndex(v => v === '--verbose');
            if (ix !== -1) {
                log.setLogLevel('verbose');
                args.splice(ix, 1);
            }

            ix = args.findIndex(v => v === '--silent');
            if (ix !== -1) {

                if (!this.automaticallySayYes) {
                    log.fail(`{color:red}Failed{color} When using {color:cyan}--silent{color} you must also use {color:yellow}--yes`);
                }

                log.setLogLevel('error');
                args.splice(ix, 1);
            }

            ix = args.findIndex(v => v === '--plain-text');
            if (ix !== -1) {
                log.disableColors();
                args.splice(ix, 1);
            }

            if (args.length === 1) {
                const pathFromArgument = path.resolve(args[0]);
                if (fs.existsSync(pathFromArgument)) {
                    this.workingFolder = pathFromArgument;
                } else {
                    log.fail(`{color:red}Failed{color} Path not found '{color:yellow}${pathFromArgument}{color}'`);
                }
            } else if (args.length > 1) {
                log.fail(`{color:red}Failed{color} Unknown parameter '{color:yellow}${args[1]}{color}'`);
            }
        }

    }




}

const a = new AppConfig();
a.fromArgv(argv);

exports.action = a.actionValue;
exports.workingFolder = a.workingFolder;
exports.automaticallySayYes = a.automaticallySayYes;
