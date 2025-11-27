# MintSphereX

MintSphereX lets anyone mint ERC721 NFTs that contain a fully homomorphically encrypted “sphere” score randomly generated on-chain between 1 and 100. The sphere value stays private to the owner and can be decrypted only through Zama’s relayer flow, even after secondary transfers.

## Why MintSphereX
- Preserves privacy for collectible traits while keeping the mint and ownership on-chain.
- Uses Zama’s FHEVM so the chain never sees cleartext values, yet owners retain decrypt access.
- Eliminates central servers for randomness or reveals; the contract derives the value on-chain and binds access control to token ownership.
- Provides a complete reference: audited Solidity patterns, deploy scripts, tasks, tests, and a production-ready React dapp without mock data.

## Capabilities & Advantages
- **Encrypted traits**: Sphere value stored as `euint16`; ACL automatically updates on transfer so new owners can decrypt.
- **On-chain randomness**: Generates a bounded random value (1–100) during mint via `FHE.randEuint32`.
- **Owner-only decrypt**: Frontend integrates the Zama relayer SDK to request user decryption; CLI task available for developers.
- **Wallet-first UX**: Minting with ethers (writes) and data fetching with viem (reads) via wagmi/RainbowKit; no local storage or localhost networks in the UI.
- **Repeatable deployments**: Hardhat Deploy scripts and stored artifacts in `deployments/` keep ABI/address in sync with the frontend.
- **Typed testing**: TypeChain factories and Hardhat/Chai tests validate minting, ACL propagation, and metadata reads.

## Tech Stack
- **Smart contracts**: Solidity 0.8.27, Hardhat, Hardhat Deploy, FHEVM Solidity library, TypeChain, Hardhat Verify, Solidity Coverage.
- **Frontend**: React 19 + Vite + TypeScript, wagmi/viem (reads), ethers (writes), RainbowKit, @tanstack/react-query, @zama-fhe/relayer-sdk.
- **Tooling**: ESLint, Prettier, Hardhat Gas Reporter, chai/mocha test stack.

## Project Layout
```
contracts/            MintSphereNFT core contract (encrypted sphere metadata)
deploy/               Hardhat Deploy scripts (deploy.ts)
deployments/          Generated deployments (use Sepolia ABI/address for the app)
tasks/                Custom Hardhat tasks (address, mint, decrypt)
test/                 Contract tests (MintSphereNFT.ts)
docs/                 Zama FHE references (zama_llm.md, zama_doc_relayer.md)
app/                  React + Vite frontend (no env vars; uses contract config file)
```

## Core Design
- **Contract**: `MintSphereNFT` mints ERC721 tokens, stores encrypted sphere values and timestamps, and exposes view helpers (`tokensOfOwner`, `getTokenMetadata`, `getSphereCiphertext`, `totalSupply`). ACL is granted to the contract and the token owner; transfers re-grant owner access.
- **Random sphere generation**: `FHE.randEuint32` -> modulus 100 -> `+1` to produce 1–100.
- **Metadata**: `tokenURI` uses a configurable base URI; ownership is tracked with enumerations for quick wallet queries.
- **Security**: No `msg.sender` usage inside view functions; ownership checks gate privileged paths.

## Backend Setup
1) Prerequisites: Node.js 20+, npm.
2) Install dependencies: `npm install`
3) Useful scripts (root):
   - `npm run compile` — build contracts
   - `npm run test` — run Hardhat tests (mock FHEVM on Hardhat network)
   - `npm run coverage` — solidity-coverage
   - `npm run lint` — solhint + ESLint + Prettier check
   - `npm run chain` — start a local Hardhat node
   - `npm run deploy:localhost` — deploy to a running local node

### Environment for testnets
Create `.env` (used by Hardhat config):
```
INFURA_API_KEY=your_infura_key
PRIVATE_KEY=your_private_key   # use a private key, do not use a mnemonic
ETHERSCAN_API_KEY=optional_for_verification
```
`hardhat.config.ts` reads `INFURA_API_KEY` and `PRIVATE_KEY`; Sepolia URL is built with Infura. Accounts array is set only when `PRIVATE_KEY` is present.

### Deploying
- Local: `npm run chain` (in one terminal), then `npm run deploy:localhost`.
- Sepolia: ensure `.env` is set, then `npm run deploy:sepolia`. Verify with `npm run verify:sepolia -- <DEPLOYED_ADDRESS>` if desired. Deployment artifacts land in `deployments/sepolia/` and should be the single source of truth for ABI/address.

### Hardhat Tasks
- Print address: `npx hardhat task:address --network <network>`
- Mint: `npx hardhat task:mint-sphere --network <network> [--receiver 0x...]`
- Decrypt (developer CLI): `npx hardhat task:decrypt-sphere --token-id <id> --network <network>`

## Frontend Usage (`app/`)
1) Install: `cd app && npm install`
2) Configure contract:
   - Copy the ABI and address from `deployments/sepolia/MintSphereNFT.json`.
   - Paste them into `app/src/config/contracts.ts` (`CONTRACT_ABI`, `CONTRACT_ADDRESS`). The app does not use environment variables.
3) Run dev server: `npm run dev` (connect with a Sepolia-capable wallet). For production builds, use `npm run build` then `npm run preview`.

### Frontend Experience
- **Mint tab**: Mint a Sphere NFT; shows total supply and transaction hash.
- **Collection tab**: Lists owned token IDs, ciphertext handles, minted time, and token URI. Decryption uses the Zama relayer SDK with EIP-712 signing to reveal the owner-only sphere value.
- Reads use viem/public client; writes use ethers with the connected signer. No mock data or localhost chains are used.

## Problems Solved
- Keeps NFT trait values confidential on-chain via FHE while staying fully decentralized.
- Ensures only token owners can decrypt, even after transfers, by updating ACL on every ownership change.
- Removes reliance on off-chain randomness or reveals; randomness and binding happen on-chain.
- Provides end-to-end references (contract, tasks, frontend) for building private-by-default collectibles.

## Testing
- Unit tests: `npm run test` (Hardhat, chai, FHEVM mock). Tests cover minting flow, ACL propagation on transfer, metadata reads, and bounded randomness checks.
- Coverage: `npm run coverage` for solidity-coverage output.

## Future Work
- Expand metadata (e.g., encrypted attributes, dynamic base URI management).
- Add front-end niceties like historical decrypt logs and richer visualizations per sphere value.
- Integrate additional networks once FHEVM support matures beyond Sepolia.
- Optional contract enhancements: admin rotation patterns, pausable minting, and on-chain rate limiting for decrypt requests.

## Reference Docs
- Zama FHEVM guides in `docs/zama_llm.md` and `docs/zama_doc_relayer.md`.
- Hardhat config and scripts live at `hardhat.config.ts` and `deploy/deploy.ts`.

## License
BSD-3-Clause-Clear. See `LICENSE`.
