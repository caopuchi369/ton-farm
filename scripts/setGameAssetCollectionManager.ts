import { Address, toNano } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { GameAssetCollection } from '../build/GameAssetCollection/GameAssetCollection_GameAssetCollection';

function requiredAddress(name: string): Address {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return Address.parse(value);
}

export async function run(provider: NetworkProvider) {
  const collection = provider.open(GameAssetCollection.fromAddress(requiredAddress('GAME_ASSET_COLLECTION_ADDRESS')));
  const gameManager = requiredAddress('GAME_MANAGER_ADDRESS');

  await collection.send(
    provider.sender(),
    { value: toNano('0.05') },
    {
      $$type: 'SetGameManager',
      gameManager,
    },
  );

  console.log('collection=' + collection.address.toString());
  console.log('gameManager=' + (await collection.getGameManager()).toString());
}
