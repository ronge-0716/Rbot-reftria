const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    MessageFlags
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('selector')
        .setDescription('ボタンとモーダルでコマンドを選択して実行します。'),

    async execute(interaction) {
        const ownerId = interaction.user.id;
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`selector:recipe:${ownerId}`)
                .setLabel('レシピ検索')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`selector:search:${ownerId}`)
                .setLabel('アイテム検索')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`selector:monster:${ownerId}`)
                .setLabel('モンスター検索')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`selector:attribute:${ownerId}`)
                .setLabel('属性検索')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`selector:usedin:${ownerId}`)
                .setLabel('使用先検索')
                .setStyle(ButtonStyle.Secondary)
        );

        const embed = new EmbedBuilder()
            .setTitle('コマンド選択')
            .setDescription('実行したいコマンドを選択してください。\n有効期限: 5分です。');

        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            await interaction.editReply({ embeds: [embed], components: [row] });
        } catch (error) {
            console.error(error);
            try {
                await interaction.user.send({ embeds: [embed], components: [row] });
            } catch (dmError) {
                console.error(dmError);
            }
        }
    }
};

