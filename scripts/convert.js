const fs = require('node:fs');
const path = require('node:path');

const csvFolder = path.join(__dirname, '../csv');
const dataFolder = path.join(__dirname, '../data');
const monsterDataFile = 'monster_data.csv';

const areas = {};
const dungeons = {};
const monsters = {};
const items = {};

// 旧CSVと新モンスターシートのドロップを別々に管理
const legacyDrops = {};
const newSheetDrops = {};

const csvFiles = fs
    .readdirSync(csvFolder)
    .filter(file =>
        file.endsWith('.csv') &&
        file !== monsterDataFile
    );

function addUnique(array, value) {
    if (!array.includes(value)) {
        array.push(value);
    }
}

function normalizeLabel(value) {
    return String(value ?? '')
        .normalize('NFKC')
        .replace(/[\s\u200B-\u200D\uFEFF]/gu, '');
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
        } else if (char === ',') {
            row.push(field.trim());
            field = '';
        } else if (char === '\n') {
            row.push(field.trim());
            rows.push(row);
            row = [];
            field = '';
        } else if (char !== '\r') {
            field += char;
        }
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

function ensureMonster(monsterName) {
    if (!monsters[monsterName]) {
        monsters[monsterName] = {
            hp: null,
            attribute: null,
            memo: null,
            spawns: {},
            drops: []
        };
    }

    return monsters[monsterName];
}

function addMonsterSpawn(
    monsterName,
    region,
    dungeonName
) {
    const monster = ensureMonster(monsterName);

    if (!monster.spawns[region]) {
        monster.spawns[region] = [];
    }

    addUnique(
        monster.spawns[region],
        dungeonName
    );

    const dungeon = ensureDungeon(
        region,
        dungeonName
    );

    addUnique(
        dungeon.monsters,
        monsterName
    );
}

// 地域見出しの絵文字を判定して地域名を取り出す
function extractRegionName(value) {
    const text = String(value || '')
        .replace(/^\uFEFF/, '')
        .trim();

    if (!text) {
        return null;
    }

    const startsWithEmoji =
        /^[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}]/u
            .test(text);

    if (!startsWithEmoji) {
        return null;
    }

    const region = text
        .replace(
            /^[^\p{L}\p{N}ぁ-んァ-ヶ一-龠ー]+/u,
            ''
        )
        .trim();

    return region || null;
}

//----------------------------------
// 旧CSV：地域・ダンジョン・採取・モンスター・旧ドロップ
//----------------------------------

for (const file of csvFiles) {
    const filePath = path.join(csvFolder, file);

    const content = fs.readFileSync(
        filePath,
        'utf8'
    ).replace(/^\uFEFF/, '');

    const rows = parseCsv(content);

    // 地域見出しがないCSV（レシピなど）は対象外
    const hasRegionHeader = rows
        .slice(0, 5)
        .some(row => extractRegionName(row[0]));

    if (!hasRegionHeader) continue;

    let currentRegion = null;
    let currentDungeon = null;

    for (const rawRow of rows) {
        // 空欄列は削除しない。列位置が重要
        const row = rawRow.map(
            value => String(value || '').trim()
        );

        if (row.every(value => !value)) continue;

        const first = row[0] || '';

        const normalizedFirst = first
            .normalize('NFKC')
            .replace(/[\s\u200B-\u200D\uFEFF]/gu, '');

        // 地域見出し
        const regionName = extractRegionName(first);

        if (regionName) {
            currentRegion = regionName;
            currentDungeon = null;

            if (!areas[currentRegion]) {
                areas[currentRegion] = {
                    dungeons: []
                };
            }

            continue;
        }

        if (!first) continue;

        // 敵なし・敵無しは見出しとして扱う
        if (
            normalizedFirst === '敵なし' ||
            normalizedFirst === '敵無し'
        ) {
            currentDungeon = null;
            continue;
        }

        // ダンジョン見出しはAP表記で判定
        // 例：ミント林,,(AP:6)
        const isDungeonHeader = row.some(
            value => /\bAP\s*:/iu.test(value)
        );

        if (isDungeonHeader) {
            if (!currentRegion) {
                currentDungeon = null;
                continue;
            }

            currentDungeon = first;

            ensureDungeon(
                currentRegion,
                currentDungeon
            );

            continue;
        }

        // 採取・釣りの採取行
        if (normalizedFirst.startsWith('採取')) {
            if (!currentRegion || !currentDungeon) {
                console.warn(
                    `[採取] 場所を特定できません: ${file} / ${first}`
                );
                continue;
            }

            const gatherItems = row
                .slice(1)
                .flatMap(value => value.split('・'))
                .map(value => value.trim())
                .filter(value => {
                    const normalized = value
                        .normalize('NFKC')
                        .replace(/[\s\u200B-\u200D\uFEFF]/gu, '');

                    return normalized &&
                        normalized !== 'なし' &&
                        normalized !== '情報なし' &&
                        normalized !== 'null' &&
                        normalized !== 'undefined';
                });

            const dungeonData = ensureDungeon(
                currentRegion,
                currentDungeon
            );

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

            // 採取行をモンスターとして処理しない
            continue;
        }

        if (!currentRegion || !currentDungeon) {
            continue;
        }

        // プレースホルダーを登録しない
        if (
            normalizedFirst === 'null' ||
            normalizedFirst === 'undefined' ||
            normalizedFirst.startsWith('▼')
        ) {
            continue;
        }

        // モンスターはドロップが空欄でも登録する
        const monsterName = first;

        addMonsterSpawn(
            monsterName,
            currentRegion,
            currentDungeon
        );

        const drops = row
            .slice(1)
            .flatMap(value => value.split('・'))
            .map(value => value.trim())
            .filter(value => {
                const normalized = value
                    .normalize('NFKC')
                    .replace(/[\s\u200B-\u200D\uFEFF]/gu, '');

                return normalized &&
                    normalized !== 'なし' &&
                    normalized !== '情報なし' &&
                    normalized !== 'null' &&
                    normalized !== 'undefined';
            });

        if (!legacyDrops[monsterName]) {
            legacyDrops[monsterName] = [];
        }

        for (const drop of drops) {
            addUnique(
                legacyDrops[monsterName],
                drop
            );
        }
    }
}

