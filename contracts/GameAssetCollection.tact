// Tact-style MVP sketch. Treat this as an interface draft before audit.

message MintAsset {
  owner: Address;
  assetType: String;
  metadata: Cell;
}

contract GameAssetCollection {
  owner: Address;
  gameManager: Address;
  nextItemIndex: Int as uint64;

  init(owner: Address, gameManager: Address) {
    self.owner = owner;
    self.gameManager = gameManager;
    self.nextItemIndex = 0;
  }

  receive(msg: MintAsset) {
    require(sender() == self.gameManager || sender() == self.owner, "mint not allowed");
    // Deploy NFT item with collection, index, owner and metadata.
    self.nextItemIndex = self.nextItemIndex + 1;
  }
}
