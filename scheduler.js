const cron = require("node-cron");
const { downloadAllSheets } = require("./download");
const { exec } = require("child_process");

async function updateData() {

    try {

        console.log("CSV更新開始");

        await downloadAllSheets();

        console.log("CSV更新完了");

        exec("node convert.js", (err, stdout, stderr) => {

            if (err) {
                console.error("convert.js エラー:", err);
                return;
            }

            console.log(stdout);

            exec("node convert_recipe.js", (err2, stdout2, stderr2) => {

                if (err2) {
                    console.error("convert_recipe.js エラー:", err2);
                    return;
                }

                console.log(stdout2);

                console.log("JSON更新完了");

            });

        });

    } catch (e) {

        console.error(e);

    }

}

updateData();

cron.schedule("0 * * * *", updateData);