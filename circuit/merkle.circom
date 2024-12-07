pragma circom 2.1.5;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/bitify.circom";

template PoseidonHash() {
    signal input left;
    signal input right;
    signal output hashedValue;

    component hasher = Poseidon(2);
    hasher.inputs[0] <== left;
    hasher.inputs[1] <== right;
    hashedValue <== hasher.out;
}

template ConditionalSelector() {
    signal input selector; // 0 or 1
    signal input input0;
    signal input input1;
    signal output selectedValue;

    // Ensure selector is boolean
    selector * (selector - 1) === 0;

    // Use a linearized form:
    // selectedValue = input0 + selector * (input1 - input0)
    signal diff;
    diff <== input1 - input0;
    selectedValue <== input0 + diff * selector;
}


template MerkleProof(treeDepth) {
    signal input index;                   // Leaf index
    signal input authPath[treeDepth + 1]; // [leafHash, ... , root]

    component indexToBits = Num2Bits(treeDepth);
    indexToBits.in <== index;

    signal intermediateHashes[treeDepth + 1]; 
    intermediateHashes[0] <== authPath[0]; // Leaf hash

    component hashers[treeDepth];
    component leftSelectors[treeDepth];
    component rightSelectors[treeDepth];

    for (var i = 0; i < treeDepth; i++) {
        hashers[i] = PoseidonHash();

        leftSelectors[i] = ConditionalSelector();
        rightSelectors[i] = ConditionalSelector();

        // Set left input for hasher
        leftSelectors[i].selector <== indexToBits.out[i];
        leftSelectors[i].input0 <== intermediateHashes[i];
        leftSelectors[i].input1 <== authPath[i + 1];
        hashers[i].left <== leftSelectors[i].selectedValue;

        // Set right input for hasher
        rightSelectors[i].selector <== indexToBits.out[i];
        rightSelectors[i].input0 <== authPath[i + 1];
        rightSelectors[i].input1 <== intermediateHashes[i];
        hashers[i].right <== rightSelectors[i].selectedValue;

        intermediateHashes[i + 1] <== hashers[i].hashedValue;
    }

    // The final computed root must match the provided root in authPath
    intermediateHashes[treeDepth] === authPath[treeDepth];
}
