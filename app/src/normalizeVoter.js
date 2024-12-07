const fs = require("fs");

// Load voter.json
let voter = require("../voter.json");

// Normalize keys to lowercase
const normalizedVoter = {};
for (const [key, value] of Object.entries(voter)) {
    normalizedVoter[key.toLowerCase()] = value;
}

// Save the normalized voter.json
fs.writeFileSync("./voter.json", JSON.stringify(normalizedVoter, null, 2));
console.log("Normalized voter.json:", normalizedVoter);