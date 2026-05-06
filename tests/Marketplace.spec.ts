import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano } from '@ton/core';
import { Marketplace } from '../build/Marketplace/Marketplace_Marketplace';
import '@ton/test-utils';

describe('Marketplace', () => {
  let blockchain: Blockchain;
  let owner: SandboxContract<TreasuryContract>;
  let seller: SandboxContract<TreasuryContract>;
  let buyer: SandboxContract<TreasuryContract>;
  let nft: SandboxContract<TreasuryContract>;
  let treasury: SandboxContract<TreasuryContract>;
  let marketplace: SandboxContract<Marketplace>;

  beforeEach(async () => {
    blockchain = await Blockchain.create();
    owner = await blockchain.treasury('owner');
    seller = await blockchain.treasury('seller');
    buyer = await blockchain.treasury('buyer');
    nft = await blockchain.treasury('nft');
    treasury = await blockchain.treasury('treasury');

    marketplace = blockchain.openContract(await Marketplace.fromInit(owner.address, treasury.address));
    await marketplace.send(owner.getSender(), { value: toNano('0.05') }, null);
  });

  it('lists and buys a fixed-price NFT listing', async () => {
    await marketplace.send(
      seller.getSender(),
      { value: toNano('0.05') },
      {
        $$type: 'ListNft',
        nft: nft.address,
        price: toNano('1'),
      },
    );

    expect(await marketplace.getNextListingId()).toBe(1n);
    expect(await marketplace.getListingActive(0n)).toBe(true);

    const result = await marketplace.send(
      buyer.getSender(),
      { value: toNano('1.05') },
      {
        $$type: 'BuyNft',
        listingId: 0n,
      },
    );

    expect(result.transactions).toHaveTransaction({
      from: buyer.address,
      to: marketplace.address,
      success: true,
    });
    expect(result.transactions).toHaveTransaction({
      from: marketplace.address,
      to: treasury.address,
      value: toNano('0.02'),
      success: true,
    });
    expect(result.transactions).toHaveTransaction({
      from: marketplace.address,
      to: seller.address,
      value: toNano('0.98'),
      success: true,
    });
    expect(await marketplace.getListingActive(0n)).toBe(false);
  });

  it('allows sellers to cancel active listings', async () => {
    await marketplace.send(
      seller.getSender(),
      { value: toNano('0.05') },
      {
        $$type: 'ListNft',
        nft: nft.address,
        price: toNano('0.5'),
      },
    );

    const result = await marketplace.send(
      seller.getSender(),
      { value: toNano('0.05') },
      {
        $$type: 'CancelListing',
        listingId: 0n,
      },
    );

    expect(result.transactions).toHaveTransaction({
      from: seller.address,
      to: marketplace.address,
      success: true,
    });
    expect(await marketplace.getListingActive(0n)).toBe(false);
  });
});
