const snarkjs = require("snarkjs");
const fs = require("fs");
const { zkVerifySession, ZkVerifyEvents } = require("zkverifyjs");
const ethers = require("ethers");
const circomlibjs = require("circomlibjs");
const yargs = require("yargs/yargs");
const { hideBin } = require('yargs/helpers');
require('dotenv').config({ path: ['.env', '.env.secrets'] });
const voter = require(`../voterMapping.json`);
const merkle = require("./merkleTree.js");
const circomlib = require("circomlib");
const prompt = require('prompt-sync')(); 
const appRoot = require('app-root-path');

// Use poseidon hash function as before

async function verify(proof, publicSignals) {
    const {
        ZKV_RPC_URL,
        ZKV_SEED_PHRASE,
        ETH_RPC_URL,
        ETH_SECRET_KEY,
        ETH_ZKVERIFY_CONTRACT_ADDRESS,
        ETH_APP_CONTRACT_ADDRESS
    } = process.env;

    try {
        const evmAccount = ethers.computeAddress(ETH_SECRET_KEY);
        console.log("-------------- Public Signals (pp) ------------------");
        console.log(publicSignals);
        console.log("---------------- Proof (pi) ----------------");
        console.log(proof);
        console.log(`Resolved path: ${appRoot}/../circuit/setup/verification_key.json`);
        const vk = JSON.parse(fs.readFileSync(`${appRoot}/../circuit/setup/verification_key.json`));

        // Establish a session with zkVerify
        const session = await zkVerifySession.start()
            .Custom(ZKV_RPC_URL)
            .withAccount(ZKV_SEED_PHRASE);

        // Send the proof to zkVerify chain for verification
        const { events, transactionResult } = await session.verify()
            .groth16()
            .waitForPublishedAttestation()
            .execute({
                proofData: {
                    vk,
                    proof,
                    publicSignals
                }
            });

        // Listen for the 'includedInBlock' event
        let transactionAccepted = false;
        events.on(ZkVerifyEvents.IncludedInBlock, ({ txHash }) => {
            console.log(`Transaction accepted in zkVerify, tx-hash: ${txHash}`);
        });

        // Listen for the 'finalized' event
        events.on(ZkVerifyEvents.Finalized, ({ blockHash }) => {
            console.log(`Transaction finalized in zkVerify, block-hash: ${blockHash}`); 
            transactionAccepted = true;
        });

        // Handle errors during the transaction process
        events.on('error', (error) => {
            console.error('An error occurred during the transaction:', error);
        });

        // Await transaction result
        const { attestationId, leafDigest } = await transactionResult;
        console.log(`Attestation published on zkVerify`);
        console.log(`\tattestationId: ${attestationId}`);
        console.log(`\tleafDigest: ${leafDigest}`);

        // Retrieve via rpc call
        const proofDetails = await session.poe(attestationId, leafDigest);
        const { proof: merkleProof, numberOfLeaves, leafIndex } = proofDetails;
        console.log(`Merkle proof details`);
        console.log(`\tmerkleProof: ${merkleProof}`);
        console.log(`\tnumberOfLeaves: ${numberOfLeaves}`);
        console.log(`\tleafIndex: ${leafIndex}`);
        
        return transactionAccepted;

    } catch (error) {
        console.error('Error in verification process:', error);
        return false;
    }
}

module.exports = { verify };