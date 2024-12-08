const express = require("express");
const bodyParser = require("body-parser");
const { generateProof } = require("./generateProof.js");
const { verify } = require("./zkverify.js");
const { download } = require("./saveToFile.js");
const appRoot = require("app-root-path");
const fs = require("fs");
const path = require("path");

// Initialize Express apps
const votingApp = express();
const resultsApp = express();

// Define Ports
const VOTING_PORT = 3000;
const RESULTS_PORT = 3001;

// Middleware to parse JSON and URL-encoded form data
votingApp.use(bodyParser.json());
votingApp.use(bodyParser.urlencoded({ extended: true }));

// Define Candidate Mappings
const candidateMap = {
    "Donald Trump": 0,
    "Kamala Harris": 1
};

const reverseCandidateMap = {
    0: "Donald Trump",
    1: "Kamala Harris"
};

// Path to votingResults.json
const votingResultsPath = path.join(appRoot.path, "votingResults.json");

// Initialize votingResults.json if it doesn't exist
if (!fs.existsSync(votingResultsPath)) {
    const initialResults = {
        votes: {
            "Donald Trump": 0,
            "Kamala Harris": 0
        },
        votingID: "initialVotingID", // Consider generating a unique ID using a library like 'uuid'
        spentTickets: {}
    };
    fs.writeFileSync(votingResultsPath, JSON.stringify(initialResults, null, 2), "utf8");
}

// Serve the Voting Page
votingApp.get("/", (req, res) => {
    res.send(`
        <html>
        <head>
            <title>Secure Voting System</title>
        </head>
        <body>
            <h1>Cast your vote</h1>
            <form id="voteForm">
                <label for="address">Account Address:</label><br>
                <input type="text" id="address" name="address" required><br><br>
                <label for="vote">Choose your candidate:</label><br>
                <select id="vote" name="vote" required>
                    <option value="Donald Trump">Donald Trump</option>
                    <option value="Kamala Harris">Kamala Harris</option>
                </select><br><br>
                <button type="submit">Submit Vote</button>
            </form>
            <div id="message"></div>
            <script>
                document.getElementById("voteForm").onsubmit = async function(event) {
                    event.preventDefault(); // Prevent form from reloading the page
                    const address = document.getElementById("address").value;
                    const vote = document.getElementById("vote").value;
                    const messageDiv = document.getElementById("message");
                    
                    // Display loading message
                    messageDiv.innerHTML = "<h2>Please wait while your vote is being verified...</h2>";
                    
                    try {
                        // Send vote data to the server
                        const response = await fetch("/vote", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({ address, vote }),
                        });

                        const result = await response.text();
                        messageDiv.innerHTML = result; // Display server response
                    } catch (error) {
                        messageDiv.innerHTML = "<h2>Error occurred while processing your vote.</h2>";
                    }
                };
            </script>
        </body>
        </html>
    `);
});

// Handle Vote Submission
votingApp.post("/vote", async (req, res) => {
    const addr = req.body.address;
    const vote = req.body.vote;

    // Input Validation
    if (!addr || !vote) {
        return res.send(`
            <h1>Error: Address and vote are required.</h1>
            <form action="/" method="GET">
                <button type="submit">Return to Voting Page</button>
            </form>
        `);
    }

    try {
        // Validate Vote Choice
        if (!(vote in candidateMap)) {
            throw new Error("Invalid vote choice.");
        }

        // Convert Candidate Name to Numerical Vote
        const numericalVote = candidateMap[vote]; // 0 or 1

        // Run the Voting Process with Numerical Vote
        const { proof, publicSignals } = await generateProof(addr, numericalVote);

        const ticket = {
            proof: proof,
            publicSignals: publicSignals,
        };

        // Save the Ticket Locally (Optional)
        await download(ticket, "ticket");

        // Read Voting Results
        const resultData = fs.readFileSync(votingResultsPath, "utf8");
        const result = JSON.parse(resultData);

        const votingID = publicSignals[0];
        const nullifier = publicSignals[1];

        // Verify the Voting ID Matches
        if (result.votingID !== votingID) {
            throw new Error("Mismatched votingID. Voting session integrity compromised.");
        }

        // Check if the Ticket (Nullifier) is Already Spent
        if (result["spentTickets"][nullifier] === 1) {
            throw new Error("Ticket already spent. Vote not recorded.");
        }

        // Verify the Proof
        const isValid = await verify(proof, publicSignals);
        if (!isValid) {
            throw new Error("Proof verification failed. Vote not recorded.");
        }

        // Update the Vote Count for the Selected Candidate
        if (vote === "Donald Trump" || vote === "Kamala Harris") {
            result["votes"][candidateMap[vote]] += 1;            
        } else {
            throw new Error("Invalid vote choice.");
        }

        // Mark the Ticket as Spent
        result["spentTickets"][nullifier] = 1;

        // Save the Updated Voting Results
        fs.writeFileSync(votingResultsPath, JSON.stringify(result, null, 2), "utf8");

        // Send Success Response to the Client
        res.send(`
            <h1>Vote casted successfully!</h1>
            <form action="/" method="GET">
                <button type="submit">Return to Voting Page</button>
            </form>
        `);
    } catch (error) {
        // Send Error Response to the Client
        res.send(`
            <h1>Error: ${error.message}</h1>
            <form action="/" method="GET">
                <button type="submit">Return to Voting Page</button>
            </form>
        `);
    }
});

// Start the Voting Server
votingApp.listen(VOTING_PORT, () => {
    console.log(`Voting server is running on http://localhost:${VOTING_PORT}`);
});

// Serve the Voting Results on a Different Port
resultsApp.get("/", (req, res) => {
    try {
        // Read Voting Results
        const resultData = fs.readFileSync(votingResultsPath, "utf8");
        const result = JSON.parse(resultData);

        const votes = result.votes;

        // Send the Voting Results Page
        res.send(`
            <html>
            <head>
                <title>Voting Results</title>
            </head>
            <body>
                <h1>Voting Results</h1>
                <p><strong>Donald Trump:</strong> ${votes[0]}</p>
                <p><strong>Kamala Harris:</strong> ${votes[1]}</p>
                <form action="/" method="GET">
                    <button type="submit">Refresh Results</button>
                </form>
            </body>
            </html>
        `);
    } catch (error) {
        // Send Error Response if Reading Results Fails
        res.send(`
            <h1>Error reading voting results.</h1>
            <p>${error.message}</p>
        `);
    }
});

// Start the Results Server on a Different Port
resultsApp.listen(RESULTS_PORT, () => {
    console.log(`Results server is running on http://localhost:${RESULTS_PORT}`);
});
