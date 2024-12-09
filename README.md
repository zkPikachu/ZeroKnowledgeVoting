# ZeroKnowledgeVoting

## Introduction
ZeroKnowledgeVoting is a demo application showcasing a zero-knowledge voting system using zk-SNARKs. It allows voters to cast votes anonymously while ensuring the integrity of the voting process. Results are displayed in real-time. This project leverages zkVerify's public, permissionless ZK-proof verification blockchain to enhance trust and transparency.


### Hackathon Alignment

This project aligns with the zkVerify Hackathon’s objectives by:

- **Leveraging zkVerify**: It uses zkVerify’s Groth16 verifier on the BN-254 curve to validate zero-knowledge proofs.
- **Promoting Decentralization**: Demonstrates a real-world use case of decentralized proof verification for secure and anonymous voting.
- **Innovative Application**: Showcases how ZKPs can enhance trust, privacy, and transparency in democratic processes.



## Setup Instructions

### Prerequisites
- Ensure [Node.js](https://nodejs.org/) is installed. The demo has been tested with **Node.js v23.3.0**.
- You need wallets funded with:
  - **ACME tokens** for zkVerify operations.
  - **Sepolia ETH** for Ethereum transactions.
### Instructions
1. Clone the repository:
   ```bash
   git clone git@github.com:zkPikachu/ZeroKnowledgeVoting.git
   ```

2. Navigate to the project directory:
   ```bash
   cd ZeroKnowledgeVoting
   ```
3. Move to the `contracts`folder:   

 ```bash
   cd contracts
   ```
4. Set up environment variables:
   - Create a `.env` file using `env.template` as an example:
     ```bash
     cp env.template .env
     ```
5. Navigate to the `src` folder and find the `zkVote.sol` smart contract. 
This contains the Solidity code for your voting Smart Contract. 

6. Visit [Remix Ethereum IDE](https://remix.ethereum.org/) and ensure your wallet is connected to the Sepolia Testnet.

7. Copy `zkVote.sol` code and paste it into a new file in Remix.
8. Set Constructor Parameters:
-   In `zkVote.sol`, the constructor requires:
    * `_zkvContract`: The address of the zkVerify contract.
    * `_vkHash`: The verification key hash for your circuit.
- These parameters are stored in your `.env` file in your project folder `contracts`.

9. Deploy the Contract to Sepolia and copy the deployed contract address. Ensure the Ethereum address used to deploy the contract is the one you’re using for the app (`ETH_SECRET_KEY` should be the private key for that address).
10. Paste the contract address into the `.env.template` file in your app folder as `ETH_APP_CONTRACT_ADDRESS` 

11. Move to the `app` folder:
   ```bash
   cd ../../app

   ```

12. Set up environment variables:
   - Create a `.env` file using `env.template` as an example:
     ```bash
     cp env.template .env
     ```
   - Create a `.env.secrets` file using `env.secrets.template` as an example:
     ```bash
     cp env.secrets.template .env.secrets
     ```
     - In `.env.secrets`:
       - `ZKV_SEED_PHRASE`: The seed phrase of a wallet with sufficient **ACME tokens**.
       - `ETH_SECRET_KEY`: The secret key of an Ethereum wallet with sufficient **Sepolia ETH**.

13. Install dependencies:
   ```bash
   npm install
   ```

14. Initialize the voting poll:
   ```bash
   npm run init-poll
   ```
   - This command registers voters from `voterRegistry.json` and generates the `voterMapping.json` file. You can vote using one of the account addresses listed in `voterRegistry.json`.

15. Start the application:
   ```bash
   npm start
   ```

16. Open the application in your browser:
   - To cast a vote, go to: [http://localhost:3000](http://localhost:3000)
   - To view voting results, go to: [http://localhost:3001](http://localhost:3001)

This process submits a transaction to the App Contract, including the necessary attestation details obtained from ZKVerify (such as the attestation ID and Merkle path). Upon successful submission and validation, the App Contract confirms and acknowledges that your vote has been casted.

## Usage
- **Voting:** Enter your account address (from `voterRegistry.json`) and choose a candidate to cast your vote.
- **Results:** View the real-time voting results on the results page.

### Example `.env` and `.env.secrets`

#### `.env`
```plaintext
ZKV_RPC_URL="wss://testnet-rpc.zkverify.io"
ETH_RPC_URL="https://ethereum-sepolia-rpc.publicnode.com"

ETH_ZKVERIFY_CONTRACT_ADDRESS=0x209f82A06172a8d96CF2c95aD8c42316E80695c1
ETH_APP_CONTRACT_ADDRESS=0x2719FB1f292C434305cefe52d82e2A53CecDcF85
```

#### `.env.secrets`
```plaintext
ZKV_SEED_PHRASE="your wallet seed phrase with ACME tokens"
ETH_SECRET_KEY=your ethereum wallet private key starting with 0x
```
### Notes
- Ensure your wallets are sufficiently funded before running the application.
- For more information, refer to the source code or contact the repository owner.

## Technical Architecture


1. **App**:

   - The Node.js backend handles proof generation, verification, and interaction with the blockchain.
   - Provides APIs for vote submission and results display.

2. **Frontend**:

   - Web-based UI built using HTML and JavaScript for casting votes and viewing results.

3. **zk-SNARK Circuit**:

   - Written in `circom`, the circuit enforces rules such as verifying Merkle paths, vote commitments, and nullifiers.
   - Uses `groth16` as the proving system.

4. **zkVote Smart Contract**:

   - A Solidity contract deployed on the Ethereum blockchain.
   - Integrates with the zkVerify platform for off-chain proof verification and ensures rules like no double voting.



## License
This project is licensed under the MIT License.
