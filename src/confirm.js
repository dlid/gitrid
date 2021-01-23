const colorize = require('./colorize');
const readline = require('readline');

/***
 * Let the user confirm something before proceeding
 * @param {string} The question
 * @returns {Promise<boolean>}
 */
module.exports = async function confirm(question) {
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