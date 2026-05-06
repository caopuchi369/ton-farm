# TON Farm

An MVP framework for a Telegram Mini App farming game: plant crops, raid friends, raise pets, trade NFT assets on TON, and settle marketplace payments in Toncoin.

## What Is Included

- Playable Telegram Mini App style frontend: Farm, Bag, Pets, Raid, Market, and Wallet.
- Dependency-free Node server: demo users, land, seed packs, crop crates, pets, raid logs, and market listings.
- Harvest claim flow: backend calculates yield and creates a server signature placeholder for future on-chain minting.
- Marketplace loop: list NFTs, buy listings, and model a 2% fee.
- Contract sketches: `GameAssetCollection`, `GameManager`, and `Marketplace`.
- PostgreSQL schema for users, farm slots, pets, raid logs, harvest claims, and listings.
- TON Connect UI integration for wallet connection and real TON payment signing.

## Run

```bash
npm run dev
```

Open:

```text
http://localhost:4173
```

## TON Connect

The wallet page uses `@tonconnect/ui`. Local development can open the wallet modal. Real TON test payments require:

```bash
TON_TREASURY_ADDRESS=EQxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
APP_URL=https://your-mini-app-domain.example
TELEGRAM_RETURN_URL=https://t.me/your_bot/your_app
```

Telegram Mini App deployment steps are in `docs/deploy-telegram.md`.
Render-specific deployment steps are in `docs/deploy-render.md`.

## Structure

```text
apps/web        Telegram Mini App frontend
apps/server     Minimal API and static file server
contracts       Tact-style contract sketches
db              PostgreSQL schema
docs            Architecture and deployment notes
```

## Next Steps

1. Move in-memory state to PostgreSQL and add Redis for timers and daily limits.
2. Replace demo SHA claims with ed25519 server signatures.
3. Implement and test TON NFT collection, item, GameManager, and Marketplace contracts.
4. Add Telegram Bot launch/startapp invite parameters and persist friend relationships.
5. Deploy to a public HTTPS URL and bind it in BotFather.
