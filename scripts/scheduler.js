const cron = require('node-cron');
const { exec } = require('child_process');

const { downloadAllSheets } = require('./download');
const { checkUpdates, sendLatestUpdate } = require('./checkUpdates');

async function updateData() {
    try {
        console.log('データ更新開始');

        await downloadAllSheets();

        await new Promise((resolve, reject) => {
            exec('node scripts/convert.js', (error, stdout, stderr) => {
                if (stdout) console.log(stdout);
                if (stderr) console.error(stderr);

                if (error) {
                    reject(error);
                    return;
                }

                resolve();
            });
        });

        await new Promise((resolve, reject) => {
            exec('node scripts/convert_recipe.js', (error, stdout, stderr) => {
                if (stdout) console.log(stdout);
                if (stderr) console.error(stderr);

                if (error) {
                    reject(error);
                    return;
                }

                resolve();
            });
        });

        console.log('データ更新完了');

    } catch (error) {
        console.error('データ更新エラー:', error);
    }
}


function startScheduler(client) {

    updateData();

    checkUpdates(client);
    //sendLatestUpdate(client);

    // 10分ごとにデータ更新
    cron.schedule('*/10 * * * *', () => {
        updateData();
    });

    // 毎朝6:00に更新情報をチェック
    cron.schedule('0 6 * * *', () => {
        checkUpdates(client);
    }, {
        timezone: 'Asia/Tokyo'
    });

    console.log('Scheduler started.');
}


module.exports = {
    startScheduler
};