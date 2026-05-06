// Tact-style MVP sketch for custodial fixed-price NFT listings.

message ListNft {
  nft: Address;
  price: Int as coins;
}

message BuyNft {
  listingId: Int as uint64;
}

message CancelListing {
  listingId: Int as uint64;
}

struct Listing {
  seller: Address;
  nft: Address;
  price: Int as coins;
  active: Bool;
}

contract Marketplace {
  owner: Address;
  treasury: Address;
  feeBps: Int as uint16;
  nextListingId: Int as uint64;
  listings: map<Int, Listing>;

  init(owner: Address, treasury: Address) {
    self.owner = owner;
    self.treasury = treasury;
    self.feeBps = 200;
    self.nextListingId = 0;
  }

  receive(msg: ListNft) {
    // Production flow should list after the NFT transfer notification arrives.
    self.listings.set(self.nextListingId, Listing{
      seller: sender(),
      nft: msg.nft,
      price: msg.price,
      active: true
    });
    self.nextListingId = self.nextListingId + 1;
  }

  receive(msg: BuyNft) {
    let listing = self.listings.get(msg.listingId)!!;
    require(listing.active, "inactive listing");
    require(context().value >= listing.price, "insufficient TON");
    let fee = listing.price * self.feeBps / 10000;
    // Send fee to treasury, remaining TON to seller, NFT to buyer.
  }

  receive(msg: CancelListing) {
    let listing = self.listings.get(msg.listingId)!!;
    require(sender() == listing.seller, "not seller");
    // Return NFT to seller and close listing.
  }
}
