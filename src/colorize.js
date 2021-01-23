/***
 * Set colors to your console.log strings byt using syntax
 * {color:COLOR}text{color}
 * 
 * Where COLOR can be red, yellow, cyan, blue, magenta, green, white
 * @param {string} str String to parse
 * @param {boolean?} purge Remove coloring options and return plain text
 */
module.exports = function colorize(str, purge) {

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
                str = str.replace(ix[0], purge === true ? '' : `\x1b[0m`);
            } else {
                str = str.replace(ix[0], purge === true ? '' : colors[ix[1]]);
                const endIx = regexp.exec(str);

                if (!endIx) {
                    str = str + (purge === true ? '' : `\x1b[0m`);
                } else {
                    str = str.substr(0, endIx.index) + (purge === true ? '' : `\x1b[0m`) + str.substr(endIx.index) ;
                }
            }
        }
    } while(ix);

    return str;
}