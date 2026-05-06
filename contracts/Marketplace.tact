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

  receive() {
    cashback(sender());
  }

  receive(msg: ListNft) {
    require(msg.price > 0, "invalid price");
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
    let sellerAmount = listing.price - fee;

    self.listings.set(msg.listingId, Listing{
      seller: listing.seller,
      nft: listing.nft,
      price: listing.price,
      active: false
    });

    send(SendParameters{
      to: self.treasury,
      value: fee,
      bounce: false,
      mode: SendIgnoreErrors | SendPayGasSeparately
    });
    send(SendParameters{
      to: listing.seller,
      value: sellerAmount,
      bounce: false,
      mode: SendIgnoreErrors | SendPayGasSeparately
    });
  }

  receive(msg: CancelListing) {
    let listing = self.listings.get(msg.listingId)!!;
    require(sender() == listing.seller, "not seller");
    require(listing.active, "inactive listing");

    self.listings.set(msg.listingId, Listing{
      seller: listing.seller,
      nft: listing.nft,
      price: listing.price,
      active: false
    });
    cashback(sender());
  }

  get fun feeBps(): Int {
    return self.feeBps;
  }

  get fun nextListingId(): Int {
    return self.nextListingId;
  }

  get fun listingActive(listingId: Int): Bool {
    let listing = self.listings.get(listingId);
    if (listing == null) {
      return false;
    }
    return listing!!.active;
  }
}
