const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const recipes = require("../../data/recipes.json");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("recipe")
        .setDescription("レシピを検索")
        .addStringOption(option =>
            option
                .setName("item")
                .setDescription("アイテム名を入力")
                .setRequired(true)
                .setAutocomplete(true)
        ),

    async autocomplete(interaction) {

        const focused = interaction.options.getFocused().toLowerCase();

        const choices = Object.keys(recipes)
            .filter(name =>
                name.toLowerCase().includes(focused)
            )
            .slice(0, 25);

        await interaction.respond(
            choices.map(name => ({
                name,
                value: name
            }))
        );

    },

    async execute(interaction) {

        const keyword = interaction.options
            .getString("item")
            .trim();

        let targetName = Object.keys(recipes)
            .find(name => name === keyword);

        if (!targetName) {

            const matches = Object.keys(recipes)
                .filter(name =>
                    name.toLowerCase()
                        .includes(keyword.toLowerCase())
                );

            if (matches.length === 0) {

                return interaction.reply({
                    content: "該当するレシピが見つかりませんでした。",
                    ephemeral: true
                });

            }

            if (matches.length > 1) {

                const embed = new EmbedBuilder()
                    .setTitle("複数の候補が見つかりました")
                    .setDescription(
                        matches
                            .map(x => `• ${x}`)
                            .join("\n")
                    );

                return interaction.reply({
                    embeds: [embed],
                    ephemeral: true
                });

            }

            targetName = matches[0];

        }

        const recipe = recipes[targetName];

        if (!recipe.recipes || recipe.recipes.length === 0) {

            return interaction.reply({
                content: "このアイテムにはレシピが登録されていません。",
                ephemeral: true
            });

        }

        const fields = [
            {
                name: "生成物",
                value: String(recipe.output),
                inline: true
            }
        ];

        recipe.recipes.forEach((materials, index) => {

            const name = index === 0? "レシピ" : `レシピ${index + 1}`;

            fields.push({
                name: name,
                value: materials
                    .map(mat => `${mat.item} ×${mat.count}`)
                    .join("\n")
            });
        });

        const materialsFields = [];

        recipe.recipes.forEach((oneRecipe, index) => {
            const result = {};

            for (const material of oneRecipe) {
                expand(
                    material.item,
                    material.count,
                    result
                );
            }

            const text = Object.entries(result)
                .sort((a, b) => a[0].localeCompare(b[0], "ja"))
                .map(([item, count]) => `${item} ×${count}`)
                .join("\n");

            const name = index === 0? "必要素材" : `必要素材（レシピ${index + 1}）`;

            materialsFields.push({
                name: name,
                value: text || "なし"
            });
        });

        const embed = new EmbedBuilder()
            .setTitle(targetName)
            .addFields(fields)
            //.addFields({name:"\n 必要素材", value:""})
            .addFields(materialsFields);

        function expand(itemName, count, result) {
            const data = recipes[itemName];

            if (!data || !data.recipes || data.recipes.length === 0) {
                result[itemName] = (result[itemName] || 0) + count;
                return;
            }

            const recipeData = data.recipes[0];
            const output = data.output || 1;
            const multiplier = count / output;

            for (const material of recipeData) {
                expand(
                    material.item,
                    material.count * multiplier,
                    result
                );
            }
        }

        await interaction.reply({
            embeds: [embed]
        });
    }

};
