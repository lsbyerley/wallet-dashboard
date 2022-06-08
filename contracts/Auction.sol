// SPDX-License-Identifier: UNLICENSED
// auction example found here https://learn.figment.io/tutorials/create-an-auction-with-bidding-on-avalanche-using-react#create-auction-smart-contract
pragma solidity >=0.8.0;

contract AuctionManager {
  uint256 public uId = 0;
  uint256 public aId = 0;

  // Structure to store user information
  struct User {
    uint256 userId;
    string name;
    address publicAddress;
  }

  // Structure to store bid information
  struct Bid {
    uint256 userId;
    uint256 bidPrice;
  }

  // Structure to store auction information
  struct Auction {
    uint256 auctionId;
    uint256 userId;
    string name;
    string description;
    uint256 msp;
    uint256 auctionBidId;
  }

  // Structure to store real time analytics of each auction
  struct AuctionAnalytics {
    uint256 auctionId;
    uint256 auctionBidId;
    uint256 latestBid;
    uint256 lowestBid;
    uint256 highestBid;
  }

  // List of all auctions
  Auction[] public auctions;

  // Mapping for storing user info, bids and auction analytics
  mapping(uint256 => User) public users;
  mapping(uint256 => Bid[]) public bids;
  mapping(uint256 => AuctionAnalytics) public auctionAnalytics;

  // Public function to check the registration of users (public address)
  function isRegistered(address _publicAddress) public view returns (uint256[2] memory) {
    uint256[2] memory result = [uint256(0), uint256(0)];
    for (uint256 i = 0; i < uId; i++) {
      if (_publicAddress == users[i].publicAddress) {
        result[0] = 1;
        result[1] = i;
        return result;
      }
    }
    return result;
  }

  // Creating new users
  function createUser(string memory _name) public {
    require((isRegistered(msg.sender))[0] == 0, 'User already registered!');
    users[uId] = User(uId, _name, msg.sender);
    uId++;
  }

  // Creating new auctions
  function createAuction(
    string memory _name,
    string memory _description,
    uint256 _msp
  ) public {
    require((isRegistered(msg.sender))[0] == 1, 'User not registered!');
    uint256 MAX_UINT = 2**256 - 1;
    auctions.push(Auction(aId, isRegistered(msg.sender)[1], _name, _description, _msp, 0));
    auctionAnalytics[aId] = AuctionAnalytics(aId, 0, 0, MAX_UINT, 0);
    aId++;
  }

  // Private function to update auction analytics after the new bids
  function updateAucionAnalytics(uint256 _aId, uint256 _latestBid) private {
    auctionAnalytics[_aId].latestBid = _latestBid;
    auctionAnalytics[_aId].auctionBidId = auctions[_aId].auctionBidId;
    if (_latestBid < auctionAnalytics[_aId].lowestBid) {
      auctionAnalytics[_aId].lowestBid = _latestBid;
    }
    if (_latestBid > auctionAnalytics[_aId].highestBid) {
      auctionAnalytics[_aId].highestBid = _latestBid;
    }
  }

  // Creating new bids
  function createBid(uint256 _aId, uint256 _bidPrice) public {
    require((isRegistered(msg.sender))[0] == 1, 'User not registered!');
    bids[_aId].push(Bid((isRegistered(msg.sender))[1], _bidPrice));
    auctions[_aId].auctionBidId++;
    updateAucionAnalytics(_aId, _bidPrice);
  }

  // Return list of all auctions
  function showAuctions() public view returns (Auction[] memory) {
    return auctions;
  }
}
