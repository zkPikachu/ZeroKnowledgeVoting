const appRoot = require("app-root-path");
const fs = require("fs");
const { voters } = require(`${appRoot}/voterRegistry.json`);
const { saveToFile } = require("./saveToFile.js");

function generateVoterMapping() {
    let voterMapping = {};

    for (let i = 0; i < voters.length; ++i) {
        voterMapping[voters[i]] = i;
    }

    saveToFile(voterMapping, "voterMapping");
}

generateVoterMapping();
