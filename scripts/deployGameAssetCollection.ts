import { Address, toNano } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { GameAssetCollection } from '../build/GameAssetCollection/GameAssetCollection_GameAssetCollection';

function senderAddress(provider: NetworkProvider): Address {
  const address = provider.sender().address;
  if (!address) {
    throw new Error('Deploy sender address is unavailable. Use a wallet-backed Blueprint sender.');
  }
  return address;
}

export async function run(provider: NetworkProvider) {
  const owner = process.env.CONTRACT_OWNER_ADDRESS
    ? Address.parse(process.env.CONTRACT_OWNER_ADDRESS)
    : senderAddress(provider);
  const gameManager = process.env.GAME_MANAGER_ADDRESS
    ? Address.parse(process.env.GAME_MANAGER_ADDRESS)
    : owner;

  const collection = provider.open(await GameAssetCollection.fromInit(owner, gameManager, 0n));

  await collection.send(provider.sender(), { value: toNano('0.05') }, null);
  await provider.waitForDeploy(collection.address);

  console.log('GAME_ASSET_COLLECTION_ADDRESS=' + collection.address.toString());
  console.log('owner=' + owner.toString());
  console.log('gameManager=' + gameManager.toString());
}
