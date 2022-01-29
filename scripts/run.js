// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const Gratuity = await hre.ethers.getContractFactory("Gratuity");
  const gratuity = await Gratuity.deploy();

  await gratuity.deployed();

  console.log("GratuityContract deployed to:", gratuity.address);

  let txn = await gratuity.deposit(
    ethers.utils.parseUnits(".0000000000001", "ether")
  );
  await txn.wait();

  let txntwo = await gratuity.deposit(
    ethers.utils.parseUnits(".000000005", "ether")
  );
  await txntwo.wait();

  const gratuityItems = await gratuity.getAllGratuityItems();
  const totalGratuity = await gratuity.getTotalGratuity();

  console.log("LOG: check gratuityItems", gratuityItems);
  console.log("LOG: check totalGratuity", totalGratuity);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
