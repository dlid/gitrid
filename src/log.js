const colorize = require('./colorize');


class Logger {

    #currentLogLevel = 1;
    #loglevels = ['verbose', 'info', 'error', 'fail'];
    #disableColors = false;


    /**
     *
     *
     * @param {'verbose'|'info'|'error'|'fail'} newLevel
     * @memberof Logger
     */
    setLogLevel(newLevel) {

        const newLevelIndex = this.#loglevels.indexOf(newLevel);
        if (newLevelIndex > -1) {
            this.#currentLogLevel = newLevelIndex;
        } else {
            this.fail(`Unknown log level '${newLevel}' (${this.#loglevels.slice(0, this.#loglevels.length - 1).join(', ')})`);
        }

    }

    disableColors() {
        this.#disableColors = true;
    }

    info() {
        this.#write.apply(this, [1, Array.from(arguments)]);
    }
    verbose() {
        this.#write.apply(this, [0, Array.from(arguments)]);
    }
    error() {
        this.#write.apply(this, [2, Array.from(arguments)]);
    }
    fail() {
        this.#write.apply(this, [3, Array.from(arguments)]);
    }

    #write(logLevel, values) {

        if (logLevel < this.#currentLogLevel) {
            return;
        }

        const date = new Date();
        const prefix = '[gitrid] ' + date.getHours() + ':' + date.getMinutes().toString().padStart(2, '0') + ':' + date.getSeconds().toString().padStart(2, '0') ;
    
        if (values.length > 0) { 
            values.unshift(prefix);
        } else {
            values = [''];
        }
    
        for( var i = 0; i < values.length; i++) {
            if (typeof values[i] === 'string') {
                values[i] = colorize(values[i], this.#disableColors);
            }
        }
        console.log.apply(console, values);
        if (this.#loglevels[logLevel] === 'fail') {
            process.exit(1);
        }
    }
}





module.exports = new Logger();
