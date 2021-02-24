const { Command } = require('discord-akairo');
const { join } = require('path');

const { clanTag } = require(join(__dirname, '../..', 'config.json'));
const { Roles } = require(join(__dirname, '..', 'util', 'constants.js'));
const { compareTag } = require(join(__dirname, '..', 'util', 'functions.js'));

module.exports = class extends Command {
    constructor() {
        super('verify', {
            aliases: ['verify', 'v'],
            args: [
                {
                    id: 'tag',
                },
                {
                    id: 'token',
                },
            ],
        });
    }

    async exec(message, { tag, token }) {
        if (!tag.startsWith('#')) tag = `#${tag}`;

        const { coc, db } = message.client;

        const player = await coc.player(tag);

        if (player.reason === 'notFound') return message.util.send('Player tag not found!');
        if (!compareTag(player.clan.tag, clanTag)) return message.util.send('Not a member of the clan!');

        const res = await coc.verifyPlayerToken(tag, token);

        if (res.status !== 'ok') return message.util.send('Invalid token!');

        const formatted = {
            [Roles.LEADER]: 'Leader',
            [Roles.COLEADER]: 'Co-Leader',
            [Roles.ADMIN]: 'Elder',
            [Roles.MEMBER]: 'Member',
        };

        const role = formatted[player.role];

        await message.member.edit({
            nick: player.name,
            roles: [message.guild.roles.cache.find(r => r.name === role)],
        });

        db.prepare('INSERT INTO members VALUES(?, ?, ?)').run(player.tag, role, message.author.id);

        return message.util.send(`Welcome, **${role}** ${player.name}`);
    }
};
