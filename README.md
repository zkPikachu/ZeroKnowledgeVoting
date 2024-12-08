# ZeroKnowledgeVoting

## Introduction
ZeroKnowledgeVoting is a demo application showcasing a zero-knowledge voting system using zk-SNARKs. It allows voters to cast votes anonymously while ensuring the integrity of the voting process. Results are displayed in real-time.

## Prerequisites
- Ensure [Node.js](https://nodejs.org/) is installed. The demo has been tested with **Node.js v23.3.0**.
- You need wallets funded with:
  - **ACME tokens** for zkVerify operations.
  - **Sepolia ETH** for Ethereum transactions.

## Setup Instructions

1. Clone the repository:
   ```bash
   git clone git@github.com:zkPikachu/ZeroKnowledgeVoting.git
   ```

2. Navigate to the project directory:
   ```bash
   cd ZeroKnowledgeVoting
   ```

3. Move to the `app` folder:
   ```bash
   cd app
   ```

4. Set up environment variables:
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

5. Install dependencies:
   ```bash
   npm install
   ```

6. Initialize the voting poll:
   ```bash
   npm run init-poll
   ```
   - This command registers voters from `voterRegistry.json` and generates the `voterMapping.json` file. You can vote using one of the account addresses listed in `voterRegistry.json`.

7. Start the application:
   ```bash
   npm start
   ```

8. Open the application in your browser:
   - To cast a vote, go to: [http://localhost:3000](http://localhost:3000)
   - To view voting results, go to: [http://localhost:3001](http://localhost:3001)

## Usage
- **Voting:** Enter your account address (from `voterRegistry.json`) and choose a candidate to cast your vote.
- **Results:** View the real-time voting results on the results page.

## Example `.env` and `.env.secrets`

### `.env`
```plaintext
ZKV_RPC_URL="wss://testnet-rpc.zkverify.io"
ETH_RPC_URL="https://ethereum-sepolia-rpc.publicnode.com"

ETH_ZKVERIFY_CONTRACT_ADDRESS=0x209f82A06172a8d96CF2c95aD8c42316E80695c1
ETH_APP_CONTRACT_ADDRESS=0x2719FB1f292C434305cefe52d82e2A53CecDcF85
```

### `.env.secrets`
```plaintext
ZKV_SEED_PHRASE="your wallet seed phrase with ACME tokens"
ETH_SECRET_KEY=your ethereum wallet private key starting with 0x
```

## Notes
- Ensure your wallets are sufficiently funded before running the application.
- For more information, refer to the source code or contact the repository owner.

## License
This project is licensed under the MIT License.
