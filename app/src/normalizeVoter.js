const fs = require("fs");

// Load voter.json
let voter = require("../voterMapping.json");

// Normalize keys to lowercase
const normalizedVoter = {};
for (const [key, value] of Object.entries(voter)) {
    normalizedVoter[key.toLowerCase()] = value;
}

// Save the normalized voter.json
fs.writeFileSync("./voterMapping.json", JSON.stringify(normalizedVoter, null, 2));
console.log("Normalized voter.json:", normalizedVoter);