const {
    SlashCommandBuilder,
    EmbedBuilder,
    MessageFlags,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
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

// 装備属性の組み合わせを生成
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

        if (targets.length === 0) {
            return interaction.reply({
                content: '敵属性を入力してください。',
                flags: MessageFlags.Ephemeral
            });
        }

        const invalid = targets.find(
            element => !ELEMENTS.includes(element)
        );

        if (invalid) {
            return interaction.reply({
                content:
                    `不明な属性です: ${invalid}\n` +
                    `使用可能属性: ${ELEMENTS.join('、')}`,
                flags: MessageFlags.Ephemeral
            });
        }

        const combinations = generateCombinations(slotCount);

        const evaluated = combinations.map(combo => {
            const counts = countElements(
                ELEMENTS.flatMap(element =>
                    Array(combo[element] || 0).fill(element)
                )
            );

            let total = 0;

            for (const target of targets) {
                total += calculateDamage(target, counts);
            }

            return {
                combo,
                average: total / targets.length
            };
        });

        // 平均被ダメージ倍率が低い順
        evaluated.sort((a, b) => a.average - b.average);

        const top = evaluated.slice(0, 10);

        const lines = top.map((result, index) => {
            const equipment = ELEMENTS
                .filter(element => result.combo[element] > 0)
                .map(element =>
                    result.combo[element] === 1
                        ? element
                        : `${element}×${result.combo[element]}`
                )
                .join(' ');

            return (
                `${index + 1}位 ` +
                `(平均${(result.average * 100).toFixed(2)}%) ` +
                `${equipment}`
            );
        });

        // 1つの構成につき1つのボタンを生成
        const buttons = top.map((result, index) => {
            // 属性の順番に10桁の数字で個数を保存
            // 例: 火0、水2、氷0、木2 ... → 0202...
            const comboCode = ELEMENTS
                .map(element => result.combo[element] || 0)
                .join('');

            return new ButtonBuilder()
                .setCustomId(`searcharmor:attribute:${comboCode}`)
                .setLabel(`${index + 1}位：被ダメ計算`)
                .setStyle(ButtonStyle.Primary);
        });

        // 1行5個、合計2行
        const buttonRows = [];

        for (let i = 0; i < buttons.length; i += 5) {
            buttonRows.push(
                new ActionRowBuilder().addComponents(
                    buttons.slice(i, i + 5)
                )
            );
        }

        const embed = new EmbedBuilder()
            .setTitle('最適防具属性構成')
            .setDescription(
                `装備部位: ${slotCount}\n` +
                `敵属性: ${targets.join('')}\n\n` +
                lines.join('\n\n')
            );

        await interaction.reply({
            embeds: [embed],
            components: buttonRows
        });
    }
};