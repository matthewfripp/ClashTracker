const { join } = require('path');
const { MessageAttachment } = require('discord.js');
const { createCanvas, loadImage, registerFont } = require('canvas');

registerFont('./assets/font.ttf', { family: 'Supercell' });

const { Colors, Bars } = require(join(__dirname, '..', 'util', 'constants.js'));
const { round } = require(join(__dirname, '..', 'util', 'functions.js'));

module.exports = class {
    static async banner(clan) {
        const canvas = createCanvas(700, 300);
        const ctx = canvas.getContext('2d');

        const banner = await loadImage(join(__dirname, '../..', 'assets', 'banner.png'));
        const badge = await loadImage(clan.badgeUrls.medium);

        ctx.drawImage(banner, 0, 0);
        ctx.drawImage(badge, 10, 50);
        await this.bars(ctx, clan);

        return new MessageAttachment(canvas.toBuffer(), 'banner.png');
    }

    static async bars(ctx, clan, war) {
        const barWidth = 400;
        const barHeight = 50;

        const reflectionWidth = barWidth * 0.97;
        const reflectionHeight = barHeight / 2;

        const radius = 15;

        const x = 260;
        let i = 0;

        for (const [type, bar] of Object.entries(Bars)) {
            const y = i * 90 + 40;

            ctx.lineWidth = 3;
            this.roundRectangle(ctx, x, y, barWidth, barHeight, radius);
            ctx.stroke();

            // Apply tint
            this.roundRectangle(ctx, x, y, barWidth, barHeight, radius);

            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fill();

            // Fill bar based on stats
            let multiplier;
            let max;
            let text;

            if (type === 'Star') {
                max = clan.members.length * 3;
                multiplier = clan.stars / max;
                text = clan.stars;
            } if (type === 'Destruction') {
                max = 100;
                multiplier = clan.destructionPercentage / max;
                text = `${round(clan.destructionPercentage)}%`;
            } if (type === 'Attack') {
                max = clan.members.length * war.cwl ? 1 : 2;
                multiplier = clan.attacks / max;
                text = clan.attacks;
            }

            this.roundRectangle(ctx, x, y, barWidth * multiplier, barHeight, radius);
            ctx.fillStyle = bar.COLOR;
            ctx.fill();

            // Apply reflection
            this.roundRectangle(ctx, x, y + barHeight * 0.1, reflectionWidth, reflectionHeight, radius);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.fill();

            const icon = await loadImage(bar.ICON);
            ctx.drawImage(icon, x - 50, y - icon.height / 4);

            // Making it 30px causes some characters to glitch for some reason
            ctx.font = '29px Supercell';
            this.drawStroked(ctx, text, 645, y + 38);

            i++;
        }
    }

    static drawStroked(ctx, text, x, y) {
        ctx.strokeStyle = Colors.BLACK;
        ctx.lineWidth = 5;
        ctx.textAlign = 'right';

        // https://stackoverflow.com/a/22259863
        ctx.lineJoin = 'miter';
        ctx.miterLimit = 2;
        ctx.lineJoin = 'round';

        ctx.strokeText(text, x, y);
        ctx.fillStyle = Colors.WHITE;
        ctx.fillText(text, x, y);
    }

    static roundRectangle(ctx, x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
        return ctx;
    }

    static sizedFont(canvas, text) {
        const ctx = canvas.getContext('2d');

        // Using Supercells font as the main with a fallback of sans-serif incase of special characters
        const font = 'Supercell, sans-serif';

        // Declare a base size of the font
        let fontSize = 14;

        // Max width of text
        const maxWidth = 170;

        ctx.fillStyle = Colors.WHITE;
        ctx.font = `${fontSize}px ${font}`;

        while (ctx.measureText(text).width > maxWidth) ctx.font = `${fontSize -= 1}px ${font}`;

        return ctx.font;
    }
};
