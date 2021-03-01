const {
    AkairoClient, CommandHandler, ListenerHandler,
} = require('discord-akairo');
const sqlite = require('better-sqlite3');
const { Client } = require('clashofclans.js');
const { readFileSync } = require('fs');
const { join } = require('path');

const War = require(join(__dirname, '.', 'War.js'));
const StatsBoard = require(join(__dirname, '.', 'StatsBoard.js'));

const {
    tokens, ids, intervals, clanTag, prefix,
} = require(join(__dirname, '../..', 'config.json'));

const { States, FormattedRoles } = require(join(__dirname, '..', 'util', 'constants.js'));
const { compareTag } = require(join(__dirname, '..', 'util', 'functions.js'));

module.exports = class extends AkairoClient {
    constructor() {
        super({
            ownerID: ids.owner,
        }, {
            disableEveryone: true,
            disabledEvents: ['TYPING_START'],
        });

        this.commandHandler = new CommandHandler(this, {
            directory: join(__dirname, '..', 'commands'),
            commandUtil: true,
            prefix,
        });

        this.listenerHandler = new ListenerHandler(this, {
            directory: join(__dirname, '..', 'listeners'),
        });

        this.db = sqlite('database.db', { verbose: console.log });
        this.coc = new Client({ token: tokens.coc });
        this.war = null;
    }

    get guild() {
        return this.guilds.cache.get(ids.guild);
    }

    async fetchWar() {
        let data = await this.coc.clanWarLeague(clanTag);

        if (!data.ok) data = await this.coc.currentClanWar(clanTag);

        const { warTags } = data.rounds.reverse().find(x => x.warTags[0] !== '#0');

        for (const tag of warTags) {
            data = await this.coc.clanWarLeagueWar(tag);
            if (data.clan.tag === clanTag) break;
            if (data.opponent.tag === clanTag) {
                const { clan, opponent } = data;
                data.opponent = clan;
                data.clan = opponent;
                break;
            }
        }

        return data;
    }

    async pollWar() {
        const data = await this.fetchWar();
        if (!data.ok) return;

        const oldWar = this.war;
        const newWar = new War(this, data);
        this.war = newWar;

        this.updateWar(oldWar, newWar);
    }

    async pollMembers() {
        if (!this.guild) return;

        const { memberList } = await this.coc.clan(clanTag);
        const discordMembers = await this.guild.members.fetch();
        const query = this.db.prepare('SELECT * FROM members').all();

        for (const member of discordMembers.values()) {
            const dbMember = query.find(r => r.discord === member.id);
            if (!dbMember) continue;

            const clanMember = memberList.find(m => compareTag(m.tag, dbMember.tag));

            if (!clanMember) {
                await member.edit({ nickname: null, roles: [] });
                continue;
            }

            const toEdit = {};

            const role = FormattedRoles[clanMember.role];

            if (clanMember.name !== member.displayName) toEdit.nickname = member.nickname;
            if (role !== member.roles.cache.first().name) toEdit.roles = [this.guild.roles.cache.find(r => r.name === role)];

            if (Object.keys(toEdit).length) await member.edit(toEdit);
        }
    }

    async updateWar(oldWar, newWar) {
        if (newWar.state === States.NOT_IN_WAR) return newWar.category.permissionsFor(this.guild.id).has('VIEW_CHANNEL') && newWar.show(false);

        await newWar.topic();

        if (!oldWar || oldWar.state !== newWar.state) {
            await newWar.emoji();
            await newWar.update();
            await newWar.show(true);
            await newWar.announce();
            await newWar.save();
            if (newWar.state === States.WAR_ENDED) await this.updateAttacks(newWar);
            return;
        }

        if (newWar.state !== States.IN_WAR) return;

        const clanAttacked = oldWar.clan.attacks !== newWar.clan.attacks;
        const opponentAttacked = oldWar.opponent.attacks !== newWar.opponent.attacks;

        if (clanAttacked || opponentAttacked) await this.updateAttacks(newWar);
        if (clanAttacked) await newWar.boards.clan.update();
        if (opponentAttacked) await newWar.boards.opponent.update();
    }

    async updateAttacks(war) {
        if (![States.WAR_ENDED, States.IN_WAR].includes(war.state)) return;

        const attacks = war.clan.members.flatMap(m => m.attacks || []);

        for (const a of attacks) this.db.prepare('INSERT OR IGNORE INTO attacks VALUES(?, ?, ?, ?, ?, ?)').run(null, a.attackerTag, a.defenderTag, a.destructionPercentage, a.stars, war.id);

        const dbAttacks = this.db.prepare('SELECT * FROM attacks').all();

        const clan = await this.coc.clan(clanTag);

        const stats = new StatsBoard(this, dbAttacks, clan);
        await stats.update();
    }

    async _init() {
        this.db.exec(readFileSync(join(__dirname, '..', 'util', 'init.sql'), 'utf8'));

        this.commandHandler.useInhibitorHandler(this.inhibitorHandler);
        this.commandHandler.useListenerHandler(this.listenerHandler);

        this.commandHandler.loadAll();
        this.listenerHandler.loadAll();
        return this.login(tokens.discord);
    }

    async start() {
        await this._init();

        const data = await this.fetchWar();

        const war = new War(this, data);

        this.war = war;

        const dbWar = this.db.prepare('SELECT * FROM wars WHERE id = ?').get(war.id);

        this.setInterval(() => this.pollWar(), intervals.war);
        this.setInterval(() => this.pollMembers(), intervals.member);

        if (!dbWar) this.updateWar(null, war);
    }
};
