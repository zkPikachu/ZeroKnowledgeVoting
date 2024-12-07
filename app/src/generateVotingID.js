const circomlibjs = require("circomlibjs");
const appRoot = require("app-root-path");
const { voters } = require(`${appRoot}/voterRegistry.json`);
const { merkleTree } = require("./merkleTree.js");
const fs = require("fs");
const resultsFilePath = `${appRoot}/votingResults.json`;

async function generateVotingID() {
    try {
        // Initialize Poseidon hash functions
        const poseidon = await circomlibjs.buildPoseidonOpt();

        const hashLeaf = (input) => poseidon([input]); // Hash individual leaves
        const hashNode = (left, right) => poseidon([left, right]); // Hash tree nodes

        // Pad voters list to the nearest power of 2
        const treeDepth = 10; // Depth of the Merkle tree
        const leaves = Array(2 ** treeDepth).fill(null).map((_, index) =>
            index < voters.length ? voters[index] : voters[voters.length - 1]
        );

        // Generate the Merkle tree
        const merkleTreeInstance = await merkleTree(leaves, hashLeaf, hashNode);
        const merkleRoot = poseidon.F.toString(merkleTreeInstance.root);        
        console.log("Merkle Tree Root (Voting ID):", merkleRoot);

        // Update the results JSON with the generated voting ID
        const results = JSON.parse(fs.readFileSync(resultsFilePath, "utf8"));
        results.votingID = merkleRoot;
        fs.writeFileSync(resultsFilePath, JSON.stringify(results, null, 2), "utf8");
        console.log("Voting ID saved to votingResults.json");

        return merkleTree;
    } catch (error) {
        console.error("Error during Voting ID generation:", error.message);
        throw error;
    }
}

// Execute if run as a standalone script
if (require.main === module) {
    generateVotingID()
        .then(() => console.log("Voting ID generated successfully."))
        .catch((error) => console.error("Failed to generate Voting ID:", error.message));
}

module.exports = { generateVotingID };
