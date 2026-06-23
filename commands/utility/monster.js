const {
SlashCommandBuilder,
EmbedBuilder
} = require('discord.js');

const dropData = require('../../data.json');

const monsterData = {};

for (const item of Object.values(dropData)) {


for (const [map, area] of Object.entries(item.areas)) {

    for (const monster of area.monsters) {

        if (!monsterData[monster]) {

            monsterData[monster] = {
                areas: {}
            };
        }

        if (!monsterData[monster].areas[map]) {

            monsterData[monster].areas[map] = new Set();
        }

        area.locations.forEach(location => {

            monsterData[monster]
                .areas[map]
                .add(location);
        });
    }
}

}

module.exports = {
data: new SlashCommandBuilder()
.setName('monster')
.setDescription('モンスターの出現場所を検索します')
.addStringOption(option =>
option
.setName('name')
.setDescription('モンスター名')
.setRequired(true)
),

async execute(interaction) {

    const searchWord =
        interaction.options.getString('name').trim();

    let matches = [];

    matches = Object.keys(monsterData)
        .filter(name =>
            name.toLowerCase() ===
            searchWord.toLowerCase()
        );

    if (matches.length === 0) {

        matches = Object.keys(monsterData)
            .filter(name =>
                name.toLowerCase()
                    .startsWith(
                        searchWord.toLowerCase()
                    )
            );
    }

    if (matches.length === 0) {

        matches = Object.keys(monsterData)
            .filter(name =>
                name.toLowerCase()
                    .includes(
                        searchWord.toLowerCase()
                    )
            );
    }

    if (matches.length === 0) {

        return interaction.reply({
            content:
                `「${searchWord}」の情報は見つかりませんでした。`,
            ephemeral: true
        });
    }

    if (matches.length > 1) {

        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle(
                        '候補が複数見つかりました'
                    )
                    .setDescription(
                        matches
                            .map(x => `・${x}`)
                            .join('\n')
                    )
            ],
            ephemeral: true
        });
    }

    const monster =
        monsterData[matches[0]];

    let areaText = '';

    for (const [map, locations]
        of Object.entries(monster.areas)) {

        areaText += `【${map}】\n`;

        areaText += [...locations]
            .sort()
            .map(x => `・${x}`)
            .join('\n');

        areaText += '\n\n';
    }

    const embed =
        new EmbedBuilder()
            .setTitle(matches[0])
            .addFields({
                name: '出現場所',
                value: areaText || 'なし'
            });

    await interaction.reply({
        embeds: [embed]
    });
}

};
