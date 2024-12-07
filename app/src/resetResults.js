const appRoot = require("app-root-path");
const fs = require("fs");

// Path to the voting results file
const resultsFilePath = `${appRoot}/votingResults.json`;

// Initial structure of the results file
const defaultResults = {
    votingID: null, // Reset voting ID
    votes: {
        0: 0, // Reset vote counts
        1: 0,
        null: null, // Reserved for invalid/null votes
    },
    spentTickets: {}, // Clear spent tickets
};

function resetResults() {
    try {
        // Write the default structure to the results file
        fs.writeFileSync(resultsFilePath, JSON.stringify(defaultResults, null, 2), "utf8");
        console.log("votingResults.json has been reset successfully.");
    } catch (error) {
        console.error("Failed to reset voting results:", error.message);
    }
}

// Execute the reset function when run as a standalone script
if (require.main === module) {
    resetResults();
}

module.exports = { resetResults };
