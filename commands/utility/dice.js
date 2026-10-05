const {
    SlashCommandBuilder
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dice')
        .setDescription('指定した数のダイスを振ります')
        .addStringOption(option =>
            option
                .setName('dice')
                .setDescription('例：2d6、3d20、1d100')
                .setRequired(true)
        ),

    async execute(interaction) {
        const input =
            interaction.options.getString('dice');

        // 「2d6」のような形式
        const match = input.match(
            /^(\d+)d(\d+)$/i
        );

        if (!match) {
            await interaction.reply({
                content:
                    '形式が正しくありません。\n例：`2d6`、`3d20`、`1d100`',
                ephemeral: true
            });
            return;
        }

        const count = Number(match[1]);
        const sides = Number(match[2]);

        // 不正な値を防止
        if (
            count < 1 ||
            sides < 2 ||
            count > 100 ||
            sides > 1000
        ) {
            await interaction.reply({
                content:
                    'ダイスの個数は1～100個、面数は2～1000面で指定してください。',
                ephemeral: true
            });
            return;
        }

        const results = [];

        for (let i = 0; i < count; i++) {
            const roll =
                Math.floor(
                    Math.random() * sides
                ) + 1;

            results.push(roll);
        }

        const total =
            results.reduce(
                (sum, value) => sum + value,
                0
            );

        await interaction.reply(
            `🎲 **${count}d${sides}** => ${total}`);
    }
};