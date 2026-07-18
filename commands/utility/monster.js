const {
    SlashCommandBuilder,
    EmbedBuilder,
    MessageFlags
} = require('discord.js');

const loadJson = require("../../utils/load");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('monster')
        .setDescription(
            'モンスターの出現場所を検索します'
        )
        .addStringOption(option =>
            option
                .setName('name')
                .setDescription('モンスター名')
                .setRequired(true)
        ),

    async execute(interaction) {

        const monsters = loadJson("monsters.json");
        const areas = loadJson("areas.json");

        const searchWord =
            interaction.options
                .getString('name')
                .trim();

        let matches = [];

        // 完全一致
        matches = Object.keys(monsters)
            .filter(name =>
                name.toLowerCase() ===
                searchWord.toLowerCase()
            );

        // 前方一致
        if (matches.length === 0) {

            matches = Object.keys(monsters)
                .filter(name =>
                    name.toLowerCase()
                        .startsWith(
                            searchWord.toLowerCase()
                        )
                );
        }

        // 部分一致
        if (matches.length === 0) {

            matches = Object.keys(monsters)
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

        // 候補複数
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

        const monsterName =
            matches[0];

        const monster =
            monsters[monsterName];

        let areaText = '';

        //--------------------------------
        // areas.json順で表示
        //--------------------------------

        for (const region of Object.keys(areas)) {

            const spawnDungeons =
                monster.spawns?.[region];

            if (
                !spawnDungeons ||
                spawnDungeons.length === 0
            ) {
                continue;
            }

            areaText +=
                `【${region}】\n`;

            const orderedDungeons =
                areas[region].dungeons;

            // areas.jsonに登録された順
            for (const dungeon of orderedDungeons) {

                if (
                    !spawnDungeons.includes(
                        dungeon
                    )
                ) {
                    continue;
                }

                areaText +=
                    `・${dungeon}\n`;
            }

            // areas.jsonに無いダンジョン対策
            const remaining =
                spawnDungeons
                    .filter(d =>
                        !orderedDungeons.includes(
                            d
                        )
                    )
                    .sort((a, b) =>
                        a.localeCompare(
                            b,
                            'ja'
                        )
                    );

            for (const dungeon of remaining) {

                areaText +=
                    `・${dungeon}\n`;
            }

            areaText += '\n';
        }

        //--------------------------------
        // ドロップアイテム
        //--------------------------------

        const dropText =
            monster.drops?.length
                ? [...new Set(
                    monster.drops
                )]
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
                .setTitle(monsterName)
                .addFields(
                    {
                        name: '出現場所',
                        value:
                            areaText ||
                            '情報なし'
                    },
                    {
                        name:
                            'ドロップアイテム',
                        value:
                            dropText
                    }
                )
                .setTimestamp();

        await interaction.reply({
            embeds: [embed]
        });
    }
};