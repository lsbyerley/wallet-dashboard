require("@nomiclabs/hardhat-waffle");
require("dotenv").config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const walletKey = process.env.WALLET_KEY;
const rinkebyUrl = process.env.RINKEBY_API_URL;

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  defaultNetwork: "hardhat",
  solidity: {
    version: "0.8.9",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    rinkeby: {
      url: rinkebyUrl,
      accounts: [walletKey],
    },
    /* arbitrum: {
      // mainnet: https://arb-mainnet.g.alchemy.com/v2/kHUy7OJb3mU2KguUI53fOGHxpdJpJTt5
      url: "https://rinkeby.arbitrum.io/rpc",
      accounts: [walletKey],
    },
    optimism: {
      url: "https://opt-kovan.g.alchemy.com/v2/pVp3Tz9Rxp_iiXlRasCjmAbaanV_vL4K",
      accounts: [walletKey],
    }, */
  },
};
