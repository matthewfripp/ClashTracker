const { Listener } = require('discord-akairo');

module.exports = class extends Listener {
    constructor() {
        super('ready', {
            emitter: 'client',
            event: 'ready',
        });
    }

    exec() {
        console.log(`Ready! ${this.client.user.tag}`);
    }
};
