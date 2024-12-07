pragma circom 2.1.5;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/bitify.circom";

template PoseidonHash() {
    signal input input0;
    signal input input1;
    signal output hashedValue;

    component hasher = Poseidon(2);
    hasher.inputs[0] <== input0;
    hasher.inputs[1] <== input1;
    hashedValue <== hasher.out;
}

template ConditionalSelector() {
    signal input selector; // Should be 0 or 1
    signal input input0;
    signal input input1;
    signal output selectedValue;

    // Ensure selector is boolean
    selector * (selector - 1) === 0;

    // Enforce out = selector ? input1 : input0
    signal sel_in1;
    signal one_minus_sel;
    signal one_minus_sel_in0;

    one_minus_sel <== 1 - selector;
    sel_in1 <== selector * input1;
    one_minus_sel_in0 <== one_minus_sel * input0;
    selectedValue <== sel_in1 + one_minus_sel_in0;
}

template MerkleProof(treeDepth) {
    signal input voterIndex;                      // Leaf index
    signal input authPath[treeDepth + 2];         // [Leaf, authentication path elements..., Root]

    component indexBits = Num2Bits(treeDepth);    // Convert index to path bits
    indexBits.in <== voterIndex;

    // Ensure bits are computed before use and are boolean
    for (var i = 0; i < treeDepth; i++) {
        indexBits.out[i] * (indexBits.out[i] - 1) === 0;
    }

    signal hash_chain[treeDepth + 1];             // Array to store hashes at each level
    hash_chain[0] <== authPath[0];                // Start with the leaf

    component hashers[treeDepth];                 // Pre-allocate all hashers
    component muxLeft[treeDepth];
    component muxRight[treeDepth];

    for (var i = 0; i < treeDepth; i++) {
        hashers[i] = PoseidonHash();

        // Left input
        muxLeft[i] = ConditionalSelector();
        muxLeft[i].selector <== indexBits.out[i];
        muxLeft[i].input0 <== hash_chain[i];
        muxLeft[i].input1 <== authPath[i + 1];
        hashers[i].input0 <== muxLeft[i].selectedValue;

        // Right input
        muxRight[i] = ConditionalSelector();
        muxRight[i].selector <== indexBits.out[i];
        muxRight[i].input0 <== authPath[i + 1];
        muxRight[i].input1 <== hash_chain[i];
        hashers[i].input1 <== muxRight[i].selectedValue;

        // Store the new hash in the chain
        hash_chain[i + 1] <== hashers[i].hashedValue;
    }

    // Ensure the computed root matches the provided root
    hash_chain[treeDepth] === authPath[treeDepth + 1];
}
