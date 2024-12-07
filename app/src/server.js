const express = require("express");
const bodyParser = require("body-parser");
const { generateProof } = require("./generateProof.js");
const { verify } = require("./zkverify.js");
const { download } = require("./saveToFile.js");
const appRoot = require("app-root-path");
const fs = require("fs");

const app = express();
const PORT = 3000;

// Middleware to parse JSON and URL-encoded form data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve the voting page
app.get("/", (req, res) => {
    res.send(`
        <html>
        <body>
            <h1>Cast Your Vote</h1>
            <form id="voteForm">
                <label for="address">Account Address:</label><br>
                <input type="text" id="address" name="address" required><br><br>
                <label for="vote">Vote (0 or 1):</label><br>
                <select id="vote" name="vote" required>
                    <option value="0">0</option>
                    <option value="1">1</option>
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

// Handle vote submission
app.post("/vote", async (req, res) => {
    const addr = req.body.address;
    const vote = req.body.vote;

    if (!addr || !vote) {
        return res.send(`
            <h1>Error: Address and vote are required.</h1>
            <form action="/" method="GET">
                <button type="submit">Return to Voting Page</button>
            </form>
        `);
    }

    try {
        // Run the voting process
        const { proof, publicSignals } = await generateProof(addr, vote);

        const ticket = {
            proof: proof,
            publicSignals: publicSignals,
        };

        // Save the ticket locally (optional)
        await download(ticket, "ticket");

        const resultPath = `${appRoot}/votingResults.json`;
        const result = JSON.parse(fs.readFileSync(resultPath, "utf8"));

        const votingID = publicSignals[0];
        const nullifier = publicSignals[1];

        // Verify the votingID matches
        if (result.votingID !== votingID) {
            throw new Error("Mismatched votingID. Voting session integrity compromised.");
        }

        // Check if the ticket (nullifier) is already spent
        if (result["spentTickets"][nullifier] === 1) {
            throw new Error("Ticket already spent. Vote not recorded.");
        }

        // Verify the proof
        const isValid = await verify(proof, publicSignals);
        if (!isValid) {
            throw new Error("Proof verification failed. Vote not recorded.");
        }

        // Update the result if valid
        result["votes"][vote] = (result["votes"][vote] || 0) + 1;
        result["spentTickets"][nullifier] = 1;

        // Save the updated results
        fs.writeFileSync(resultPath, JSON.stringify(result, null, 2), "utf8");

        res.send(`
            <h1>Vote casted successfully!</h1>
            <form action="/" method="GET">
                <button type="submit">Return to Voting Page</button>
            </form>
        `);
    } catch (error) {
        res.send(`
            <h1>Error: ${error.message}</h1>
            <form action="/" method="GET">
                <button type="submit">Return to Voting Page</button>
            </form>
        `);
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
