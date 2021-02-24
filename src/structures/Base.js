module.exports = class {
    constructor(client) {
        Object.defineProperty(this, 'client', { value: client });
    }
};
