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
    火: { weak: ['氷', '木', '闇'], resist: ['水', '土', '風'] },
    水: { weak: ['火', '土', '音'], resist: ['氷', '木', '星'] },
    氷: { weak: ['水', '木', '土'], resist: ['火', '光', '音'] },
    木: { weak: ['水', '土', '風'], resist: ['火', '氷', '闇'] },
    風: { weak: ['火', '闇', '星'], resist: ['木', '土', '音'] },
    土: { weak: ['火', '光', '風'], resist: ['水', '木', '氷'] },
    光: { weak: ['水', '闇', '星'], resist: ['火', '光', '木'] },
    闇: { weak: ['風', '木', '光'], resist: ['火', '闇', '星'] },
    音: { weak: ['氷', '闇', '風'], resist: ['土', '水', '星'] },
    星: { weak: ['水', '闇', '音'], resist: ['氷', '光', '風'] }
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
        const count = Math.min(counts[element] || 0, 3);
        multiplier *= Math.pow(1.7, count);
    }

    for (const element of rule.resist) {
        const count = Math.min(counts[element] || 0, 3);
        multiplier *= Math.pow(0.5, count);
    }

    return multiplier;
}

// 装備組み合わせ生成
function generateCombinations(slotCount) {
    const results = [];

    function dfs(index, remaining, current) {
        if (index === ELEMENTS.length - 1) {
            current[ELEMENTS[index]] = remaining;
            results.push({ ...current });
            return;
        }

        for (let i = 0; i <= remaining; i++) {
            current[ELEMENTS[index]] = i;
            dfs(index + 1, remaining - i, current);
        }
    }

    dfs(0, slotCount, {});
    return results;
}

// 表示用
function formatCombination(combo) {
    return ELEMENTS
        .filter(e => combo[e] > 0)
        .map(e => `${e}×${combo[e]}`)
        .join(' ');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('searcharmor')
        .setDescription('敵属性に対する防具属性構成を検索します')
        .addIntegerOption(option =>
            option
                .setName('部位')
                .setDescription('装備部位数（6または7）')
                .setRequired(true)
                .addChoices(
                    { name: '6', value: 6 },
                    { name: '7', value: 7 }
                )
        )
        .addStringOption(option =>
            option
                .setName('敵属性')
                .setDescription('例: 火土 / 火火土 / 水氷風')
                .setRequired(true)
        ),

    async execute(interaction) {

        const slotCount = interaction.options.getInteger('部位');
        const input = interaction.options.getString('敵属性').trim();

        const targets = [...input];

        const invalid = targets.find(x => !ELEMENTS.includes(x));

        if (invalid) {
            return interaction.reply({
                content:
                    `不明な属性です: ${invalid}\n使用可能属性: ${ELEMENTS.join('、')}`,
                flags: MessageFlags.Ephemeral
            });
        }

        const combinations = generateCombinations(slotCount);

        const evaluated = combinations.map(combo => {

            const counts = combo;

            const damages = {};

            let total = 0;

            for (const target of targets) {
                const value = calculateDamage(target, counts);
                damages[target] = (damages[target] || []).concat(value);
                total += value;
            }

            return {
                combo,
                average: total / targets.length,
                damages
            };
        });

        evaluated.sort((a, b) => a.average - b.average);

        const top = evaluated.slice(0, 10);

        const lines = top.map((x, i) => {

            const equip = ELEMENTS
                .filter(e => x.combo[e] > 0)
                .map(e =>
                    x.combo[e] === 1
                        ? e
                        : `${e}×${x.combo[e]}`
                )
                .join(" ");

            const shown = [...new Set(targets)];

            // const detail = shown
            //     .map(element => {

            //         const arr = x.damages[element];
            //         const avg =
            //             arr.reduce((a, b) => a + b, 0) / arr.length;

            //         return `${element}:${(avg * 100).toFixed(2)}%`;

            //     })
            //     .join(" ");
            const detail = "";

            return `${i + 1}位 (平均${(x.average * 100).toFixed(2)}%) ${equip}　${detail}`;

        });

        const embed = new EmbedBuilder()
            .setTitle("最適防具属性構成")
            .setDescription(
                `装備部位: ${slotCount}\n敵属性: ${targets.join("")}\n\n${lines.join("\n\n")}`
            );

        await interaction.reply({
            embeds: [embed]
        });
    }
};