require('dotenv').config({ path: './.env' });
const { join } = require('path');

const ClashClient = require(join(__dirname, 'structures', 'Client.js'));

new ClashClient().start();
