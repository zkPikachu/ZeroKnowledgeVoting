/**
 * @typedef {Object} MerkleTree
 * @property {Array<any>} leaves The input leaves of the tree.
 * @property {Array<any>} nodes All nodes in the Merkle tree, including leaves and internal nodes.
 * @property {number} depth The depth of the Merkle tree.
 * @property {any} root The root hash of the Merkle tree.
 */

/**
 * Creates a Merkle tree from the given leaves and hash functions.
 * @param {Array<any>} leaves Input leaves for the Merkle tree.
 * @param {Function} hashLeaf Hash function for individual leaves.
 * @param {Function} hashNode Hash function for combining two child nodes.
 * @returns {MerkleTree} A Merkle tree object with utilities.
 */
async function createMerkleTree(leaves, hashLeaf, hashNode) {
    /**
     * Calculates all nodes of the Merkle tree.
     * @returns {Array<any>} All nodes in the Merkle tree.
     */
    function calculateAllNodes() {
        const allNodes = [];

        // Hash all leaves first
        for (const leaf of merkleTree.leaves) {
            allNodes.push(merkleTree.hashLeaf(leaf));
        }

        let currentLevelSize = allNodes.length;
        let offset = 0;

        // Compute hashes for all tree levels
        while (currentLevelSize > 1) {
            for (let i = 0; i < currentLevelSize; i += 2) {
                const left = allNodes[offset + i];
                const right = allNodes[offset + i + 1];
                allNodes.push(merkleTree.hashNode(left, right));
            }
            offset += currentLevelSize;
            currentLevelSize = Math.floor(currentLevelSize / 2);
        }

        return allNodes;
    }

    /**
     * @typedef {Object} MerkleProof
     * @property {Array<number>} directionBits 0 for left, 1 for right.
     * @property {Array<any>} siblingHashes Hashes required for proof verification.
     * @property {Function} calculateRoot Recomputes the root for verification.
     */

    /**
     * Generates a Merkle proof for a specific leaf.
     * @param {number} leafIndex Index of the leaf for which to generate the proof.
     * @returns {MerkleProof} The Merkle proof for the given leaf.
     */
    function generateProof(leafIndex) {
        if (leafIndex < 0 || leafIndex >= merkleTree.leaves.length) {
            throw new Error("Leaf index out of bounds");
        }

        const directionBits = [];
        const siblingHashes = [];
        let currentIndex = leafIndex;
        let offset = 0;
        let currentLevelSize = merkleTree.leaves.length;

        siblingHashes.push(merkleTree.nodes[currentIndex]); // Add leaf hash

        // Traverse the tree to collect proof
        for (let i = 0; i < merkleTree.depth; i++) {
            const isLeft = currentIndex % 2 === 0;
            const siblingIndex = isLeft ? currentIndex + 1 : currentIndex - 1;

            directionBits.push(isLeft ? 0 : 1); // Add direction (0: left, 1: right)
            siblingHashes.push(merkleTree.nodes[offset + siblingIndex]); // Add sibling hash

            currentIndex = Math.floor(currentIndex / 2); // Move to parent node
            offset += currentLevelSize;
            currentLevelSize = Math.floor(currentLevelSize / 2);
        }

        siblingHashes.push(merkleTree.root); // Add root hash

        return {
            directionBits,
            siblingHashes,
            calculateRoot() {
                let hash = siblingHashes[0]; // Start with leaf hash
                for (let i = 0; i < directionBits.length; i++) {
                    hash = directionBits[i] === 0
                        ? merkleTree.hashNode(hash, siblingHashes[i + 1]) // Right sibling
                        : merkleTree.hashNode(siblingHashes[i + 1], hash); // Left sibling
                }
                return hash;
            },
        };
    }

    const merkleTree = {
        leaves: [...leaves], // Create a deep copy of the leaves
        hashLeaf,
        hashNode,
        depth: Math.log2(leaves.length),
        get root() {
            return this.nodes[this.nodes.length - 1];
        },
        generateProof,
    };

    // Calculate all nodes
    merkleTree.nodes = calculateAllNodes();

    return merkleTree;
}

module.exports = { createMerkleTree };
