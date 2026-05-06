# TON Farm MVP Architecture

## Scope

This repository is a minimal landing framework for a Telegram farm and pet game using TON NFT assets and Toncoin settlement.

The playable demo keeps game state in memory and simulates on-chain actions. The intended production split is:

- Telegram Mini App: farm UI, inventory, pets, friend stealing, marketplace, wallet page.
- Backend: timers, friend graph, anti-cheat, claim signing, inventory index.
- TON contracts: NFT ownership, minting, marketplace settlement, fee routing.
- Wallet: TON Connect transaction signing.

## MVP Loop

1. Claim or own a common Land NFT with six slots.
2. Spend one Seed Pack NFT unit to plant a crop.
3. Wait until the crop is ready.
4. Friends can steal mature crops; pets and tools change the result.
5. Harvest generates a server-signed claim and mints a Crop Crate NFT.
6. Crop Crate NFTs can be used for pet upgrades or listed on the TON marketplace.

## Production Replacement Points

- Replace `apps/server/index.mjs` in-memory maps with PostgreSQL tables from `db/schema.sql`.
- Replace demo wallet state with `@tonconnect/ui`.
- Replace demo market transfer with real NFT transfer to `Marketplace`.
- Replace SHA claim signatures with ed25519 signatures verified by `GameManager`.
- Add an indexer for NFT mint, transfer, listing, sale, and cancel events.

## Compliance Boundary

Use Toncoin for on-chain NFT minting and NFT marketplace settlement. Use Telegram Stars for non-chain digital services sold directly inside the bot or Mini App.
