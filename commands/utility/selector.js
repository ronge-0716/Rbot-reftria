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
        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`selector:recipe:${ownerId}`)
                .setLabel('レシピ検索')
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId(`selector:search:${ownerId}`)
                .setLabel('アイテムドロップ検索')
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId(`selector:monster:${ownerId}`)
                .setLabel('モンスター検索')
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId(`selector:attribute:${ownerId}`)
                .setLabel('属性計算')
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId(`selector:usedin:${ownerId}`)
                .setLabel('アイテム使用先検索')
                .setStyle(ButtonStyle.Secondary)
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`selector:dungeon:${ownerId}`)
                .setLabel('ダンジョン情報')
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId(`selector:searcharmor:${ownerId}`)
                .setLabel('防具組み合わせ例')
                .setStyle(ButtonStyle.Secondary)
        );

        const embed = new EmbedBuilder()
            .setTitle('コマンド選択')
            .setDescription('実行したいコマンドを選択してください。\n有効期限: 5分です。');

        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            await interaction.editReply({
                embeds: [embed],
                components: [row1, row2]
            });
        } catch (error) {
            console.error(error);
        }
    }
};

