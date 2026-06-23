const {
    SlashCommandBuilder,
    EmbedBuilder,
    MessageFlags
} = require('discord.js');

const itemData =
    require('../../dates/items.json');

const areaData =
    require('../../dates/areas.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('search')
        .setDescription(
            'アイテムの入手場所を検索します'
        )
        .addStringOption(option =>
            option
                .setName('item')
                .setDescription('アイテム名')
                .setRequired(true)
        ),

    async execute(interaction) {

        const searchWord =
            interaction.options
                .getString('item')
                .trim();

        let matches = [];

        // 完全一致
        matches = Object.keys(itemData)
            .filter(name =>
                name.toLowerCase() ===
                searchWord.toLowerCase()
            );

        // 前方一致
        if (matches.length === 0) {

            matches = Object.keys(itemData)
                .filter(name =>
                    name.toLowerCase()
                        .startsWith(
                            searchWord.toLowerCase()
                        )
                );
        }

        // 部分一致
        if (matches.length === 0) {

            matches = Object.keys(itemData)
                .filter(name =>
                    name.toLowerCase()
                        .includes(
                            searchWord.toLowerCase()
                        )
                );
        }

        // 見つからない
        if (matches.length === 0) {

            return interaction.reply({
                content:
                    `「${searchWord}」の情報は見つかりませんでした。`,
                flags: MessageFlags.Ephemeral
            });
        }

        // 複数候補
        if (matches.length > 1) {

            const embed =
                new EmbedBuilder()
                    .setTitle(
                        '候補が複数見つかりました'
                    )
                    .setDescription(
                        matches
                            .slice(0, 25)
                            .map(x => `・${x}`)
                            .join('\n')
                    );

            return interaction.reply({
                embeds: [embed],
                flags: MessageFlags.Ephemeral
            });
        }

        const itemName = matches[0];
        const item = itemData[itemName];

        //--------------------------------
        // 地域→ダンジョン単位へ変換
        //--------------------------------

        const dungeonMap = {};

        // 採取情報
        for (const [region, dungeons]
            of Object.entries(item.gather || {})) {

            if (!dungeonMap[region]) {

                dungeonMap[region] = {};
            }

            for (const dungeon of dungeons) {

                if (
                    !dungeonMap[region][dungeon]
                ) {

                    dungeonMap[region][dungeon] = {
                        gather: true,
                        monsters: []
                    };
                }

                dungeonMap[region][dungeon].gather =
                    true;
            }
        }

        // ドロップ情報
        for (const [monster, spawns]
            of Object.entries(
                item.monsters || {}
            )) {

            for (const spawn of spawns) {

                if (
                    !dungeonMap[
                        spawn.region
                    ]
                ) {

                    dungeonMap[
                        spawn.region
                    ] = {};
                }

                if (
                    !dungeonMap[
                        spawn.region
                    ][spawn.dungeon]
                ) {

                    dungeonMap[
                        spawn.region
                    ][spawn.dungeon] = {
                        gather: false,
                        monsters: []
                    };
                }

                dungeonMap[
                    spawn.region
                ][
                    spawn.dungeon
                ].monsters.push(monster);
            }
        }

        //--------------------------------
        // 表示生成
        //--------------------------------

        let areaText = '';

        for (const region of Object.keys(areaData)) {

            const dungeons =
                dungeonMap[region];

            if (!dungeons) continue;

            areaText += `【${region}】\n`;

            const orderedDungeons =
                areaData[region].dungeons;

            // areas.jsonの順番
            for (const dungeon of orderedDungeons) {

                const info =
                    dungeons[dungeon];

                if (!info) continue;

                areaText +=
                    `${dungeon}\n`;

                areaText +=
                    `採取 ${
                        info.gather
                            ? '○'
                            : '×'
                    }\n`;

                if (
                    info.monsters.length
                ) {

                    areaText +=
                        'ドロップ\n';

                    areaText +=
                        [...new Set(
                            info.monsters
                        )]
                            .sort((a, b) =>
                                a.localeCompare(
                                    b,
                                    'ja'
                                )
                            )
                            .map(x =>
                                `・${x}`
                            )
                            .join('\n');
                }

                areaText += '\n\n';
            }

            // areas.jsonに無いダンジョン
            const remainingDungeons =
                Object.keys(dungeons)
                    .filter(d =>
                        !orderedDungeons.includes(d)
                    )
                    .sort((a, b) =>
                        a.localeCompare(
                            b,
                            'ja'
                        )
                    );

            for (const dungeon of remainingDungeons) {

                const info =
                    dungeons[dungeon];

                areaText +=
                    `${dungeon}\n`;

                areaText +=
                    `採取 ${
                        info.gather
                            ? '○'
                            : '×'
                    }\n`;

                if (
                    info.monsters.length
                ) {

                    areaText +=
                        'ドロップ\n';

                    areaText +=
                        [...new Set(
                            info.monsters
                        )]
                            .sort((a, b) =>
                                a.localeCompare(
                                    b,
                                    'ja'
                                )
                            )
                            .map(x =>
                                `・${x}`
                            )
                            .join('\n');
                }

                areaText += '\n\n';
            }
        }

        //--------------------------------
        // モンスター一覧
        //--------------------------------

        const monsterText =
            Object.keys(
                item.monsters || {}
            ).length
                ? Object.keys(
                    item.monsters
                )
                    .sort((a, b) =>
                        a.localeCompare(
                            b,
                            'ja'
                        )
                    )
                    .map(x => `・${x}`)
                    .join('\n')
                : 'なし';

        //--------------------------------
        // Embed
        //--------------------------------

        const embed =
            new EmbedBuilder()
                .setTitle(itemName)
                .addFields(
                    {
                        name: '入手情報',
                        value:
                            areaText ||
                            '情報なし'
                    },
                    {
                        name:
                            'ドロップモンスター一覧',
                        value:
                            monsterText
                    }
                )
                .setTimestamp();

        await interaction.reply({
            embeds: [embed]
        });
    }
};