const util = require('util');

module.exports = {
    clean: (text, token) => {
        if (typeof text === 'string') {
            text = text.replace(/`/g, `\`${String.fromCharCode(8203)}`).replace(/@/g, `@${String.fromCharCode(8203)}`);
            return text.replace(new RegExp(token, 'gi'), '****');
        }

        return text;
    },

    chunk: (array, size) => array.flatMap((_, i) => (i % size ? [] : [array.slice(i, i + size)])),

    wait: (ms) => util.promisify(setTimeout)(ms),

    // Supercell don't format their dates correctly
    fixISO: (s) => `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 11)}:${s.slice(11, 13)}:${s.slice(13)}`,

    formatDate: (d) => (new Date(d)).toUTCString(),

    // Supercell consider 0 and O the same thing...
    compareTag: (a, b) => a.replace(/0|O/, '0') === b.replace(/0|O/, '0'),

};
