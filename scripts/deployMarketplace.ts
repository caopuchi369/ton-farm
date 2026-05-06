import { Address, toNano } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { Marketplace } from '../build/Marketplace/Marketplace_Marketplace';

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
  const treasury = requiredAddress('TREASURY_ADDRESS');
  const marketplace = provider.open(await Marketplace.fromInit(owner, treasury));

  await marketplace.send(provider.sender(), { value: toNano('0.05') }, null);
  await provider.waitForDeploy(marketplace.address);

  console.log('MARKETPLACE_ADDRESS=' + marketplace.address.toString());
  console.log('owner=' + owner.toString());
  console.log('treasury=' + treasury.toString());
  console.log('feeBps=' + (await marketplace.getFeeBps()).toString());
}
