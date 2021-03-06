const { join } = require('path');

const Base = require(join(__dirname, '.', 'Base.js'));
const WarBoard = require(join(__dirname, '.', 'WarBoard.js'));
const { States } = require(join(__dirname, '..', 'util', 'constants.js'));

const { ids } = require(join(__dirname, '../..', 'config.json'));

module.exports = class extends Base {
    constructor(client, data) {
        super(client);

        this.state = data.state;
        this.clan = data.clan;
        this.opponent = data.opponent;
        this.preparationStartTime = data.preparationStartTime;
        this.startTime = data.startTime;
        this.endTime = data.endTime;
        this.cwl = 'warStartTime' in data;

        this.boards = {
            clan: new WarBoard(this, this.clan),
            opponent: new WarBoard(this, this.opponent),
        };
    }

    get announcementChannel() {
        return this.client.guild.channels.cache.get(ids.announcementChannel);
    }

    get category() {
        return this.client.guild.channels.cache.get(ids.warCategory);
    }

    get id() {
        return this.startTime + this.endTime;
    }

    async create() {
        await this.boards.clan.create();
        await this.boards.opponent.create();
    }

    async clear() {
        await this.boards.clan.clear();
        await this.boards.opponent.clear();
    }

    async update() {
        await this.clear();
        await this.create();
    }

    async emoji() {
        const { guild } = this.client;
        const current = guild.emojis.cache.find(e => e.name === 'opponent');
        if (current) await current.delete();
        return guild.emojis.create(this.opponent.badgeUrls.small, 'opponent');
    }

    async topic() {
        if (this.state === States.NOT_IN_WAR) return;

        await this.boards.clan.topic();
        return this.boards.opponent.topic();
    }

    show(showOrHide) {
        return this.category.updateOverwrite(this.client.guild.id, { VIEW_CHANNEL: showOrHide });
    }

    announce() {
        const { guild, war } = this.client;
        const swordsEmoji = guild.emojis.cache.find(e => e.name === 'swords');
        const announcement = `${swordsEmoji} War against **${this.opponent.name}** ${guild.emojis.cache.find(x => x.name === 'opponent')} has `;

        const suffixes = {
            [States.IN_WAR]: 'started',
            [States.PREPARATION]: 'been declared',
            [States.WAR_ENDED]: 'ended',
        };

        return this.announcementChannel.send(announcement + suffixes[war.state]);
    }

    async save() {
        const {
            id, state, startTime, endTime,
        } = this;

        return this.client.db.prepare('REPLACE INTO wars VALUES (?, ?, ?, ?)').run(id, state, startTime, endTime);
    }
};
