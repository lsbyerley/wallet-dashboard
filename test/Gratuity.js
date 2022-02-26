const { expect } = require('chai');
// const { ethers } = require('hardhat');

describe('Gratuity Contract', () => {
  let Gratuity;
  let contract;
  let owner;
  let randomAccount;

  beforeEach(async () => {
    [owner, randomAccount] = await hre.ethers.getSigners();
    Gratuity = await hre.ethers.getContractFactory('Gratuity');
    contract = await Gratuity.deploy();
    await contract.deployed();
  });

  describe('Deployment', () => {
    it('Should set the right owner', async () => {
      expect(await contract.owner()).to.equal(owner.address);
    });

    it('Should have a gratuity balance of 0 when deployed', async () => {
      const gratuityTotal = await contract.getTotalGratuity();
      expect(hre.ethers.utils.formatEther(gratuityTotal)).to.equal('0.0');
    });
  });

  describe('Transactions', async () => {
    it('Should deposit gratuity and return the total gratuity and gratuity items', async () => {
      // expect(await contract.getTotalGratuity()).to.equal(0);
      const depositTx = await contract
        .connect(randomAccount)
        .deposit('hello, testing deposit', { value: hre.ethers.utils.parseEther('0.001') });
      await depositTx.wait();

      const gratuityTotal = await contract.getTotalGratuity();
      const gratuityItems = await contract.getAllGratuityItems();

      const items = await Promise.all(
        gratuityItems.map(async (i) => {
          let item = {
            amount: hre.ethers.utils.formatEther(i.amount),
            sender: i.sender,
            message: i.message,
          };
          return item;
        })
      );

      expect(hre.ethers.utils.formatEther(gratuityTotal)).to.equal('0.001');

      expect(items).to.deep.equal([
        {
          amount: '0.001',
          sender: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
          message: 'hello, testing deposit',
        },
      ]);
    });

    it('should succeed if the owner tries to withdraw funds', async () => {
      const depositAmount = '200';
      const depositTx = await contract
        .connect(randomAccount)
        .deposit('hello, testing deposit', { value: hre.ethers.utils.parseEther(depositAmount) });
      await depositTx.wait();

      let beforeContractBalance = await hre.ethers.provider.getBalance(contract.address);
      console.log('Contract balance before:', hre.ethers.utils.formatEther(beforeContractBalance));

      let beforeOwnerBalance = await owner.getBalance();
      console.log('Balance of owner before withdrawal:', hre.ethers.utils.formatEther(beforeOwnerBalance));

      const withdrawTx = await contract.connect(owner).withdraw();
      await withdrawTx.wait();

      let afterContractBalance = await hre.ethers.provider.getBalance(contract.address);
      console.log('Contract balance after:', hre.ethers.utils.formatEther(afterContractBalance));

      let afterOwnerBalance = await owner.getBalance();
      console.log('Balance of owner after withdrawal:', hre.ethers.utils.formatEther(afterOwnerBalance));

      // TODO.. precision is off for new owner balance comparison (gas fees maybe?)
      // let expectedNewBalance = beforeContractBalance + beforeOwnerBalance;
      // console.log('LOG: expected', expectedNewBalance);
      // console.log('LOG: expected', hre.ethers.utils.formatEther(expectedNewBalance));

      expect(hre.ethers.utils.formatEther(afterContractBalance)).to.equal('0.0');
      // expect(hre.ethers.utils.formatEther(afterOwnerBalance)).to.equal(expectedNewBalance);
    });

    it('should fail if an account that is not the owner tries to withdraw funds', async () => {
      await expect(contract.connect(randomAccount).withdraw()).to.be.revertedWith('caller is not the owner');
    });

    it('should fail if an account that is not the owner tries to transfer funds', async () => {
      await expect(
        contract.connect(randomAccount).transfer(owner.address, hre.ethers.utils.parseUnits('.25', 'ether'))
      ).to.be.revertedWith('caller is not the owner');
    });
  });
});