//----------------------------------
// 新モンスターシート：HP・属性・備考・出現場所・ドロップ
//----------------------------------
function loadMonsterData() {
    const filePath = path.join(
        csvFolder,
        monsterDataFile
    );

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
    const spawnColumns = [];

    for (
        let columnIndex = spawnStartIndex;
        columnIndex < Math.max(
            header.length,
            dungeonHeader.length
        );
        columnIndex++
    ) {
        if (header[columnIndex]) {
            currentRegion =
                header[columnIndex].trim();
        }

        const dungeon =
            (dungeonHeader[columnIndex] || '').trim();

        if (currentRegion && dungeon) {
            spawnColumns.push({
                index: columnIndex,
                region: currentRegion,
                dungeon
            });
        }
    }

    let loadedRows = 0;

    for (
        let rowIndex = 4;
        rowIndex < rows.length;
        rowIndex++
    ) {
        const row = rows[rowIndex];

        const monsterName =
            (row[nameIndex] || '').trim();

        if (
            !monsterName ||
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

        const memo =
            memoIndex >= 0
                ? (
                    (row[memoIndex] || '').trim() ||
                    null
                )
                : null;

        const dropText =
            (row[dropsIndex] || '').trim();

        const drops = dropText
            .split('・')
            .map(value => value.trim())
            .filter(Boolean);

        const monster = ensureMonster(monsterName);

        // 新シートに値がある場合だけ反映する
        // 空欄で旧情報を消さない
        if (hp !== null) {
            if (monster.hp === null) {
                monster.hp = hp;
            } else if (monster.hp !== hp) {
                console.warn(
                    `[警告] ${monsterName} のHPが一致しません: ` +
                    `${monster.hp} / ${hp}`
                );
                monster.hp = null;
            }
        }

        if (attribute !== null) {
            if (monster.attribute === null) {
                monster.attribute = attribute;
            } else if (
                monster.attribute !== attribute
            ) {
                console.warn(
                    `[警告] ${monsterName} の属性が一致しません: ` +
                    `${monster.attribute} / ${attribute}`
                );
                monster.attribute = null;
            }
        }

        if (memo !== null) {
            if (monster.memo === null) {
                monster.memo = memo;
            } else if (monster.memo !== memo) {
                console.warn(
                    `[警告] ${monsterName} の備考が一致しません: ` +
                    `${monster.memo} / ${memo}`
                );
                monster.memo = null;
            }
        }

        // 新シートのドロップは別に保存する
        if (drops.length > 0) {
            if (!newSheetDrops[monsterName]) {
                newSheetDrops[monsterName] = [];
            }

            for (const drop of drops) {
                addUnique(
                    newSheetDrops[monsterName],
                    drop
                );
            }
        }

        // 出現場所は旧CSVと新シートの両方を統合する
        for (const spawn of spawnColumns) {
            const cell =
                (row[spawn.index] || '').trim();

            if (!/^[◯〇○]$/.test(cell)) {
                continue;
            }

            addMonsterSpawn(
                monsterName,
                spawn.region,
                spawn.dungeon
            );
        }
    }

    console.log(
        `[モンスター] 新シートから${loadedRows}行読み込みました。`
    );
}

loadMonsterData();

//----------------------------------
// ドロップを確定し、アイテムの逆引きも構築する
//----------------------------------
for (const [monsterName, monster] of Object.entries(monsters)) {
    const preferredDrops = newSheetDrops[monsterName];
    const fallbackDrops = legacyDrops[monsterName] || [];

    // 新シートにドロップがあれば新シート優先。
    // 空欄なら旧CSVのドロップを使う。
    monster.drops = [
        ...(preferredDrops && preferredDrops.length > 0
            ? preferredDrops
            : fallbackDrops)
    ];

    for (const drop of monster.drops) {
        const item = ensureItem(drop);

        if (!item.monsters[monsterName]) {
            item.monsters[monsterName] = [];
        }

        for (
            const [region, spawnDungeons]
            of Object.entries(monster.spawns)
        ) {
            for (const dungeon of spawnDungeons) {
                const exists =
                    item.monsters[monsterName].some(
                        location =>
                            location.region === region &&
                            location.dungeon === dungeon
                    );

                if (!exists) {
                    item.monsters[monsterName].push({
                        region,
                        dungeon
                    });
                }
            }
        }
    }
}

//----------------------------------
// JSON出力
//----------------------------------
fs.mkdirSync(dataFolder, {
    recursive: true
});

for (const [filename, data] of Object.entries({
    'areas.json': areas,
    'dungeons.json': dungeons,
    'monsters.json': monsters,
    'items.json': items
})) {
    fs.writeFileSync(
        path.join(dataFolder, filename),
        JSON.stringify(data, null, 2),
        'utf8'
    );
}

console.log(`地域数: ${Object.keys(areas).length}`);
console.log(`ダンジョン数: ${Object.keys(dungeons).length}`);
console.log(`モンスター数: ${Object.keys(monsters).length}`);
console.log(`アイテム数: ${Object.keys(items).length}`);
console.log('変換完了');