const { join } = require('path');
const { Util } = require('discord.js');

const Board = require(join(__dirname, '.', 'Board.js'));
const Canvas = require(join(__dirname, '.', 'Canvas.js'));

const { ids } = require(join(__dirname, '../..', 'config.json'));
const { compareTag, round } = require(join(__dirname, '..', 'util', 'functions.js'));

module.exports = class extends Board {
    constructor(client, data, clan) {
        super(client);
        this.data = data;
        this.clan = clan;
    }

    get channel() {
        return this.client.guild.channels.cache.get(ids.statsChannel);
    }

    async create() {
        const messages = this.generateText();
        // const banner = await Canvas.stats(this.data);

        // await this.channel.send(banner);

        for (const message of messages) await this.channel.send(message);
    }

    generateText() {
        const { data } = this;

        const text = '\u200b\n' + this.clan.memberList
            .filter(m => data.map(d => d.attackerTag).includes(m.tag))
            .map(({ name, tag, league }) => {
                const attacks = data.filter(d => compareTag(d.attackerTag, tag));
                const average = prop => round(attacks.reduce((acc, cur) => acc + cur[prop], 0) / attacks.length);

                const averageStars = average('stars');
                const averageDestruction = average('destructionPercentage');

                // Average attacks is a bit different
                const warIDS = new Set(attacks.map(d => d.war));
                const averageAttacks = round(attacks.length / warIDS.size);

                return {
                    tag, name, averageStars, averageDestruction, league, averageAttacks,
                };
            })
            .sort((a, b) => b.averageStars - a.averageStars || b.averageDestruction - a.averageDestruction || b.averageAttacks - a.averageAttacks)
            .map((m, i) => `${this.number(i + 1)}${this.league(m.league)} **${m.name}**\n`
                + `\u200b          ${this.emoji('star')}    **\`${m.averageStars}\`**\n`
                + `\u200b          ${this.emoji('destruction')}    **\`${m.averageDestruction}%\`**\n`
                + `\u200b          ${this.emoji('sword')}    **\`${m.averageAttacks}\`**\n`)
            .join('\u200b\n\n');

        return Util.splitMessage(text, { append: '\u200b\n' });
    }
};
