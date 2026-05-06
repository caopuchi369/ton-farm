import { Address, Dictionary, toNano } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { GameManager } from '../build/GameManager/GameManager_GameManager';

function requiredAddress(name: string): Address {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return Address.parse(value);
}

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
  const serverSigner = BigInt(process.env.SERVER_SIGNER_PUBKEY ?? '0');
  const collection = requiredAddress('GAME_ASSET_COLLECTION_ADDRESS');
  const treasury = requiredAddress('TREASURY_ADDRESS');

  const manager = provider.open(
    await GameManager.fromInit(
      owner,
      serverSigner,
      collection,
      treasury,
      Dictionary.empty(Dictionary.Keys.BigInt(257), Dictionary.Values.Bool()),
      Dictionary.empty(Dictionary.Keys.BigInt(257), Dictionary.Values.Bool()),
      0n,
      0n,
    ),
  );

  await manager.send(provider.sender(), { value: toNano('0.05') }, null);
  await provider.waitForDeploy(manager.address);

  console.log('GAME_MANAGER_ADDRESS=' + manager.address.toString());
  console.log('owner=' + owner.toString());
  console.log('collection=' + collection.toString());
  console.log('treasury=' + treasury.toString());
}
