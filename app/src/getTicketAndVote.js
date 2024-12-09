const { generateProof } = require('./generateProof.js');
const { verify } = require('./zkverify.js');
const appRoot = require('app-root-path');
const prompt = require('prompt-sync')();
const { download } = require('./saveToFile.js');
const result = require(`${appRoot}/votingResults.json`);

async function main() {
  try {
    const addr = prompt('Enter your account address: ');
    if (!addr || addr.trim() === "") {
      throw new Error("Address is required");
    }

    const vote = prompt('Enter your vote (e.g., 0 or 1): ');
    if (isNaN(vote)) {
      throw new Error("Vote must be a valid number");
    }

    // Generate the proof and public signals
    const { proof, publicSignals } = await generateProof(addr, vote);

    const ticket = {
      proof: proof,
      publicSignals: publicSignals
    };

    console.log("Generated Ticket:", ticket);

    // Save the ticket locally
    await download(ticket, "ticket");
    console.log("Ticket saved successfully!");

    // Extract votingID and nullifier from publicSignals
    const votingID = publicSignals[0];
    const nullifier = publicSignals[1];

    // Verify the votingID matches the one in result.json
    if (result.votingID !== votingID) {
      throw new Error("Mismatched votingID. Voting session integrity compromised.");
    }

    // // Check if this ticket (nullifier) is already spent
    // if (result["spentTickets"][nullifier] === 1) {
    //   throw new Error("Ticket already spent. Vote not recorded.");
    // }

    // Verify the proof
    const isValid = await verify(proof, publicSignals);
    if (!isValid) {
      throw new Error("Proof verification failed. Vote not recorded.");
    }

    // If proof is valid and ticket is not spent, update result.json
    result["votes"][vote] = (result["votes"][vote] || 0) + 1;
    result["votingID"] = votingID;
    result["spentTickets"][nullifier] = 1; // Mark this ticket as spent

    // Save updated results
    await download(result, "votingResults");
    console.log("Vote casted and results updated successfully!");

  } catch (error) {
    console.error("Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Unhandled Error:", error.message);
    process.exit(1);
  });