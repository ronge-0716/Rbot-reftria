const fs = require('node:fs');
const path = require('node:path');

const {
    SlashCommandBuilder,
    EmbedBuilder,
    MessageFlags
} = require('discord.js');

const MONSTERS_PATH =
    path.join(__dirname, '../../data/monsters.json');

const AREAS_PATH =
    path.join(__dirname, '../../data/areas.json');

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

        // 毎回最新のJSONを読み込む
        const monsters =
            JSON.parse(
                fs.readFileSync(
                    MONSTERS_PATH,
                    'utf8'
                )
            );

        const areas =
            JSON.parse(
                fs.readFileSync(
                    AREAS_PATH,
                    'utf8'
                )
            );

        const searchWord =
            interaction.options
                .getString('name')
                .trim();

        let matches = [];

        //--------------------------------
        // 完全一致
        //--------------------------------
        matches = Object.keys(monsters)
            .filter(name =>
                name.toLowerCase() ===
                searchWord.toLowerCase()
            );

        //--------------------------------
        // 前方一致
        //--------------------------------
        if (matches.length === 0) {
            matches = Object.keys(monsters)
                .filter(name =>
                    name.toLowerCase()
                        .startsWith(
                            searchWord.toLowerCase()
                        )
                );
        }

        //--------------------------------
        // 部分一致
        //--------------------------------
        if (matches.length === 0) {
            matches = Object.keys(monsters)
                .filter(name =>
                    name.toLowerCase()
                        .includes(
                            searchWord.toLowerCase()
                        )
                );
        }

        //--------------------------------
        // 見つからない
        //--------------------------------
        if (matches.length === 0) {
            return interaction.reply({
                content:
                    `「${searchWord}」の情報は見つかりませんでした。`,
                flags: MessageFlags.Ephemeral
            });
        }

        //--------------------------------
        // 候補が複数
        //--------------------------------
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

        //--------------------------------
        // 出現場所
        //--------------------------------
        let areaText = '';

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
                `〖${region}〗\n`;

            const orderedDungeons =
                areas[region].dungeons || [];

            // areas.jsonの順番で表示
            for (const dungeon of orderedDungeons) {

                if (
                    spawnDungeons.includes(
                        dungeon
                    )
                ) {
                    areaText +=
                        `・${dungeon}\n`;
                }
            }

            // areas.jsonにないダンジョン
            const remaining =
                spawnDungeons
                    .filter(dungeon =>
                        !orderedDungeons.includes(
                            dungeon
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
        // HP
        //--------------------------------
        const hpText =
            monster.hp !== null &&
                monster.hp !== undefined
                ? String(monster.hp)
                : '未設定';

        //--------------------------------
        // 属性
        //--------------------------------
        const attributeText =
            monster.attribute
                ? monster.attribute
                : '未設定';

        //--------------------------------
        // ドロップ
        //--------------------------------
        const dropText =
            monster.drops?.length
                ? [...new Set(monster.drops)]
                    .sort((a, b) =>
                        a.localeCompare(
                            b,
                            'ja'
                        )
                    )
                    .map(
                        item =>
                            `・${item}`
                    )
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
                        name: 'HP',
                        value: hpText,
                        inline: true
                    },
                    {
                        name: '属性',
                        value: attributeText,
                        inline: true
                    },
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