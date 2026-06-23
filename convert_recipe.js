const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const recipes = {};

const csvFolder = './csv';

const csvFiles = fs
    .readdirSync(csvFolder)
    .filter(file => file.endsWith('.csv'));

let processed = 0;

for (const file of csvFiles) {

    fs.createReadStream(
        path.join(csvFolder, file)
    )
        .pipe(csv())

        .on('data', row => {

            const itemName =
                row['アイテム名']?.trim();

            if (!itemName) return;

            const rank =
                row['基礎ランク']?.trim() || '';

            const effect =
                row['効果']?.trim() || '';

            const recipe = [];

            for (const value of Object.values(row)) {

                if (
                    !value ||
                    typeof value !== 'string'
                ) continue;

                if (!value.includes('*'))
                    continue;

                const split =
                    value.split('*');

                if (split.length < 2)
                    continue;

                const material =
                    split[0].trim();

                const count =
                    Number(split[1]) || 1;

                recipe.push({
                    item: material,
                    count
                });
            }

            if (!recipes[itemName]) {

                recipes[itemName] = {
                    rank,
                    effect,
                    recipes: [],
                    usedIn: []
                };
            }

            recipes[itemName]
                .recipes
                .push(recipe);
        })

        .on('end', () => {

            processed++;

            if (
                processed !==
                csvFiles.length
            ) return;

            //----------------------------------
            // usedIn生成
            //----------------------------------

            for (
                const [itemName, data]
                of Object.entries(recipes)
            ) {

                for (
                    const recipe
                    of data.recipes
                ) {

                    for (
                        const material
                        of recipe
                    ) {

                        if (
                            !recipes[
                                material.item
                            ]
                        ) {

                            recipes[
                                material.item
                            ] = {
                                rank: '',
                                effect: '',
                                recipes: [],
                                usedIn: []
                            };
                        }

                        recipes[
                            material.item
                        ].usedIn.push(
                            itemName
                        );
                    }
                }
            }

            //----------------------------------
            // 重複削除
            //----------------------------------

            for (
                const data
                of Object.values(
                    recipes
                )
            ) {

                data.usedIn =
                    [
                        ...new Set(
                            data.usedIn
                        )
                    ].sort();
            }

            fs.writeFileSync(
                './dates/recipes.json',
                JSON.stringify(
                    recipes,
                    null,
                    2
                ),
                'utf8'
            );

            console.log(
                `${Object.keys(recipes).length}件のレシピを保存しました`
            );
        });
}