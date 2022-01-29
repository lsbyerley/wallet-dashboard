//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "hardhat/console.sol";

contract Gratuity is ReentrancyGuard, Ownable {
  using Counters for Counters.Counter;
  Counters.Counter private _gratuitiesGiven;

  uint256 totalGratuity;

  constructor() payable {
    console.log("LOG: Gratuity contract deployed");
  }

  struct GratuityItem {
    address sender;
    uint256 amount;
    string message;
  }
  GratuityItem[] public gratuityItems;

  event GratuityItemGifted(address sender, uint256 amount, string message);

  function getAllGratuityItems() external view returns (GratuityItem[] memory) {
    return gratuityItems;
  }

  function getTotalGratuity() external view returns (uint256) {
    return totalGratuity;
  }

  function deposit(uint256 _amount, string memory _message) public payable nonReentrant {
    require(_amount > 0, "You must send ether");
    totalGratuity += _amount;
    _gratuitiesGiven.increment();
    gratuityItems.push(GratuityItem({sender: msg.sender, amount: _amount, message: _message}));
    emit GratuityItemGifted(msg.sender, _amount, _message);
  }

  // Function to withdraw all Ether from this contract.
  function withdraw() public onlyOwner nonReentrant {
    // get the amount of Ether stored in this contract
    // uint256 amount = address(this).balance;

    // send all Ether to owner
    // Owner can receive Ether since the address of owner is payable
    // (bool success, ) = owner.call{value: amount}("");
    // require(success, "Failed to send Ether");
    payable(msg.sender).transfer(address(this).balance);
  }

  // Function to transfer Ether from this contract to address from input
  function transfer(address payable _to, uint256 _amount) public onlyOwner nonReentrant {
    // Note that "to" is declared as payable
    (bool success, ) = _to.call{value: _amount}("");
    require(success, "Failed to send Ether");
  }
}
