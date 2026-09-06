const fs = require("fs");
const path = require("path");

const csvPath = path.join(__dirname, "..", "csv", "recipes.csv");
const outputPath = path.join(__dirname, "..", "data", "recipes.json");

const text = fs.readFileSync(csvPath, "utf8");

const lines = text
    .split(/\r?\n/)
    .map(x => x.trim())
    .filter(x => x);

const recipes = {};

let first = true;

for (const line of lines) {

    if (first) {
        first = false;
        continue;
    }

    const cols = line.split(",").map(x => x.trim());

    const rawName = cols[0];
    const output = Number(cols[1]);
    const material = cols[2];
    const count = Number(cols[3]);

    let recipeIndex = 0;
    let product = rawName;

    const match = rawName.match(/^(.*?)([B-Z])$/);

    if (match) {

        product = match[1];

        recipeIndex =
            match[2].charCodeAt(0) -
            "B".charCodeAt(0) +
            1;

    }

    if (!recipes[product]) {

        recipes[product] = {
            output,
            recipes: []
        };

    }

    while (
        recipes[product].recipes.length <= recipeIndex
    ) {

        recipes[product].recipes.push([]);

    }

    recipes[product].recipes[recipeIndex].push({

        item: material,
        count

    });

}

fs.writeFileSync(

    outputPath,

    JSON.stringify(
        recipes,
        null,
        2
    ),

    "utf8"

);

console.log(
    `${Object.keys(recipes).length}件のレシピを書き出しました。`
);