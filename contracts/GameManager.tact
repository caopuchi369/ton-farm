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

contract GameManager(
  owner: Address,
  serverSigner: Int as uint256,
  collection: Address,
  treasury: Address,
  usedNonces: map<Int, Bool>,
  starterClaims: map<Int, Bool>,
  starterPackCount: Int as uint64,
  harvestCount: Int as uint64,
) {
  receive() {
    cashback(sender());
  }

  receive(msg: ClaimStarterPack) {
    require(sender() == msg.user, "sender mismatch");
    require(now() <= msg.expiresAt, "claim expired");
    require(self.usedNonces.get(msg.nonce) == null, "nonce used");
    require(self.starterClaims.get(msg.telegramHash) == null, "starter claimed");

    self.usedNonces.set(msg.nonce, true);
    self.starterClaims.set(msg.telegramHash, true);
    self.starterPackCount = self.starterPackCount + 1;
    cashback(sender());
  }

  receive(msg: SettleHarvest) {
    require(sender() == msg.user, "sender mismatch");
    require(now() <= msg.expiresAt, "claim expired");
    require(self.usedNonces.get(msg.nonce) == null, "nonce used");
    require(msg.quantity > 0, "empty harvest");

    self.usedNonces.set(msg.nonce, true);
    self.harvestCount = self.harvestCount + 1;
    cashback(sender());
  }

  get fun owner(): Address {
    return self.owner;
  }

  get fun serverSigner(): Int {
    return self.serverSigner;
  }

  get fun collection(): Address {
    return self.collection;
  }

  get fun treasury(): Address {
    return self.treasury;
  }

  get fun nonceUsed(nonce: Int): Bool {
    return self.usedNonces.get(nonce) != null;
  }

  get fun starterClaimed(telegramHash: Int): Bool {
    return self.starterClaims.get(telegramHash) != null;
  }

  get fun starterPackCount(): Int {
    return self.starterPackCount;
  }

  get fun harvestCount(): Int {
    return self.harvestCount;
  }
}
