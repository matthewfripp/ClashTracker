const { join } = require('path');
const { Util } = require('discord.js');
const { formatDistance } = require('date-fns');

const Board = require(join(__dirname, '.', 'Board.js'));
const Canvas = require(join(__dirname, '.', 'Canvas.js'));

const { States, FormattedStates } = require(join(__dirname, '..', 'util', 'constants.js'));
const { compareTag, fixISO } = require(join(__dirname, '..', 'util', 'functions.js'));

const { clanTag, ids } = require(join(__dirname, '../..', 'config.json'));

module.exports = class extends Board {
    constructor(war, clan) {
        super(war.client);
        this.war = war;
        this.clan = clan;
    }

    get isOpponent() {
        return !compareTag(this.clan.tag, clanTag);
    }

    get channel() {
        return this.client.guild.channels.cache.get(this.isOpponent ? ids.opponentChannel : ids.clanChannel);
    }

    async create() {
        const messages = this.generateText();
        const banner = await Canvas.banner(this.clan);

        await this.channel.send(banner);

        for (const message of messages) await this.channel.send(message);
    }

    async topic() {
        const { state } = this.war;
        const startTime = new Date(fixISO(this.war.startTime));
        const endTime = new Date(fixISO(this.war.endTime));
        const ended = state === States.WAR_ENDED;

        const topic = `**${FormattedStates[state]}**, end${ended ? 'ed' : 's in'} ${formatDistance(new Date(), this.war.state === States.PREPARATION ? startTime : endTime)} ${ended ? 'ago' : ''}`;

        return this.channel.setTopic(topic);
    }

    generateText() {
        const {
            isOpponent, war,
        } = this;

        const stars = count => `${this.emoji('star')}`.repeat(count) + `${this.emoji('star_empty')}`.repeat(3 - count);

        const text = '\u200b\n' + this.clan.members
            .sort((a, b) => a.mapPosition - b.mapPosition)
            .map((m, i) => {
                const attackFormat = attack => {
                    const opponent = war[isOpponent ? 'clan' : 'opponent'].members.find(x => compareTag(x.tag, attack.defenderTag));
                    const percentage = `**\`${attack.destructionPercentage}%\`**`;
                    return `\u200b          ${this.emoji('sword')}    ${stars(attack.stars)} ${percentage}${' '.repeat(14 - percentage.length)}${this.townhall(opponent)} ${this.number(opponent.mapPosition, !isOpponent)}`;
                };

                return `${this.number(i + 1, isOpponent)}${this.townhall(m)} **${m.name}** ${war.state === States.IN_WAR ? `${this.emoji('sword')}`.repeat(!m.attacks ? 2 : 2 - m.attacks.length) : ''}\n`
                    + `${m.attacks ? m.attacks.map(attackFormat).join('\n') : ''}`;
            })
            .join('\n\n');

        return Util.splitMessage(text, { append: '\u200b\n' });
    }
};
