const fs = require("fs");
const path = require("path");

function loadJson(fileName) {
    return JSON.parse(
        fs.readFileSync(
            path.join(__dirname, "../data", fileName),
            "utf8"
        )
    );
}

module.exports = loadJson;