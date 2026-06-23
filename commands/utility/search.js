const {
SlashCommandBuilder,
EmbedBuilder
} = require('discord.js');

const dropData = require('../../data.json');

module.exports = {
data: new SlashCommandBuilder()
.setName('search')
.setDescription('アイテムの入手場所を検索します')
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
    matches = Object.keys(dropData)
        .filter(name =>
            name.toLowerCase() ===
            searchWord.toLowerCase()
        );

    // 前方一致
    if (matches.length === 0) {

        matches = Object.keys(dropData)
            .filter(name =>
                name.toLowerCase()
                    .startsWith(
                        searchWord.toLowerCase()
                    )
            );
    }

    // 部分一致
    if (matches.length === 0) {

        matches = Object.keys(dropData)
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
            ephemeral: true
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
            ephemeral: true
        });
    }

    const itemName = matches[0];
    const item = dropData[itemName];

    let areaText = '';

    const monsterSet = new Set();

    for (const [map, area]
        of Object.entries(item.areas)) {

        areaText += `【${map}】\n`;

        areaText +=
            `採取 ${
                area.gatherable
                    ? '○'
                    : '×'
            }\n`;

        areaText +=
            area.locations.length
                ? area.locations
                    .sort()
                    .map(x => `・${x}`)
                    .join('\n')
                : '場所情報なし';

        areaText += '\n';

        if (
            area.monsters &&
            area.monsters.length
        ) {

            areaText +=
                'ドロップ:\n';

            areaText +=
                area.monsters
                    .sort()
                    .map(x => `・${x}`)
                    .join('\n');

            area.monsters
                .forEach(monster =>
                    monsterSet.add(monster)
                );
        }

        areaText += '\n\n';
    }

    const memoText =
        item.memos?.length
            ? item.memos.join('\n')
            : 'なし';

    const monsterText =
        monsterSet.size
            ? [...monsterSet]
                .sort()
                .map(x => `・${x}`)
                .join('\n')
            : 'なし';

    const embed =
        new EmbedBuilder()
            .setTitle(itemName)
            .addFields(
                {
                    name: '入手情報',
                    value: areaText
                },
                {
                    name: 'ドロップモンスター一覧',
                    value: monsterText
                },
            )
            .setTimestamp();

    await interaction.reply({
        embeds: [embed]
    });
}

};
