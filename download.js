const fs = require("fs");
const https = require("https");

const sheets = [
    {
        name: "レシピ",
        sheetId: "1Khjlb73W0zLDS_KoGWMfEEIZtW9PnRoz8L7UcvUoAfY",
        gid: "0",
        file: "./csv/recipes.csv"
    },
    {
        name: "リーフィア",
        sheetId: "1BQ5839ygAVSv5aUpUv_drIDv7iAHijfnTiIcYwAeeUc",
        gid: "0",
        file: "./csv/リーフィア.csv"
    },
    {
        name: "ハーブレン",
        sheetId: "1BQ5839ygAVSv5aUpUv_drIDv7iAHijfnTiIcYwAeeUc",
        gid: "480388315",
        file: "./csv/ハーブレン.csv"
    },
    {
        name: "マリス",
        sheetId: "1BQ5839ygAVSv5aUpUv_drIDv7iAHijfnTiIcYwAeeUc",
        gid: "1936610228",
        file: "./csv/マリス.csv"
    },
    {
        name: "ガルド",
        sheetId: "1BQ5839ygAVSv5aUpUv_drIDv7iAHijfnTiIcYwAeeUc",
        gid: "1139753114",
        file: "./csv/ガルド.csv"
    },
    {
        name: "グレウォ",
        sheetId: "1BQ5839ygAVSv5aUpUv_drIDv7iAHijfnTiIcYwAeeUc",
        gid: "1193398952",
        file: "./csv/グレウォ.csv"
    },
    {
        name: "灰宿",
        sheetId: "1BQ5839ygAVSv5aUpUv_drIDv7iAHijfnTiIcYwAeeUc",
        gid: "448324653",
        file: "./csv/灰宿.csv"
    },
    {
        name: "カルデラ",
        sheetId: "1BQ5839ygAVSv5aUpUv_drIDv7iAHijfnTiIcYwAeeUc",
        gid: "533631288",
        file: "./csv/カルデラ.csv"
    },
    {
        name: "エルデ",
        sheetId: "1BQ5839ygAVSv5aUpUv_drIDv7iAHijfnTiIcYwAeeUc",
        gid: "417234817",
        file: "./csv/エルデ.csv"
    },
    {
        name: "ルナリス",
        sheetId: "1BQ5839ygAVSv5aUpUv_drIDv7iAHijfnTiIcYwAeeUc",
        gid: "57948172",
        file: "./csv/ルナリス.csv"
    },
    {
        name: "沈黙",
        sheetId: "1BQ5839ygAVSv5aUpUv_drIDv7iAHijfnTiIcYwAeeUc",
        gid: "1251908581",
        file: "./csv/沈黙.csv"
    }
];

function download(url, output) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {

            if (
                res.statusCode >= 300 &&
                res.statusCode < 400 &&
                res.headers.location
            ) {
                return resolve(download(res.headers.location, output));
            }

            if (res.statusCode !== 200) {
                return reject(new Error(`HTTP ${res.statusCode}`));
            }

            const file = fs.createWriteStream(output);

            res.pipe(file);

            file.on("finish", () => {
                file.close(resolve);
            });

            file.on("error", reject);
        }).on("error", reject);
    });
}

async function downloadAllSheets() {

    for (const sheet of sheets) {

        const url =
            `https://docs.google.com/spreadsheets/d/${sheet.sheetId}/export?format=csv&gid=${sheet.gid}`;

        console.log(`[${sheet.name}] ダウンロード中...`);

        await download(url, sheet.file);

        console.log(`[${sheet.name}] ダウンロード完了`);
    }
}

module.exports = {
    downloadAllSheets
};