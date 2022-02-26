const hre = require('hardhat');
const { ethers } = require('hardhat');

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  const Gratuity = await hre.ethers.getContractFactory('Gratuity');
  const gratuity = await Gratuity.deploy();

  await gratuity.deployed();

  console.log('GratuityContract deployed to:', gratuity.address);

  let txn = await gratuity.deposit('test deposit', { value: ethers.utils.parseEther('0.001', 'ether') });
  await txn.wait();

  let txntwo = await gratuity.deposit('test deposit 2', { value: ethers.utils.parseEther('0.002', 'ether') });
  await txntwo.wait();

  const gratuityItems = await gratuity.getAllGratuityItems();
  const totalGratuity = await gratuity.getTotalGratuity();

  console.log('LOG: check gratuityItems', gratuityItems);
  console.log('LOG: check totalGratuity', totalGratuity);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
