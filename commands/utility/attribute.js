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

const MAX_SLOTS = 7;

// 入力形式を解析して、装備属性の配列に変換
function parseEquipment(input) {
    // 対応形式:
    // 火火木
    // 木×2 火
    // 木x2 火
    // 木*2 火
    // 1位 (平均120.00%) 木×2 火
    const pattern =
        /(火|水|氷|木|風|土|光|闇|音|星|無)\s*(?:[×xX*]\s*(\d+))?/gu;

    const matches = [...input.matchAll(pattern)];

    // 属性以外に、順位・平均倍率などの表示情報が含まれていてもよい。
    // ただし、属性以外の不明な文字列があればエラーにする。
    const remaining = input
        .replace(
            /(火|水|氷|木|風|土|光|闇|音|星|無)\s*(?:[×xX*]\s*\d+)?/gu,
            ''
        )
        .replace(/[\s\d.,()%％位平均:：]/gu, '');

    if (remaining.length > 0) {
        return {
            error:
                `入力形式を確認してください。\n` +
                `使用可能属性: ${ELEMENTS.join('、')}、無\n\n` +
                `入力例: 木×2 火 / 火火光光音無`
        };
    }

    if (matches.length === 0) {
        return {
            error:
                '属性を読み取れませんでした。\n' +
                '例: 木×2 火 / 火火光光音無'
        };
    }

    const equipment = [];

    for (const match of matches) {
        const element = match[1];
        const count = match[2] === undefined
            ? 1
            : Number(match[2]);

        if (!Number.isSafeInteger(count) || count < 1) {
            return {
                error: '属性の個数は1以上の整数で指定してください。'
            };
        }

        if (equipment.length + count > MAX_SLOTS) {
            return {
                error: `装備属性は合計1～${MAX_SLOTS}個で入力してください。`
            };
        }

        for (let i = 0; i < count; i++) {
            equipment.push(element);
        }
    }

    if (equipment.length < 1 || equipment.length > MAX_SLOTS) {
        return {
            error: `装備属性は合計1～${MAX_SLOTS}個で入力してください。`
        };
    }

    return { equipment };
}

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

module.exports = {
    data: new SlashCommandBuilder()
        .setName('attribute')
        .setDescription('属性被ダメージ倍率を計算します')
        .addStringOption(option =>
            option
                .setName('属性')
                .setDescription('例: 木×2 火 / 火火光光音無')
                .setRequired(true)
        ),

    async execute(interaction) {
        const input = interaction.options.getString('属性').trim();

        // 入力文字列を解析
        const parsed = parseEquipment(input);

        if (parsed.error) {
            return interaction.reply({
                content: parsed.error,
                flags: MessageFlags.Ephemeral
            });
        }

        const equipment = parsed.equipment;
        const counts = countElements(equipment);
        const results = [];

        // 全10属性に対する被ダメージ倍率を計算
        for (const element of ELEMENTS) {
            const value = calculateDamage(element, counts);
            results.push({ element, value });
        }

        // 被ダメージ倍率が高い順に表示
        results.sort((a, b) => b.value - a.value);

        const resultText = results.map(r =>
            `・${r.element}属性 : ${(r.value * 100).toFixed(2)}%`
        ).join('\n');

        const embed = new EmbedBuilder()
            .setTitle('属性被ダメージ倍率')
            .setDescription(`装備属性\n${equipment.join('')}`)
            .addFields({
                name: '結果',
                value: resultText
            })
            .setThumbnail(
                'https://i.gyazo.com/8284604f7635d53143b1685a82210ec3.png'
            );

        await interaction.reply({
            embeds: [embed]
        });
    }
};