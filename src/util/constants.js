const { join } = require('path');

const Roles = {
    LEADER: 'leader',
    COLEADER: 'coLeader',
    ADMIN: 'admin',
    MEMBER: 'member',
};

const States = {
    PREPARATION: 'preparation',
    IN_WAR: 'inWar',
    WAR_ENDED: 'warEnded',
    NOT_IN_WAR: 'notInWar',
};

const FormattedRoles = {
    [Roles.LEADER]: 'Leader',
    [Roles.COLEADER]: 'Co-Leader',
    [Roles.ADMIN]: 'Elder',
    [Roles.MEMBER]: 'Member',
};

const FormattedStates = {
    [States.PREPARATION]: 'Preparation Day',
    [States.IN_WAR]: 'Battle Day',
    [States.WAR_ENDED]: 'War Ended',
    [States.NOT_IN_WAR]: 'Not in War',
};

const Colors = {
    WHITE: '#FFFFFF',
    GREY: '#BEBEBE',
    BLACK: '#000000',
    CREAM: '#FFF1B9',
    LIGHT_RED: '#F66B6B',
    LIGHT_GREEN: '#80E093',
    RED: '#FE3903',
    ORANGE: '#E79A18',
};

const Bars = {
    Star: {
        COLOR: Colors.ORANGE,
        ICON: join(__dirname, '../..', 'assets', 'star.png'),
    },
    Destruction: {
        COLOR: Colors.RED,
        ICON: join(__dirname, '../..', 'assets', 'destruction.png'),
    },
    Attack: {
        COLOR: Colors.GREY,
        ICON: join(__dirname, '../..', 'assets', 'attack.png'),
    },
};

module.exports = {
    Roles, States, FormattedRoles, FormattedStates, Colors, Bars,
};
