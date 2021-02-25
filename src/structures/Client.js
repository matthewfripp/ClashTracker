const {
    AkairoClient, CommandHandler, ListenerHandler,
} = require('discord-akairo');
const sqlite = require('better-sqlite3');
const { Client } = require('clashofclans.js');
const { readFileSync } = require('fs');
const { join } = require('path');

const War = require(join(__dirname, '.', 'War.js'));

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

    async pollWar() {
        const data = await this.coc.currentClanWar(clanTag);
        if (!data.ok) return;

        const oldWar = this.war;
        const newWar = new War(this, data);

        if (newWar.state === States.NOT_IN_WAR) {
            await newWar.clear();
            await newWar.save();
            return newWar.show(false);
        }

        if (!oldWar || oldWar.state !== newWar.state) {
            await newWar.topic();
            await newWar.clear();
            await newWar.emoji();
            await newWar.create();
            await newWar.show(true);
            await newWar.announce();
            return newWar.save();
        }

        await newWar.topic();

        if (newWar.state !== States.IN_WAR) return;

        for (const k of Object.keys(newWar.boards)) {
            if (oldWar[k].attacks === newWar[k].attacks) continue;
            await oldWar.boards[k].clear();
            await newWar.boards[k].create();

            const shallowCompare = (obj1, obj2) => Object.keys(obj1).length === Object.keys(obj2).length && Object.keys(obj1).every(key => obj1[key] === obj2[key]);
            const attacks = m => m.attacks || [];

            const oldAttacks = oldWar[k].members.flatMap(attacks);
            const newAttacks = newWar[k].members.flatMap(attacks);

            const difference = newAttacks.filter(newA => oldAttacks.every(oldA => !shallowCompare(newA, oldA)));
            // this.updateAttacks(difference);
        }

        this.war = newWar;
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

    async updateAttacks(attacks) {
        for (const a of attacks) this.db.prepare('INSERT INTO attacks VALUES(?, ?, ?, ?, ?)').run(null, a.attackerTag, a.defenderTag, a.destructionPercentage, a.stars);

        const dbAttacks = this.db.prepare('SELECT * FROM attacks').all();


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

        const data = await this.coc.currentClanWar(clanTag);
        this.war = new War(this, data);

        const dbWar = this.db.prepare('SELECT * FROM wars WHERE id = ?').get(this.war.id);

        this.setInterval(() => this.pollWar(), intervals.war);
        this.setInterval(() => this.pollMembers(), intervals.member);

        if (this.war.state !== dbWar?.state || this.war.startTime !== dbWar?.startTime) this.updateWar(null, this.war);
    }
};
