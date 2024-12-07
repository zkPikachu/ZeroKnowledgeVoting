pragma circom 2.1.5;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "./merkle.circom";

template VotingCircuit(treeDepth) {
    signal input merkleRoot;                // Public
    signal input voterIndex;                // Private
    signal input authPath[treeDepth + 2];   // Private 
    signal input nullifierHash;             // Public

    // Add new inputs and outputs
    signal input voteChoice;                // Private
    signal input randomness;                // Private
    signal input voteCommitment;            // Public

    component merkleProof = MerkleProof(treeDepth);
    component nullifierPoseidon = Poseidon(2);
    component commitmentPoseidon = Poseidon(2);

    // Existing Merkle proof connections
    merkleProof.authPath <== authPath;
    merkleProof.voterIndex <== voterIndex;

    // Nullifier check
    nullifierPoseidon.inputs[0] <== merkleRoot;
    nullifierPoseidon.inputs[1] <== authPath[0];
    nullifierPoseidon.out === nullifierHash;

    // Compute the voteCommitment
    commitmentPoseidon.inputs[0] <== voteChoice;
    commitmentPoseidon.inputs[1] <== randomness;
    commitmentPoseidon.out === voteCommitment;
}

component main { public [merkleRoot, nullifierHash, voteCommitment] } = VotingCircuit(10);
