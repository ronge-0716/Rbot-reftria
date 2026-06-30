const {
    SlashCommandBuilder,
    EmbedBuilder,
    MessageFlags
} = require('discord.js');

const ELEMENTS = [
    '火', '水', '氷', '木', '風',
    '土', '光', '闇', '音', '星'
];

const RULES = {
    火: {
        weak: ['氷', '木', '闇'],
        resist: ['水', '土', '風']
    },

    水: {
        weak: ['火', '土', '音'],
        resist: ['氷', '木', '星']
    },

    氷: {
        weak: ['水', '木', '土'],
        resist: ['火', '光', '音']
    },

    木: {
        weak: ['水', '土', '風'],
        resist: ['火', '氷', '闇']
    },

    風: {
        weak: ['火', '闇', '星'],
        resist: ['木', '土', '音']
    },

    土: {
        weak: ['火', '光', '風'],
        resist: ['水', '木', '氷']
    },

    光: {
        weak: ['水', '闇', '星'],
        resist: ['火', '光', '木']
    },

    闇: {
        weak: ['風', '木', '光'],
        resist: ['火', '闇', '星']
    },

    音: {
        weak: ['氷', '闇', '風'],
        resist: ['土', '水', '星']
    },

    星: {
        weak: ['水', '闇', '音'],
        resist: ['氷', '光', '風']
    }
};

function countElements(equipment) {

    const counts = {};

    for (const element of equipment) {

        if (element === '無') continue;

        counts[element] = (counts[element] || 0) + 1;
    }

    return counts;
}

function calculateDamage(targetElement, counts) {

    let multiplier = 1;

    const rule = RULES[targetElement];

    for (const element of rule.weak) {

        const count = Math.min(
            counts[element] || 0,
            3
        );

        multiplier *= Math.pow(
            1.7,
            count
        );
    }

    for (const element of rule.resist) {

        const count = Math.min(
            counts[element] || 0,
            3
        );

        multiplier *= Math.pow(
            0.5,
            count
        );
    }

    return multiplier;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('attribute')
        .setDescription('属性被ダメージ倍率を計算します')
        .addStringOption(option =>
            option
                .setName('属性')
                .setDescription('例: 火火光光音無')
                .setRequired(true)
        ),

    async execute(interaction) {

        const input =
            interaction.options.getString('属性');

        const equipment =
            [...input.trim()];

        if (equipment.length < 1 || equipment.length > 7) {

            return interaction.reply({
                content:
                    '属性は1～7文字入力してください。\n例: 火火光光音無 または 火火光',
                flags: MessageFlags.Ephemeral
            });
        }

        const invalid = equipment.find(
            x =>
                x !== '無' &&
                !ELEMENTS.includes(x)
        );

        if (invalid) {

            return interaction.reply({
                content:
                    `不明な属性です: ${invalid}\n\n使用可能属性\n${ELEMENTS.join('、')}、無`,
                flags: MessageFlags.Ephemeral
            });
        }

        const counts =
            countElements(equipment);

        const results = [];

        for (const element of ELEMENTS) {

            const value =
                calculateDamage(
                    element,
                    counts
                );

            results.push({
                element,
                value
            });
        }

        results.sort(
            (a, b) => b.value - a.value
        );

        const resultText =
            results
                .map((r, i) => {

                    let rank = '・';

                    return `${rank} ${r.element}属性 : ${(r.value * 100).toFixed(2)}%`;
                })
                .join('\n');

        const embed =
            new EmbedBuilder()
                .setTitle('属性被ダメージ倍率')
                .setDescription(
                    `装備属性\n${equipment.join('')}`
                )
                .addFields({
                    name: '結果',
                    value: resultText
                })
                .setThumbnail('https://i.gyazo.com/8284604f7635d53143b1685a82210ec3.png');

        await interaction.reply({
            embeds: [embed]
        });
    }
};