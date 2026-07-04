const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const recipes = require("../../data/recipes.json");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("usedin")
        .setDescription("素材から作成可能アイテムを検索")
        .addStringOption(option =>
            option
                .setName("item")
                .setDescription("素材名")
                .setRequired(true)
                .setAutocomplete(true)
        ),

    async autocomplete(interaction) {

        const focused = interaction.options
            .getFocused()
            .toLowerCase();

        const materials = new Set();

        for (const recipe of Object.values(recipes)) {

            for (const list of recipe.recipes) {

                for (const mat of list) {

                    materials.add(mat.item);

                }

            }

        }

        const choices = [...materials]
            .filter(x =>
                x.toLowerCase().includes(focused)
            )
            .slice(0, 25);

        await interaction.respond(

            choices.map(x => ({
                name: x,
                value: x
            }))

        );

    },

    async execute(interaction) {

        const keyword = interaction.options
            .getString("item")
            .trim();

        //----------------------------------
        // 使用先検索
        //----------------------------------

        const result = [];

        for (const [itemName, recipe] of Object.entries(recipes)) {

            let found = false;

            for (const materials of recipe.recipes) {

                if (
                    materials.some(x => x.item === keyword)
                ) {

                    found = true;
                    break;

                }

            }

            if (found) {

                result.push(itemName);

            }

        }

        if (result.length === 0) {

            return interaction.reply({

                content: "その素材を使用するレシピはありません。",

                ephemeral: true

            });

        }

        const embed = new EmbedBuilder()

            .setTitle(`${keyword} を使用するアイテム`)

            .setDescription(
                result
                    .sort()
                    .map(x => `・${x}`)
                    .join("\n")
            );

        await interaction.reply({

            embeds: [embed]

        });

    }

};