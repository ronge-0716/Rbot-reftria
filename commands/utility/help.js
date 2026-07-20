const {
    SlashCommandBuilder,
    EmbedBuilder,
    MessageFlags
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('コマンド一覧を表示します'),

    async execute(interaction) {

        const embed = new EmbedBuilder()
            .setTitle('REFBOT Help')
            .setDescription(
                'REFTRIAライフを便利にすることを目指したbotツールです'
            )

            .addFields(
                {
                    name: '/search',
                    value:
                        'アイテムの入手場所を検索\n例: `/search item:コケ`'
                },
                {
                    name: '/monster',
                    value:
                        'モンスターの出現場所を検索\n例: `/monster monster:ウサギ`'
                },
                {
                    name: '/attribute',
                    value:
                        '属性被ダメージ倍率を計算\n例: `/attribute 属性:火火光光音無`'
                },
                {
                    name: '/recipe',
                    value:
                        'レシピを検索\n例: `/recipe recipe:ロッド`'
                },
                {
                    name: '/usedin',
                    value:
                        'アイテムの使用先を検索\n例: `/usedin item:コケ`'
                },
                {
                    name: '/dungeon',
                    value:
                        'ダンジョンの情報を検索\n例: `/dungeon dungeon:珊瑚の祠`'
                },
                {
                    name: '/selector (「リフペ」と発言でも可)',
                    value:
                        'コマンド選択のボタンを表示'
                },
                {
                    name: '/searcharmor',
                    value: '防具数、敵の属性を入れることで防具の属性の組み合わせを被ダメ倍率が低い順に10件並べて表示します\n敵の属性は複数対応、同じ属性を複数入れることでその属性の重みを増やせます'
                },
                {
                    name: '/help',
                    value:
                        'このヘルプを表示'
                }
            )

            .setFooter({
                text:
                    '要望・問い合わせはろんげにお願いします'
            });

        await interaction.reply({
            embeds: [embed]
        });
    }
};