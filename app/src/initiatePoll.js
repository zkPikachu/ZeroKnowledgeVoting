const circomlibjs = require("circomlibjs");
const appRoot = require("app-root-path");
const { voters } = require(`${appRoot}/voterRegistry.json`);
const { merkleTree } = require("./merkleTree.js");

/**
 * Initializes the voting poll by generating a Merkle tree from the voter list.
 * @returns {Object} The Merkle tree instance containing the root and nodes.
 */
async function initiatePoll() {
    try {
        console.log("🔄 Starting poll initialization...");

        // Initialize Poseidon hash function        
        const poseidon = await circomlibjs.buildPoseidonOpt();        

        // Define hashing functions for leaves and internal nodes
        const hashLeaf = (leaf) => poseidon([leaf]);
        const hashInternalNode = (leftChild, rightChild) => poseidon([leftChild, rightChild]);

        // Define Merkle tree parameters
        const treeDepth = 10;
        const maxLeaves = 2 ** treeDepth;
        console.log(`📐 Configured Merkle tree with depth ${treeDepth} (${maxLeaves} leaves).`);

        // Prepare leaves for the Merkle tree, padding with the last voter if necessary
        const leaves = Array.from({ length: maxLeaves }, (_, index) => {
            if (index < voters.length) {
                return voters[index];
            } else {
                return voters[voters.length - 1]; // Pad with the last voter
            }
        });
        console.log(`👥 Total voters: ${voters.length}. Total leaves (with padding): ${leaves.length}.`);

        // Generate the Merkle tree
        console.log("🛠️ Generating Merkle tree...");
        const merkleTreeInstance = await merkleTree(leaves, hashLeaf, hashInternalNode);
        console.log("✅ Merkle tree generated successfully.");

        // Retrieve and log the Merkle root
        const merkleRoot = poseidon.F.toString(merkleTreeInstance.root);
        console.log("📌 Merkle Root (Voting ID):", merkleRoot);
        console.log("📊 --------------------------------------------- 📊");

        return merkleTreeInstance;
    } catch (error) {
        console.error("❌ Error during poll initialization:", error);
        throw error; // Re-throw the error after logging
    }
}

module.exports = { initiatePoll };
