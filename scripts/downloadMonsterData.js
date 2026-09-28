const fs = require('node:fs');
const path = require('node:path');

const MONSTER_DATA_URL =
    'https://docs.google.com/spreadsheets/d/1ibQ2QR-nXpcz1mWgJ83we7NuAlLbI0ngzQ8b4OKLkBI/export?format=csv&gid=0';

const OUTPUT_PATH =
    path.join(__dirname, '../csv/monster_data.csv');

async function downloadMonsterData() {
    try {
        console.log('[モンスター] ダウンロード中...');

        const response = await fetch(MONSTER_DATA_URL);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const csv = (await response.text()).replace(/^\uFEFF/, '');

        fs.mkdirSync(
            path.dirname(OUTPUT_PATH),
            { recursive: true }
        );

        fs.writeFileSync(
            OUTPUT_PATH,
            csv,
            'utf8'
        );

        console.log('[モンスター] ダウンロード完了');

    } catch (error) {
        console.error(
            '[モンスター] ダウンロードエラー:',
            error
        );

        throw error;
    }
}

module.exports = {
    downloadMonsterData
};
