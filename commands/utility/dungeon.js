const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const loadJson = require("../../utils/load");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("dungeon")
        .setDescription("ダンジョン情報を表示")
        .addStringOption(option =>
            option
                .setName("name")
                .setDescription("ダンジョン名")
                .setRequired(true)
                .setAutocomplete(true)
        ),

    async autocomplete(interaction) {

        const focused = interaction.options
            .getFocused()
            .toLowerCase();

        const dungeons = new Set();

        Object.values(monsters).forEach(monster => {

            if (!monster.spawns) return;

            for (const dungeonList of Object.values(monster.spawns)) {

                dungeonList.forEach(dungeon => {
                    dungeons.add(dungeon);
                });

            }

        });

        const choices = [...dungeons]
            .filter(name =>
                name.toLowerCase().includes(focused)
            )
            .sort((a, b) => a.localeCompare(b, "ja"))
            .slice(0, 25);

        await interaction.respond(
            choices.map(name => ({
                name,
                value: name
            }))
        );

    },

    async execute(interaction) {

        const monsters = loadJson("monsters.json");

        const keyword = interaction.options
            .getString("name")
            .trim()
            .toLowerCase();

        const dungeonNames = new Set();

        Object.values(monsters).forEach(monster => {

            if (!monster.spawns) return;

            for (const dungeonList of Object.values(monster.spawns)) {

                dungeonList.forEach(dungeon => {
                    dungeonNames.add(dungeon);
                });

            }

        });

        const matches = [...dungeonNames]
            .filter(name =>
                name.toLowerCase().includes(keyword)
            );

        if (matches.length === 0) {

            return interaction.reply({
                content: "該当するダンジョンが見つかりませんでした。",
                ephemeral: true
            });

        }

        if (matches.length > 1) {

            const embed = new EmbedBuilder()
                .setTitle("複数の候補が見つかりました")
                .setDescription(
                    matches
                        .sort((a, b) => a.localeCompare(b, "ja"))
                        .map(x => `・${x}`)
                        .join("\n")
                );

            return interaction.reply({
                embeds: [embed],
                ephemeral: true
            });

        }

        const dungeon = matches[0];

        const monsterList = [];
        const dropSet = new Set();

        for (const [monsterName, monster] of Object.entries(monsters)) {

            if (!monster.spawns) continue;

            let exists = false;

            for (const dungeonList of Object.values(monster.spawns)) {

                if (dungeonList.includes(dungeon)) {

                    exists = true;
                    break;

                }

            }

            if (!exists) continue;

            monsterList.push(monsterName);

            if (monster.drops) {

                monster.drops.forEach(item => {
                    dropSet.add(item);
                });

            }

        }

        monsterList.sort((a, b) => a.localeCompare(b, "ja"));

        const dropList = [...dropSet]
            .sort((a, b) => a.localeCompare(b, "ja"));

        const embed = new EmbedBuilder()
            .setTitle(dungeon)
            .addFields(
                {
                    name: `▼出現モンスター`,
                    value:
                        monsterList.length
                            ? monsterList.map(x => `・${x}`).join("\n")
                            : "なし"
                },
                {
                    name: `▼ドロップアイテム`,
                    value:
                        dropList.length
                            ? dropList.map(x => `・${x}`).join("\n")
                            : "なし"
                }
            );

        await interaction.reply({
            embeds: [embed]
        });

    }

};