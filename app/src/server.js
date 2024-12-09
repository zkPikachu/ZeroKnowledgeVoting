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
<!DOCTYPE html>
<html>
<head>
    <title>Secure Voting System</title>
    <style>
        /* Updated styles for modern look */
        body {
            margin: 0;
            font-family: 'Roboto', Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: rgba(0, 0, 0, 0.7) url('https://via.placeholder.com/1920x1080') center/cover no-repeat;
        }

        .card {
            background: rgba(255, 255, 255, 0.95);
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.25);
            border-radius: 12px;
            padding: 30px;
            max-width: 420px;
            width: 100%;
            margin: 20px 15px;
            text-align: center;
        }

        h1 {
            font-size: 2rem;
            margin-bottom: 25px;
            color: #333;
        }

        label {
            display: block;
            font-weight: 500;
            margin: 1.5rem 0 0.5rem;
            text-align: left;
            color: #444;
        }

        .input-container {
            position: relative;
            margin-bottom: 30px;
        }

        .input-container svg {
            position: absolute;
            top: 50%;
            left: 12px;
            transform: translateY(-50%);
            fill: #555;
            width: 22px;
            height: 22px;
        }

        input[type="text"], select {
            width: calc(95% - 50px);
            padding: 12px 12px 12px 50px;
            border: 1px solid #ccc;
            border-radius: 8px;
            font-size: 1rem;
            background-color: #f3f4f6;
            transition: border-color 0.3s, box-shadow 0.3s;
        }

        select  {
          width: 100%;
        }

        input[type="text"]:focus, select:focus {
            border-color: #5b21b6;
            box-shadow: 0 0 5px rgba(91, 33, 182, 0.5);
            outline: none;
        }

        select {
            width: 100%;
        }

        button {
            background-color: #5b21b6;
            color: #fff;
            padding: 15px;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            cursor: pointer;
            transition: background-color 0.3s;
            width: 100%;
            margin-top: 20px;
        }

        button:hover {
            background-color: #3b0b9e;
        }

        #message {
            margin-top: 25px;
        }

        #message h2 {
            font-size: 1.1rem;
            color: #555;
        }

        @media (max-width: 600px) {
            .card {
                padding: 20px;
            }

            h1 {
                font-size: 1.8rem;
            }

            button {
                font-size: 0.9rem;
                padding: 12px;
            }
        }
    </style>
</head>
<body>
    <div class="card">
        <h1>Cast your vote</h1>
        <form id="voteForm">
            <label for="address">Account Address:</label>
            <div class="input-container">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z"/></svg>
                <input placeholder="Account Address" type="text" id="address" name="address" required>
            </div>

            <label for="vote">Choose your candidate:</label>
            <select id="vote" name="vote" required>
                <option value="Donald Trump">Donald Trump</option>
                <option value="Kamala Harris">Kamala Harris</option>
            </select>

            <button type="submit">Submit Vote</button>
        </form>
        <div id="message"></div>
    </div>

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
            <div style="background-color: #fff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); border-radius: 10px; padding: 20px; max-width: 400px; width: 100%; margin-bottom: 20px;">
                <h1 style="font-size: 1.8rem; margin-bottom: 20px; color: #28a745;">Vote casted successfully!</h1>
                <a  style="background-color: #007bff; color: #fff; padding: 10px 15px; border: none; border-radius: 5px; font-size: 1rem; cursor: pointer; width: 100%;" href="http://localhost:3001">Go to list</a>
            </div>
        `);
    } catch (error) {
        // Send Error Response to the Client
        res.send(`
          <div style="background-color: #fff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); border-radius: 10px; padding: 20px; max-width: 400px; width: 100%;">
              <h1 style="font-size: 1.8rem; margin-bottom: 20px; color: #dc3545;">Error: ${error.message}</h1>
              <a  style="background-color: #007bff; color: #fff; padding: 10px 15px; border: none; border-radius: 5px; font-size: 1rem; cursor: pointer; width: 100%;" href="http://localhost:3000">Return to Voting Page</a>
          </div>
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
          <!DOCTYPE html>
          <html>
          <head>
              <title>Voting Results</title>
              <style>
              /* Updated styles for modern look */
              body {
                  margin: 0;
                  font-family: 'Roboto', Arial, sans-serif;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  min-height: 100vh;
                  background: rgba(0, 0, 0, 0.7) url('https://via.placeholder.com/1920x1080') center/cover no-repeat;
              }

              .card {
                  background: rgba(255, 255, 255, 0.95);
                  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.25);
                  border-radius: 12px;
                  padding: 30px;
                  max-width: 420px;
                  width: 100%;
                  margin: 20px 15px;
                  text-align: center;
              }

              h1 {
                  font-size: 2rem;
                  margin-bottom: 25px;
                  color: #333;
              }

              label {
                  display: block;
                  font-weight: 500;
                  margin: 1.5rem 0 0.5rem;
                  text-align: left;
                  color: #444;
              }

              .input-container {
                  position: relative;
                  margin-bottom: 30px;
              }

              .input-container svg {
                  position: absolute;
                  top: 50%;
                  left: 12px;
                  transform: translateY(-50%);
                  fill: #555;
                  width: 22px;
                  height: 22px;
              }

              input[type="text"], select {
                  width: calc(95% - 50px);
                  padding: 12px 12px 12px 50px;
                  border: 1px solid #ccc;
                  border-radius: 8px;
                  font-size: 1rem;
                  background-color: #f3f4f6;
                  transition: border-color 0.3s, box-shadow 0.3s;
              }

              select  {
                width: 100%;
                text-align: start;
              }

              input[type="text"]:focus, select:focus {
                  border-color: #5b21b6;
                  box-shadow: 0 0 5px rgba(91, 33, 182, 0.5);
                  outline: none;
              }

              select {
                  width: 100%;
              }

              button {
                  background-color: #5b21b6;
                  color: #fff;
                  padding: 15px;
                  border: none;
                  border-radius: 8px;
                  font-size: 1rem;
                  cursor: pointer;
                  transition: background-color 0.3s;
                  width: 100%;
                  margin-top: 20px;
              }

              button:hover {
                  background-color: #3b0b9e;
              }

              #message {
                  margin-top: 25px;
              }

              #message h2 {
                  font-size: 1.1rem;
                  color: #555;
              }

              @media (max-width: 600px) {
                  .card {
                      padding: 20px;
                  }

                  h1 {
                      font-size: 1.8rem;
                  }

                  button {
                      font-size: 0.9rem;
                      padding: 12px;
                  }
              }
              </style>
          </head>
          <body>
              <div class="card">
                  <h1>Voting Results</h1>
                  <p><strong>Donald Trump:</strong> ${votes[0]}</p>
                  <p><strong>Kamala Harris:</strong> ${votes[1]}</p>
                  <form action="/" method="GET">
                      <button type="submit">Refresh Results</button>
                  </form>
              </div>
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
