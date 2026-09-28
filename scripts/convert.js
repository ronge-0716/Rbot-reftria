const fs = require('node:fs');
const path = require('node:path');

const areas = {};
const dungeons = {};
const monsters = {};
const items = {};

const csvFolder = './csv';
const monsterDataFile = 'monster_data.csv';

const csvFiles = fs
    .readdirSync(csvFolder)
    .filter(
        file =>
            file.endsWith('.csv') &&
            file !== monsterDataFile
    );

function addUnique(array, value) {
    if (!array.includes(value)) {
        array.push(value);
    }
}

function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const next = text[i + 1];

        if (inQuotes) {
            if (char === '"' && next === '"') {
                field += '"';
                i++;
            } else if (char === '"') {
                inQuotes = false;
            } else {
                field += char;
            }
            continue;
        }

        if (char === '"') {
            inQuotes = true;
            continue;
        }

        if (char === ',') {
            row.push(field.trim());
            field = '';
            continue;
        }

        if (char === '\n') {
            row.push(field.trim());
            rows.push(row);
            row = [];
            field = '';
            continue;
        }

        if (char === '\r') {
            continue;
        }

        field += char;
    }

    if (field.length > 0 || row.length > 0) {
        row.push(field.trim());
        rows.push(row);
    }

    return rows;
}

function ensureItem(itemName) {
    if (!items[itemName]) {
        items[itemName] = {
            gather: {},
            monsters: {}
        };
    }

    return items[itemName];
}

function ensureDungeon(region, dungeonName) {
    if (!dungeons[dungeonName]) {
        dungeons[dungeonName] = {
            region,
            gathering: [],
            monsters: []
        };
    }

    if (!areas[region]) {
        areas[region] = {
            dungeons: []
        };
    }

    addUnique(
        areas[region].dungeons,
        dungeonName
    );

    return dungeons[dungeonName];
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
            first.startsWith('🌳') ||
            first.startsWith('🔮') ||
            first.startsWith('🕍') ||
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

            currentDungeon = null;
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

            ensureDungeon(
                currentRegion,
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
            const dungeonData =
                dungeons[currentDungeon];

            for (const itemName of gatherItems) {
                addUnique(
                    dungeonData.gathering,
                    itemName
                );

                const item = ensureItem(itemName);

                if (!item.gather[currentRegion]) {
                    item.gather[currentRegion] = [];
                }

                addUnique(
                    item.gather[currentRegion],
                    currentDungeon
                );
            }
        }
    }
}

function loadMonsterData() {
    const filePath =
        path.join(csvFolder, monsterDataFile);

    if (!fs.existsSync(filePath)) {
        throw new Error(
            `${filePath} が見つかりません。`
        );
    }

    const content = fs.readFileSync(
        filePath,
        'utf8'
    ).replace(/^\uFEFF/, '');

    const rows = parseCsv(content);

    if (rows.length < 5) {
        throw new Error(
            'モンスターデータCSVの行数が不足しています。'
        );
    }

    const header = rows[2] || [];
    const dungeonHeader = rows[3] || [];

    const nameIndex = header.indexOf('名称');
    const attributeIndex = header.indexOf('属性');
    const hpIndex = header.indexOf('HP');
    const dropsIndex = header.indexOf('ドロップ');
    const memoIndex = header.indexOf('メモ');
    const spawnStartIndex =
        memoIndex >= 0
            ? memoIndex + 1
            : 8;

    if (
        nameIndex === -1 ||
        attributeIndex === -1 ||
        hpIndex === -1 ||
        dropsIndex === -1
    ) {
        throw new Error(
            'モンスターデータCSVの必要な列（名称・属性・HP・ドロップ）が見つかりません。'
        );
    }

    let currentRegion = null;
    let spawnColumns = [];

    for (
        let columnIndex = spawnStartIndex;
        columnIndex < Math.max(header.length, dungeonHeader.length);
        columnIndex++
    ) {
        if (header[columnIndex]) {
            currentRegion = header[columnIndex];
        }

        const dungeon =
            dungeonHeader[columnIndex] || '';

        if (
            currentRegion &&
            dungeon
        ) {
            spawnColumns.push({
                index: columnIndex,
                region: currentRegion,
                dungeon
            });
        }
    }

    let loadedRows = 0;

    for (let rowIndex = 4; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];
        const monsterName =
            (row[nameIndex] || '').trim();

        if (!monsterName) continue;

        if (
            monsterName === '▼ 追加用はこちらに'
        ) {
            continue;
        }

        loadedRows++;

        const attribute =
            (row[attributeIndex] || '').trim() || null;

        const hpText =
            (row[hpIndex] || '').trim();

        const hp =
            /^\d+$/.test(hpText)
                ? Number(hpText)
                : null;

        const dropText =
            (row[dropsIndex] || '').trim();

        const drops = dropText
            .split('・')
            .map(x => x.trim())
            .filter(Boolean);

        if (!monsters[monsterName]) {
            monsters[monsterName] = {
                hp: null,
                attribute: null,
                spawns: {},
                drops: []
            };
        }

        const monster = monsters[monsterName];

        // 重複行がある場合は、片方が空欄なら埋める。
        // 値が食い違っている場合は曖昧なためnullにする。
        if (hp !== null) {
            if (monster.hp === null) {
                monster.hp = hp;
            } else if (monster.hp !== hp) {
                console.warn(
                    `[警告] ${monsterName} のHPが一致しません: ${monster.hp} / ${hp}`
                );
                monster.hp = null;
            }
        }

        if (attribute !== null) {
            if (monster.attribute === null) {
                monster.attribute = attribute;
            } else if (monster.attribute !== attribute) {
                console.warn(
                    `[警告] ${monsterName} の属性が一致しません: ${monster.attribute} / ${attribute}`
                );
                monster.attribute = null;
            }
        }

        for (const drop of drops) {
            addUnique(
                monster.drops,
                drop
            );

            const item = ensureItem(drop);

            if (!item.monsters[monsterName]) {
                item.monsters[monsterName] = [];
            }
        }

        for (const spawn of spawnColumns) {
            const cell =
                (row[spawn.index] || '').trim();

            if (!/^[◯〇○]$/.test(cell)) {
                continue;
            }

            if (!monster.spawns[spawn.region]) {
                monster.spawns[spawn.region] = [];
            }

            addUnique(
                monster.spawns[spawn.region],
                spawn.dungeon
            );

            const dungeonData =
                ensureDungeon(
                    spawn.region,
                    spawn.dungeon
                );

            addUnique(
                dungeonData.monsters,
                monsterName
            );

            for (const drop of drops) {
                const item = ensureItem(drop);

                if (!item.monsters[monsterName]) {
                    item.monsters[monsterName] = [];
                }

                const locations =
                    item.monsters[monsterName];

                const exists = locations.some(
                    x =>
                        x.region === spawn.region &&
                        x.dungeon === spawn.dungeon
                );

                if (!exists) {
                    locations.push({
                        region: spawn.region,
                        dungeon: spawn.dungeon
                    });
                }
            }
        }
    }

    console.log(
        `[モンスター] ${loadedRows}行読み込みました。`
    );
}

loadMonsterData();

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
