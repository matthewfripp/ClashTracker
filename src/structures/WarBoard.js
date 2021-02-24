const { join } = require('path');
const { Util } = require('discord.js');
const { formatDistance } = require('date-fns');

const Base = require(join(__dirname, '.', 'Base.js'));
const Canvas = require(join(__dirname, '.', 'Canvas.js'));

const { States, FormattedStates } = require(join(__dirname, '..', 'util', 'constants.js'));
const { compareTag, fixISO } = require(join(__dirname, '..', 'util', 'functions.js'));

const { clanTag, clanChannelID, opponentChannelID } = require(join(__dirname, '../..', 'config.js'));

module.exports = class extends Base {
    constructor(war, clan) {
        super(war.client);
        this.war = war;
        this.clan = clan;
    }

    get isOpponent() {
        return !compareTag(this.clan.tag, clanTag);
    }

    get channel() {
        return this.client.guild.channels.cache.get(this.isOpponent ? opponentChannelID : clanChannelID);
    }

    async create() {
        const messages = this.generateText();
        const banner = await Canvas.banner(this.clan);

        await this.channel.send(banner);

        for (const message of messages) await this.channel.send(message);
    }

    async clear() {
        await this.channel.bulkDelete(100).catch(() => { });
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
        const { isOpponent, war, client: { guild } } = this;

        const emojis = guild.emojis.cache;

        const starEmoji = emojis.find(e => e.name === 'star');
        const swordEmoji = emojis.find(e => e.name === 'sword');
        const emptyStarEmoji = emojis.find(e => e.name === 'star_empty');

        const stars = count => `${starEmoji}`.repeat(count) + `${emptyStarEmoji}`.repeat(3 - count);
        const th = m => emojis.find(e => e.name === `th${m.townhallLevel}`);
        const number = (n, opp) => [...`${n}`].map(x => emojis.find(e => e.name === `${x}_${opp ? '' : 'o'}`));

        const text = '\u200b\n' + this.clan.members
            .sort((a, b) => a.mapPosition - b.mapPosition)
            .map((m, i) => {
                const attackFormat = attack => {
                    const opponent = war[isOpponent ? 'clan' : 'opponent'].members.find(x => compareTag(x.tag, attack.defenderTag));
                    const percentage = `**\`${attack.destructionPercentage}%\`**`;
                    return `\u200b          ${swordEmoji}    ${stars(attack.stars)} ${percentage}${' '.repeat(14 - percentage.length)}${th(opponent)} ${number(opponent.mapPosition, isOpponent).join('')}`;
                };

                const mNum = number(i + 1, !isOpponent);

                return `${mNum.join('')}${' '.repeat(mNum.length === 2 ? 7 : 13)}${th(m)} **${m.name}** ${war.state === States.IN_WAR ? `${swordEmoji}`.repeat(!m.attacks ? 2 : 2 - m.attacks.length) : ''}\n`
                    + `${m.attacks ? m.attacks.map(attackFormat).join('\n') : ''}`;
            })
            .join('\n\n');

        return Util.splitMessage(text, { append: '\u200b\n' });
    }
};
