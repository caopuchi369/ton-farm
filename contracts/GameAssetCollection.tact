message MintAsset {
  owner: Address;
  assetType: String;
  metadata: Cell;
}

message SetGameManager {
  gameManager: Address;
}

contract GameAssetCollection(
  owner: Address,
  gameManager: Address,
  nextItemIndex: Int as uint64,
) {
  receive() {
    cashback(sender());
  }

  receive(msg: SetGameManager) {
    require(sender() == self.owner, "owner only");
    self.gameManager = msg.gameManager;
    cashback(sender());
  }

  receive(msg: MintAsset) {
    require(sender() == self.gameManager || sender() == self.owner, "mint not allowed");
    self.nextItemIndex = self.nextItemIndex + 1;
    cashback(sender());
  }

  get fun owner(): Address {
    return self.owner;
  }

  get fun gameManager(): Address {
    return self.gameManager;
  }

  get fun nextItemIndex(): Int {
    return self.nextItemIndex;
  }
}
