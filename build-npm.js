const fs = require('fs');
const { argv } = require('process');
const { pathToFileURL } = require('url');
const packageContent = fs.readFileSync('./package.json');
// const getSize = require('get-folder-size');
const packageJson = JSON.parse(packageContent);
// const r = require('replace-in-file');
let version = packageJson.version;
let isRelease = false;

if (argv.includes('--development')) {
    version += ' DEVELOPMENT BUILD';
} else {
    isRelease = true;
}

let targetFolder = isRelease ? 'dist/release/' : 'dist/dev/';

if (fs.existsSync(`./${targetFolder}/`)) {
    loginfo("Deleting dist foder");
    fs.rmdirSync(`./${targetFolder}/`, { recursive: true});
}

fs.mkdirSync(`./${targetFolder}/lib/`, {recursive: true});
fs.mkdirSync(`./${targetFolder}/bin/`, {recursive: true});


loginfo(`Copying scripts from src`);
fs.readdirSync('./src')
    .forEach(filename => fs.copyFileSync(`./src/${filename}`, `./${targetFolder}/lib/${filename}`));


//replaceVersionNumber();
createNpmFiles();

return;

function loginfo(text) {
    const date = new Date();
    const prefix = date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds().toString().padStart(2, '0') + ' - [post.build] ';
    console.log(`${prefix}${text}`);
}
 
// function replaceVersionNumber() {
//     loginfo(`Updating dist version number to ${version}`);
//     r.replaceInFileSync({
//         files: [`./${targetFolder}lib/dlid-backup.class.js`],
//         from: '%DLID-BACKUP-VERSION%',
//         to: version
//     });
// }
 
function bytesToSize(bytes) {
    var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes == 0) return '0 Byte';
    const v = Math.floor(Math.log(bytes) / Math.log(1024))
    var i = parseInt( v.toString()  );
    return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
 };

function createNpmFiles() {
    const fs = require('fs');
    const { argv } = require('process');
    const packageContent = fs.readFileSync('./package.json');
    const packageJson = JSON.parse(packageContent);
    let version = packageJson.version;

    if (!fs.existsSync(`./${targetFolder}bin`)) {
        fs.mkdirSync(`./${targetFolder}bin`)
    }


    loginfo(`Creating ${targetFolder}package.json`);

    let package = packageJson;
    delete packageJson.devDependencies;
    delete packageJson.scripts;
    packageJson.main = './lib/gitrid.js';
    packageJson.bin = './bin/index.js';
    package.name = `@dlid/gitrid`;

    fs.writeFileSync(`./${targetFolder}package.json`, JSON.stringify(package, null, 2));

    loginfo(`Copying LICENSE.md`);
    fs.copyFileSync('./LICENSE.md', `./${targetFolder}/LICENSE.md`);

    loginfo(`Copying README.md`);
    fs.copyFileSync('./README.md', `./${targetFolder}/README.md`);

    loginfo(`Creating ${targetFolder}bin/index.js`);

    let debugInfo = '';
    fs.writeFileSync(`./${targetFolder}bin/index.js`, `#!/usr/bin/env node
${debugInfo}require('../lib/gitrid');
    `);

} 
