import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { beginCell, Dictionary, toNano } from '@ton/core';
import { GameManager } from '../build/GameManager/GameManager_GameManager';
import '@ton/test-utils';

const emptySignature = () => beginCell().endCell().asSlice();

describe('GameManager', () => {
  let blockchain: Blockchain;
  let owner: SandboxContract<TreasuryContract>;
  let user: SandboxContract<TreasuryContract>;
  let collection: SandboxContract<TreasuryContract>;
  let treasury: SandboxContract<TreasuryContract>;
  let manager: SandboxContract<GameManager>;

  beforeEach(async () => {
    blockchain = await Blockchain.create();
    owner = await blockchain.treasury('owner');
    user = await blockchain.treasury('user');
    collection = await blockchain.treasury('collection');
    treasury = await blockchain.treasury('treasury');

    manager = blockchain.openContract(
      await GameManager.fromInit(
        owner.address,
        1n,
        collection.address,
        treasury.address,
        Dictionary.empty(Dictionary.Keys.BigInt(257), Dictionary.Values.Bool()),
        Dictionary.empty(Dictionary.Keys.BigInt(257), Dictionary.Values.Bool()),
        0n,
        0n,
      ),
    );

    await manager.send(owner.getSender(), { value: toNano('0.05') }, null);
  });

  it('accepts starter claims once per telegram hash and nonce', async () => {
    const result = await manager.send(
      user.getSender(),
      { value: toNano('0.05') },
      {
        $$type: 'ClaimStarterPack',
        user: user.address,
        telegramHash: 123n,
        nonce: 77n,
        expiresAt: 4_000_000_000n,
        serverSignature: emptySignature(),
      },
    );

    expect(result.transactions).toHaveTransaction({
      from: user.address,
      to: manager.address,
      success: true,
    });
    expect(await manager.getNonceUsed(77n)).toBe(true);
    expect(await manager.getStarterClaimed(123n)).toBe(true);
    expect(await manager.getStarterPackCount()).toBe(1n);

    const replay = await manager.send(
      user.getSender(),
      { value: toNano('0.05') },
      {
        $$type: 'ClaimStarterPack',
        user: user.address,
        telegramHash: 456n,
        nonce: 77n,
        expiresAt: 4_000_000_000n,
        serverSignature: emptySignature(),
      },
    );
    expect(replay.transactions).toHaveTransaction({
      from: user.address,
      to: manager.address,
      success: false,
    });
  });

  it('rejects expired harvest claims', async () => {
    const result = await manager.send(
      user.getSender(),
      { value: toNano('0.05') },
      {
        $$type: 'SettleHarvest',
        user: user.address,
        landId: 1n,
        slotId: 0n,
        crop: 'Tomato',
        quantity: 30n,
        quality: 'Normal',
        nonce: 99n,
        expiresAt: 1n,
        serverSignature: emptySignature(),
      },
    );

    expect(result.transactions).toHaveTransaction({
      from: user.address,
      to: manager.address,
      success: false,
    });
    expect(await manager.getHarvestCount()).toBe(0n);
  });
});
