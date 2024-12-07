/**
 * @typedef {Object} MerkleTree
 * @property {Array<any>} inputs Leaves of the tree. Type depends on hash function.
 * @property {Array<any>} nodes Nodes of the Merkle tree. Type depends on hash function.
 * @property {Number} depth Depth of the Merkle tree.
 * @property {{readonly root: *}} root Root of the Merkle tree.
 */

/**
 * Creates a Merkle tree object from the given input, which can create and validate Merkle proofs.
 * @param {Array<any>} input Leaves of the Merkle Tree
 * @param {Function} leafHash Takes one input (leaf) and hashes it
 * @param {Function} nodeHash Takes two inputs (left and right nodes) and hashes them
 * @returns {MerkleTree} A Merkle tree with functionalities
 */
async function merkleTree(input, leafHash, nodeHash) {
    const merkle = {
        inputs: [...input], // Deep copy of input array
        leafHash,
        nodeHash,
        depth: Math.log2(input.length),
        nodes: []
    };

    /**
     * Calculate all nodes of the Merkle tree.
     * This implementation uses a level-based approach to reduce recalculations and memory usage.
     */
    function calculateNodes() {
        const levels = []; // Stores the levels of the Merkle tree
        let currentLevel = merkle.inputs.map(merkle.leafHash); // Start with hashed leaves
        levels.push(currentLevel);

        while (currentLevel.length > 1) {
            const nextLevel = [];
            for (let i = 0; i < currentLevel.length; i += 2) {
                const left = currentLevel[i];
                const right = currentLevel[i + 1] || left; // Handle odd numbers of nodes
                nextLevel.push(merkle.nodeHash(left, right));
            }
            levels.push(nextLevel);
            currentLevel = nextLevel;
        }

        // Flatten all levels into the `nodes` array
        return levels.flat();
    }

    /**
     * Get the root of the Merkle tree.
     * @returns {*} The root node of the tree.
     */
    function getRoot() {
        return merkle.nodes[merkle.nodes.length - 1];
    }

    /**
     * @typedef {Object} MerkleProof
     * @property {Array<Number>} circompath Path indicating whether each node is left (0) or right (1)
     * @property {Array<any>} lemma Array of hashes required to verify the proof
     * @property {Function} calculateRoot Recalculates the Merkle root for validation
     */

    /**
     * Creates a Merkle proof from the tree.
     * @param {number} index Index of the leaf in the tree
     * @returns {MerkleProof} Merkle proof object
     */
    function getMerkleProof(index) {
        if (index < 0 || index >= merkle.inputs.length) {
            throw new Error("Index out of bounds");
        }

        const path = [];
        const lemma = [];
        let currentIndex = index;
        let width = merkle.inputs.length;
        let offset = 0;

        // Add the leaf hash to the lemma
        lemma.push(merkle.nodes[currentIndex]);

        // Traverse up the tree to construct the proof
        while (width > 1) {
            const isLeft = currentIndex % 2 === 0;
            const siblingIndex = isLeft ? currentIndex + 1 : currentIndex - 1;

            path.push(isLeft ? 0 : 1);
            lemma.push(merkle.nodes[offset + siblingIndex]);

            currentIndex = Math.floor(currentIndex / 2);
            offset += width;
            width = Math.ceil(width / 2); // Account for odd-width levels
        }

        // Add the root to the lemma
        lemma.push(getRoot());

        return {
            path,
            lemma,
            calculateRoot() {
                return path.reduce((hash, direction, i) => {
                    const sibling = lemma[i + 1];
                    return direction === 0
                        ? merkle.nodeHash(hash, sibling)
                        : merkle.nodeHash(sibling, hash);
                }, lemma[0]); // Start with the leaf hash
            },
            circompath: path
        };
    }

    // Define a getter for the root property
    Object.defineProperty(merkle, 'root', {
        get() {
            return getRoot();
        }
    });

    // Initialize nodes by calculating them
    merkle.nodes = calculateNodes();

    // Attach methods to the Merkle tree
    merkle.calculateNodes = calculateNodes;
    merkle.getRoot = getRoot;
    merkle.getMerkleProof = getMerkleProof;

    return merkle;
}

module.exports = { merkleTree };
