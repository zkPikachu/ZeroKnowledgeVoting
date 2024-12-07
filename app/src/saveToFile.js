const appRoot = require("app-root-path");
const fs = require("fs");

async function saveToFile(data, filename) {
    const jsonObj = JSON.stringify(data, null, 2); // Pretty-printed JSON for readability

    try {
        fs.writeFileSync(`${appRoot}/${filename}.json`, jsonObj, "utf8");
        console.log(`\n${filename}.json saved successfully!\n`);
    } catch (error) {
        console.error(`Error saving ${filename}.json:`, error.message);
    }
}

module.exports = { saveToFile };
