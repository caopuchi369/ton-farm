// Tact-style MVP sketch for server-signed game settlement.

message ClaimStarterPack {
  user: Address;
  telegramHash: Int as uint256;
  nonce: Int as uint64;
  expiresAt: Int as uint32;
  serverSignature: Slice;
}

message SettleHarvest {
  user: Address;
  landId: Int as uint64;
  slotId: Int as uint8;
  crop: String;
  quantity: Int as uint32;
  quality: String;
  nonce: Int as uint64;
  expiresAt: Int as uint32;
  serverSignature: Slice;
}

contract GameManager {
  owner: Address;
  serverSigner: Int as uint256;
  collection: Address;
  treasury: Address;

  init(owner: Address, serverSigner: Int, collection: Address, treasury: Address) {
    self.owner = owner;
    self.serverSigner = serverSigner;
    self.collection = collection;
    self.treasury = treasury;
  }

  receive(msg: ClaimStarterPack) {
    require(now() <= msg.expiresAt, "claim expired");
    // Verify server signature and nonce, then mint Land, SeedPack, and Pet.
  }

  receive(msg: SettleHarvest) {
    require(now() <= msg.expiresAt, "claim expired");
    // Verify server signature and nonce, then mint CropCrate NFT to msg.user.
  }
}
