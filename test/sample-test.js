const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Gratuity", function () {
  it("Should deposit gratuity and return the total gratuity and gratuity items", async () => {
    const Gratuity = await ethers.getContractFactory("Gratuity");
    const contract = await Gratuity.deploy();
    await contract.deployed();

    expect(await contract.getTotalGratuity()).to.equal(0);

    const depositTx = await contract.deposit(
      ethers.utils.parseUnits(".25", "ether"),
      "hello, testing deposit"
    );

    await depositTx.wait();

    const gratuityTotal = await contract.getTotalGratuity();
    const gratuityItems = await contract.getAllGratuityItems();

    const items = await Promise.all(
      gratuityItems.map(async (i) => {
        let item = {
          amount: ethers.utils.formatEther(i.amount),
          sender: i.sender,
          message: i.message,
        };
        return item;
      })
    );

    expect(ethers.utils.formatEther(gratuityTotal)).to.equal("0.25");

    expect(items).to.deep.equal([
      {
        amount: "0.25",
        sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        message: "hello, testing deposit",
      },
    ]);
  });
});
