const { groth16 } = require("snarkjs");
const circomlibjs = require("circomlibjs");
const appRoot = require('app-root-path');


async function generateProof(addr, vote) {

  // Ensure consistency when looking up voter in voters List
  const addrNormalized = addr.toLowerCase();
  
  // Check if the Address Exists in the Voter List
  if (!voter.hasOwnProperty(addrNormalized)) {
    throw new Error(`Invalid Voter Address: ${addr}`);
  }
  
  const voterIndex = voter[addrNormalized];

  // initialize optimized version of the Poseidon hash from circomlibjs 
  const poseidon = await circomlibjs.buildPoseidonOpt();

  // Get Merkle Tree and Root
  const tree = await initiatePoll();
  const root = poseidon.F.toString(tree.root);

  // Register voter
  const nullifier = BigInt(await registerVoter(root, addr));

  // Get Merkle Proof
  const merkleProof = tree.getMerkleProof(voterIndex);
  console.log("Generated Merkle Proof:", merkleProof);

  // Transform Lemma to BigInt
  const lemma = merkleProof.lemma.map((x) => BigInt(poseidon.F.toString(x)));

  // Randomness (r) as BigInt
  const r = BigInt(Math.floor(Math.random() * 1000000000));

  // Convert vote to BigInt
  const voteBigInt = BigInt(vote);
  

  /* Compute a voteCommitment as a hash of the vote combined with a secret random value (r)
  The circuit should output the voteCommitment as part of its output and allow its inclusion in the blockchain */

  const voteCommitment = poseidon.F.toString(poseidon([voteBigInt, r]));
  console.log("Vote Commitment:", voteCommitment);

  // Proof generation paths           
  const wasmPath = `${appRoot}/../circuit/setup/circuit.wasm`;
  const zkeyPath = `${appRoot}/../circuit/setup/circuit_final.zkey`;
  console.log("WASM Path:", wasmPath);
  console.log("ZKey Path:", zkeyPath);1
  
  // Generate ZK-SNARK Proof
  const { proof, publicSignals } = await groth16.fullProve(
    {
      votingID: BigInt(root),
      index: BigInt(voterIndex),
      lemma: lemma,
      nullifier: nullifier,
      vote: voteBigInt,
      randomness: r,
      voteCommitment: BigInt(voteCommitment)
    },
    wasmPath,
    zkeyPath
  );

  console.log("Proof:", proof);
  console.log("Ticket code (keep private):", r);
  console.log("Public Signals:", publicSignals);
  
  // These publicSignals are passed along with the proof to a smart contract on the blockchain.

  return { proof, publicSignals };
}

module.exports = { generateProof };