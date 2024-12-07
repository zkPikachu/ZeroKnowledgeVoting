pragma circom 2.1.5;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "./merkle.circom";

template VotingCircuit(treeDepth) {
    signal input merkleRoot;       // Public
    signal input voterIndex;       // Private
    signal input authPath[treeDepth + 1]; // Private: Authentication path (leaf to root)
    signal input nullifierHash;    // Public

    // New inputs and outputs for voting
    signal input voteChoice;       // Private
    signal input randomness;       // Private
    signal input voteCommitment;   // Public

    // Merkle Proof Component
    component merkleProof = MerkleProof(treeDepth);

    // Poseidon Hash for Nullifier and Commitment
    component nullifierPoseidon = Poseidon(2);
    component commitmentPoseidon = Poseidon(2);

    // Connect Merkle Proof
    merkleProof.authPath <== authPath;
    merkleProof.index <== voterIndex;

    // Nullifier hash computation: Poseidon(merkleRoot || leafHash)
    nullifierPoseidon.inputs[0] <== merkleRoot;
    nullifierPoseidon.inputs[1] <== authPath[0]; // Leaf hash
    nullifierPoseidon.out === nullifierHash;

    // Vote commitment computation: Poseidon(voteChoice || randomness)
    commitmentPoseidon.inputs[0] <== voteChoice;
    commitmentPoseidon.inputs[1] <== randomness;
    commitmentPoseidon.out === voteCommitment;
}

component main { public [merkleRoot, nullifierHash, voteCommitment] } = VotingCircuit(10);
