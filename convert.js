const fs = require('fs');
const path = require('path');

const areas = {};
const dungeons = {};
const monsters = {};
const items = {};

const csvFolder = './csv';

const csvFiles = fs
    .readdirSync(csvFolder)
    .filter(file => file.endsWith('.csv'));

function addUnique(array, value) {
    if (!array.includes(value)) {
        array.push(value);
    }
}

for (const file of csvFiles) {

    const content = fs.readFileSync(
        path.join(csvFolder, file),
        'utf8'
    );

    const lines = content
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line);

    let currentRegion = null;
    let currentDungeon = null;

    for (const line of lines) {

        const cols = line
            .split(',')
            .map(x => x.trim())
            .filter(Boolean);

        if (cols.length === 0) continue;

        const first = cols[0];

        //----------------------------------
        // 地域
        //----------------------------------

        if (
            first.startsWith('🏰') ||
            first.startsWith('🌿') ||
            first.startsWith('⚓️') ||
            first.startsWith('🏴󠁧󠁢󠁳󠁣󠁴󠁿') ||
            first.startsWith('🏚️') ||
            first.startsWith('🔨')
        ) {

            currentRegion = first
                .replace(/^[^\p{L}\p{N}ぁ-んァ-ヶ一-龠ー]+/u, '')
                .trim();

            if (!areas[currentRegion]) {

                areas[currentRegion] = {
                    dungeons: []
                };
            }

            continue;
        }

        //----------------------------------
        // ダンジョン
        //----------------------------------

        if (
            cols.length === 1 &&
            currentRegion
        ) {

            currentDungeon = first;

            if (!dungeons[currentDungeon]) {

                dungeons[currentDungeon] = {
                    region: currentRegion,
                    gathering: [],
                    monsters: []
                };
            }

            addUnique(
                areas[currentRegion].dungeons,
                currentDungeon
            );

            continue;
        }

        //----------------------------------
        // 採取
        //----------------------------------

        if (
            first === '採取' &&
            currentDungeon
        ) {

            const gatherItems = cols.slice(1);

            for (const itemName of gatherItems) {

                addUnique(
                    dungeons[currentDungeon].gathering,
                    itemName
                );

                if (!items[itemName]) {

                    items[itemName] = {
                        gather: {},
                        monsters: {}
                    };
                }

                if (
                    !items[itemName].gather[currentRegion]
                ) {

                    items[itemName].gather[currentRegion] = [];
                }

                addUnique(
                    items[itemName]
                        .gather[currentRegion],
                    currentDungeon
                );
            }

            continue;
        }

        //----------------------------------
        // モンスター
        //----------------------------------

        if (
            currentDungeon &&
            cols.length >= 2
        ) {

            const monsterName = cols[0];
            const drops = cols.slice(1);

            addUnique(
                dungeons[currentDungeon].monsters,
                monsterName
            );

            //------------------------------
            // monsters.json
            //------------------------------

            if (!monsters[monsterName]) {

                monsters[monsterName] = {
                    spawns: {},
                    drops: []
                };
            }

            if (
                !monsters[monsterName]
                    .spawns[currentRegion]
            ) {

                monsters[monsterName]
                    .spawns[currentRegion] = [];
            }

            addUnique(
                monsters[monsterName]
                    .spawns[currentRegion],
                currentDungeon
            );

            for (const drop of drops) {

                addUnique(
                    monsters[monsterName].drops,
                    drop
                );

                //--------------------------
                // items.json
                //--------------------------

                if (!items[drop]) {

                    items[drop] = {
                        gather: {},
                        monsters: {}
                    };
                }

                if (
                    !items[drop]
                        .monsters[monsterName]
                ) {

                    items[drop]
                        .monsters[monsterName] = [];
                }

                const exists =
                    items[drop]
                        .monsters[monsterName]
                        .some(
                            x =>
                                x.region === currentRegion &&
                                x.dungeon === currentDungeon
                        );

                if (!exists) {

                    items[drop]
                        .monsters[monsterName]
                        .push({
                            region: currentRegion,
                            dungeon: currentDungeon
                        });
                }
            }
        }
    }
}

fs.writeFileSync(
    './data/areas.json',
    JSON.stringify(
        areas,
        null,
        2
    ),
    'utf8'
);

fs.writeFileSync(
    './data/dungeons.json',
    JSON.stringify(
        dungeons,
        null,
        2
    ),
    'utf8'
);

fs.writeFileSync(
    './data/monsters.json',
    JSON.stringify(
        monsters,
        null,
        2
    ),
    'utf8'
);

fs.writeFileSync(
    './data/items.json',
    JSON.stringify(
        items,
        null,
        2
    ),
    'utf8'
);

console.log(
    `地域数: ${Object.keys(areas).length}`
);

console.log(
    `ダンジョン数: ${Object.keys(dungeons).length}`
);

console.log(
    `モンスター数: ${Object.keys(monsters).length}`
);

console.log(
    `アイテム数: ${Object.keys(items).length}`
);

console.log('変換完了');