const snarkjs = require("snarkjs");
const fs = require("fs");
const { zkVerifySession, ZkVerifyEvents } = require("zkverifyjs");
const ethers = require("ethers");
const circomlibjs = require("circomlibjs");
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
require("dotenv").config({ path: [".env", ".env.secrets"] });
const voter = require(`../voterMapping.json`);
const merkle = require("./merkleTree.js");
const circomlib = require("circomlib");
const prompt = require("prompt-sync")();
const appRoot = require("app-root-path");

// Use poseidon hash function as before

async function verify(proof, publicSignals) {
  const {
    ZKV_RPC_URL,
    ZKV_SEED_PHRASE,
    ETH_RPC_URL,
    ETH_SECRET_KEY,
    ETH_ZKVERIFY_CONTRACT_ADDRESS,
    ETH_APP_CONTRACT_ADDRESS,
  } = process.env;

  try {
    const evmAccount = ethers.computeAddress(ETH_SECRET_KEY);
    console.log("-------------- Public Signals (pp) ------------------");
    console.log(publicSignals);
    console.log("---------------- Proof (pi) ----------------");
    console.log(proof);
    console.log(
      `Resolved path: ${appRoot}/../circuit/setup/verification_key.json`
    );
    const vk = JSON.parse(
      fs.readFileSync(`${appRoot}/../circuit/setup/verification_key.json`)
    );

    // Establish a session with zkVerify
    const session = await zkVerifySession
      .start()
      .Custom(ZKV_RPC_URL)
      .withAccount(ZKV_SEED_PHRASE);

    // Send the proof to zkVerify chain for verification
    const { events, transactionResult } = await session
      .verify()
      .groth16()
      .waitForPublishedAttestation()
      .execute({
        proofData: {
          vk,
          proof,
          publicSignals,
        },
      });

    // Listen for the 'includedInBlock' event
    let transactionAccepted = false;
    events.on(ZkVerifyEvents.IncludedInBlock, ({ txHash }) => {
      console.log(`Transaction accepted in zkVerify, tx-hash: ${txHash}`);
    });

    // Listen for the 'finalized' event
    events.on(ZkVerifyEvents.Finalized, ({ blockHash }) => {
      console.log(
        `Transaction finalized in zkVerify, block-hash: ${blockHash}`
      );      
    });

    // Handle errors during the transaction process
    events.on("error", (error) => {
      console.error("An error occurred during the transaction:", error);
    });

    // Await transaction result
    const { attestationId, leafDigest } = await transactionResult;
    console.log(`Attestation published on zkVerify`);
    console.log(`\tattestationId: ${attestationId}`);
    console.log(`\tleafDigest: ${leafDigest}`);

    // Retrieve via rpc call
    const proofDetails = await session.poe(attestationId, leafDigest);
    const { proof: merkleProof, numberOfLeaves, leafIndex } = proofDetails;
    const [root, nullifier, voteCommitment] = publicSignals;
    console.log(`\troot ${root}`);
    console.log(`\tnullifier ${nullifier}`);
    console.log(`\tvoteCommitment ${voteCommitment}`);

    console.log(`Merkle proof details`);
    console.log(`\tmerkleProof: ${merkleProof}`);
    console.log(`\tnumberOfLeaves: ${numberOfLeaves}`);
    console.log(`\tleafIndex: ${leafIndex}`);

    //Interaction with SCs in EVM
    const provider = new ethers.JsonRpcProvider(ETH_RPC_URL, null, {
      polling: true,
    });
    const wallet = new ethers.Wallet(ETH_SECRET_KEY, provider);

    const abiZkvContract = [
      "event AttestationPosted(uint256 indexed attestationId, bytes32 indexed root)",
    ];

    const abiAppContract = [
        "function proveVoteWasCast(uint256 attestationId, uint256 root, uint256 nullifier, bytes32[] calldata merklePath, uint256 leafCount, uint256 index, uint256 voteCommitment)",
        "event SuccessfulProofSubmission(address indexed from, uint256 voteCommitment)"
    ];
    
    const zkvContract = new ethers.Contract(ETH_ZKVERIFY_CONTRACT_ADDRESS, abiZkvContract, provider);
    const appContract = new ethers.Contract(ETH_APP_CONTRACT_ADDRESS, abiAppContract, wallet);

    const filterAttestationsById = zkvContract.filters.AttestationPosted(attestationId, null);

    // Return a promise that resolves when the EVM transaction is handled
    return new Promise(async (resolve, reject) => {

      zkvContract.once(filterAttestationsById, async (_id, _root) => {
        
        try{
                // After the attestation has been posted on the EVM, send a `proveVoteWasCast` tx
                // to the app contract, with all the necessary merkle proof details
                const txResponse = await appContract.proveVoteWasCast(
                    attestationId,
                    root,
                    nullifier,
                    merkleProof,
                    numberOfLeaves,
                    leafIndex,
                    voteCommitment
                );
                const { hash } = await txResponse;
                console.log(`Tx sent to EVM, tx-hash ${hash}`);
            } catch (txError) {
                console.error("Error in proveVoteWasCast:", txError);
                reject(txError);
            }
        });

        const filterAppEventsByCaller = appContract.filters.SuccessfulProofSubmission(evmAccount);
        appContract.once(filterAppEventsByCaller, async () => {
            console.log("The app contract has acknowledged that you casted the vote !!!")            
            resolve(true);
        });

    });

  } catch (error) {
    console.error("Error in verification process:", error);
    return false;
  }
}

module.exports = { verify };