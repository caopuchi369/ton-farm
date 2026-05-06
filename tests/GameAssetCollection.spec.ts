import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { beginCell, toNano } from '@ton/core';
import { GameAssetCollection } from '../build/GameAssetCollection/GameAssetCollection_GameAssetCollection';
import '@ton/test-utils';

describe('GameAssetCollection', () => {
  let blockchain: Blockchain;
  let owner: SandboxContract<TreasuryContract>;
  let manager: SandboxContract<TreasuryContract>;
  let outsider: SandboxContract<TreasuryContract>;
  let collection: SandboxContract<GameAssetCollection>;

  beforeEach(async () => {
    blockchain = await Blockchain.create();
    owner = await blockchain.treasury('owner');
    manager = await blockchain.treasury('manager');
    outsider = await blockchain.treasury('outsider');
    collection = blockchain.openContract(
      await GameAssetCollection.fromInit(owner.address, manager.address, 0n),
    );

    await collection.send(owner.getSender(), { value: toNano('0.05') }, null);
  });

  it('allows the configured game manager to mint an asset record', async () => {
    const result = await collection.send(
      manager.getSender(),
      { value: toNano('0.05') },
      {
        $$type: 'MintAsset',
        owner: owner.address,
        assetType: 'CropCrate',
        metadata: beginCell().storeUint(1, 8).endCell(),
      },
    );

    expect(result.transactions).toHaveTransaction({
      from: manager.address,
      to: collection.address,
      success: true,
    });
    expect(await collection.getNextItemIndex()).toBe(1n);
  });

  it('rejects mint attempts from unrelated wallets', async () => {
    const result = await collection.send(
      outsider.getSender(),
      { value: toNano('0.05') },
      {
        $$type: 'MintAsset',
        owner: outsider.address,
        assetType: 'Land',
        metadata: beginCell().endCell(),
      },
    );

    expect(result.transactions).toHaveTransaction({
      from: outsider.address,
      to: collection.address,
      success: false,
    });
    expect(await collection.getNextItemIndex()).toBe(0n);
  });

  it('lets the owner rotate the game manager address', async () => {
    const result = await collection.send(
      owner.getSender(),
      { value: toNano('0.05') },
      {
        $$type: 'SetGameManager',
        gameManager: outsider.address,
      },
    );

    expect(result.transactions).toHaveTransaction({
      from: owner.address,
      to: collection.address,
      success: true,
    });
    expect(await collection.getGameManager()).toEqualAddress(outsider.address);
  });
});
