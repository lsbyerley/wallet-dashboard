require('@nomiclabs/hardhat-waffle');
require('dotenv').config();
// require('@matterlabs/hardhat-zksync-deploy');
// require('@matterlabs/hardhat-zksync-solc');

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task('accounts', 'Prints the list of accounts', async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const walletKey = process.env.WALLET_KEY;
const rinkebyUrl = process.env.RINKEBY_API_URL;

module.exports = {
  defaultNetwork: 'hardhat',
  solidity: {
    version: '0.8.11',
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
      accounts: {
        accountBalance: '500.0',
      },
    },
    rinkeby: {
      url: rinkebyUrl,
      accounts: [walletKey],
    },
    mumbai: {
      url: 'https://rpc-mumbai.maticvigil.com',
      accounts: [walletKey],
    },
    matic: {
      url: 'https://rpc-mainnet.maticvigil.com',
      accounts: [walletKey],
    },
  },
  /* zksolc: {
    version: '0.1.0',
    compilerSource: 'docker',
    settings: {
      optimizer: {
        enabled: true,
      },
      experimental: {
        dockerImage: 'matterlabs/zksolc',
      },
    },
  },
  zkSyncDeploy: {
    zkSyncNetwork: 'https://zksync2-testnet.zksync.dev',
    ethNetwork: 'goerli',
  }, */
};
