# Contract Deployment Plan

The current contract files are compileable MVP contracts with Sandbox tests. They are still not audited production contracts yet.

## Recommended Stack

- Tact or Tolk for contract implementation.
- Blueprint for build, local sandbox tests, and deployment scripts.
- TON Connect wallet for deployment approval.
- Testnet first, mainnet only after tests and manual review.

Official references:

- TON NFT standard: TEP-62, TEP-64 metadata, TEP-66 royalties.
- TON NFT architecture: collection contract plus one item contract per NFT.
- TON Connect manifest: public `tonconnect-manifest.json` with URL, name, and icon.

## Contracts

| Contract | Purpose | Deploy Order |
| --- | --- | ---: |
| Treasury | Receives fees and mint payments | 1 |
| GameAssetCollection | Mints game NFTs | 2 |
| GameManager | Verifies claims and asks collection to mint | 3 |
| Marketplace | Escrows NFTs, receives TON, splits fees | 4 |

Treasury can be a multisig wallet for MVP instead of a custom contract.

## Environment Variables

After deployment, set these in Render:

```text
TON_NETWORK=testnet
TON_TREASURY_ADDRESS=<treasury wallet>
TREASURY_ADDRESS=<treasury wallet or contract>
GAME_ASSET_COLLECTION_ADDRESS=<collection contract>
GAME_MANAGER_ADDRESS=<manager contract>
MARKETPLACE_ADDRESS=<marketplace contract>
```

For mainnet, change `TON_NETWORK=mainnet` only after the same flow works on testnet.

## MVP Contract Responsibilities

### GameAssetCollection

- Own collection metadata.
- Track `nextItemIndex`.
- Allow minting only from owner or GameManager.
- Mint metadata for Land, SeedPack, CropCrate, Pet, Tool, Decoration.
- Preserve standard NFT get-methods and item transfer behavior.

### GameManager

- Store owner, server signer public key, collection address, treasury address.
- Verify server-signed claims.
- Reject expired claims.
- Reject reused nonces.
- Mint starter pack once per wallet/Telegram hash.
- Mint CropCrate NFT after harvest claim.
- Charge configured fees for upgrades or paid mint actions.

### Marketplace

- List NFT only after NFT transfer notification into escrow.
- Store seller, NFT address, price, and active state.
- On buy, split payment:
  - 98% seller
  - 1.5% developer treasury
  - 0.5% season pool
- Transfer NFT to buyer.
- Return NFT to seller on cancel.
- Return excess TON to buyer.

## Testnet Checklist

1. Run `npm run test:contracts`.
2. Deploy Treasury wallet or multisig.
3. Deploy GameAssetCollection.
4. Deploy GameManager with server signer public key.
5. Set GameAssetCollection manager to the deployed GameManager.
6. Deploy Marketplace with treasury and fee settings.
7. Set Render env variables.
8. Verify `/api/config` shows all contract addresses.
9. Run wallet connection and a small TON payment from the Mini App.

## Local Commands

```bash
npm run build:contracts
npm run test:contracts
```

## Testnet Deploy Commands

Set these environment variables in the terminal before deploying:

```bash
export TREASURY_ADDRESS=<testnet treasury wallet>
export CONTRACT_OWNER_ADDRESS=<optional owner wallet, defaults to deploy wallet>
export SERVER_SIGNER_PUBKEY=0
```

Deploy in this order:

```bash
npm run build:contracts
npx blueprint run deployGameAssetCollection --testnet
export GAME_ASSET_COLLECTION_ADDRESS=<printed collection address>
npx blueprint run deployGameManager --testnet
export GAME_MANAGER_ADDRESS=<printed manager address>
npx blueprint run setGameAssetCollectionManager --testnet
npx blueprint run deployMarketplace --testnet
export MARKETPLACE_ADDRESS=<printed marketplace address>
```

Then set the same addresses in Render:

```text
TON_NETWORK=testnet
TREASURY_ADDRESS=<testnet treasury wallet>
TON_TREASURY_ADDRESS=<testnet treasury wallet>
GAME_ASSET_COLLECTION_ADDRESS=<collection address>
GAME_MANAGER_ADDRESS=<manager address>
MARKETPLACE_ADDRESS=<marketplace address>
```

For mainnet, repeat the flow with mainnet wallets only after testnet checks pass.

## Mainnet Gate

Do not mainnet deploy until:

- Testnet NFT transfer works end to end.
- Marketplace cancel and refund paths are tested.
- Claim signature and nonce replay tests pass.
- Fees match `config/economy.json`.
- Treasury is not a single hot wallet for meaningful balances.
