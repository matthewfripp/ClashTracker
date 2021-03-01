const Discord = require('discord.js'); // eslint-disable-line no-unused-vars
const { Command } = require('discord-akairo');
const { inspect } = require('util');
const { join } = require('path');

const { clean } = require(join(__dirname, '..', 'util', 'functions.js'));
const Canvas = require(join(__dirname, '..', 'structures', 'Canvas.js')); // eslint-disable-line no-unused-vars

module.exports = class extends Command {
  constructor() {
    super('eval', {
      ownerOnly: true,
      aliases: ['eval'],
      args: [
        {
          id: 'query',
          match: 'content',
        },
      ],
    });
  }

  async exec(message, { query }) {
    try {
      const evaled = await eval(query); // eslint-disable-line no-eval
      const response = `\`\`\`js\n${clean(inspect(evaled, { depth: 2 }), message.client.token)}\n\`\`\``;

      await message.util.send(response);
    } catch (err) {
      console.error('Eval error:', err);
      return message.util.send(`Error:\`\`\`xl\n${clean(err, message.client.token)}\n\`\`\``);
    }
  }
};
