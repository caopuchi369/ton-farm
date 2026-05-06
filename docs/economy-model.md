# TON Farm Economy Model

This document is the operating rulebook for the MVP economy. The machine-readable source is `config/economy.json`.

## Core Principles

- Toncoin is the settlement currency for on-chain NFT minting and NFT marketplace transactions.
- Crop Crate NFTs are not redeemed by the system for fixed TON payouts.
- The game does not promise yield, income, APY, dividends, or buybacks.
- No project token is issued in the MVP.
- Telegram Stars should be used for ordinary non-chain digital services sold inside Telegram.

## MVP Assets

| Asset | MVP Role | Chain Treatment |
| --- | --- | --- |
| Land NFT | Farm slots and farm ownership | Minted by GameAssetCollection |
| Seed Pack NFT | Bundled seed inventory | Minted by GameAssetCollection |
| Crop Crate NFT | Harvest result and upgrade material | Minted from server-signed GameManager claims |
| Pet NFT | Guard, raid, yield bonus | Minted by starter pack or shop |
| Tool NFT | Consumable boosts and defense | Minted by shop/rewards |
| Decoration NFT | Cosmetic and light status | Later season reward |

## Fees

Marketplace fee:

```text
2.00% total
1.50% developer treasury
0.50% season reward pool
```

Example:

```text
Sale price: 1.00 TON
Seller receives: 0.98 TON
Developer treasury receives: 0.015 TON
Season pool receives: 0.005 TON
```

## Initial Prices

| Action | MVP Price |
| --- | ---: |
| Starter pack | 0 TON |
| Common land expansion | 0.20 TON |
| Carrot seed pack | 0.02 TON |
| Tomato seed pack | 0.05 TON |
| Strawberry seed pack | 0.10 TON |
| Pet egg | 0.15 TON |
| Tool pack | 0.03 TON |

## Crop Timing

| Crop | Growth | Yield | Seed Pack |
| --- | ---: | ---: | ---: |
| Carrot | 30 minutes | 10-15 | 20 seeds |
| Tomato | 120 minutes | 25-40 | 10 seeds |
| Strawberry | 360 minutes | 40-70 | 5 seeds |

## Sinks

Crop Crate NFTs need continuous sinks so supply does not inflate forever:

- Pet upgrades
- Land expansion
- Advanced seed synthesis
- Tool consumption
- Season entry
- Cosmetic decoration crafting

## Anti-Abuse Limits

| Limit | Value |
| --- | ---: |
| Daily raid attempts | 20 |
| Same friend daily raid attempts | 3 |
| Max loss per land | 20% |
| Advanced crop lock for new accounts | 24 hours |

## Launch Recommendation

Deploy contracts to testnet first and run at least one closed season before mainnet minting:

1. Free starter assets on testnet.
2. Testnet marketplace with small prices.
3. Verify inventory indexing and refund paths.
4. Freeze MVP economy parameters.
5. Deploy mainnet contracts and set Render environment addresses.
