const { join } = require('path');

const Base = require(join(__dirname, '.', 'Base.js'));

module.exports = class extends Base {
    async update() {
        await this.clear();
        await this.create();
    }

    clear() {
        return this.channel.bulkDelete(100).catch(() => { });
    }

    number(number, opponent) {
        const split = [...`${number}`];
        return split.map(x => this.emoji(`${x}_${opponent ? 'o' : ''}`)).join(' ') + ' '.repeat(split.length === 2 ? 7 : 13);
    }

    townhall({ townhallLevel }) {
        return this.emoji(`th${townhallLevel}`);
    }

    league({ name }) {
        return this.emoji(`${name.split(' ')[0].toLowerCase()}`);
    }

    emoji(name) {
        return this.client.emojis.cache.find(e => e.name === name);
    }
};
