import { useEffect, useState } from 'react';
import Head from 'next/head';
import * as zksync from 'zksync';
import { ethers } from 'ethers';
import { useAccount, useConnect, useNetwork, useSigner } from 'wagmi';
import {
  getZkSyncProvider,
  // getEthereumProvider,
  initAccount,
  displayZkSyncBalance,
  // registerAccount,
} from '../lib/zkUtils';

const zksyncPage = () => {
  // const provider = useProvider();
  const [{ data: signerData }] = useSigner();
  const [{ data: connectData }] = useConnect();
  const [{ data: accountData }] = useAccount();
  const [{ data: networkData }] = useNetwork();

  const [zkSyncAccountState, setZkSyncAccountState] = useState();
  const [isZkSyncSigningKeySet, setIsZkSyncSigningKeySet] = useState(false);
  const [committedBalance, setCommittedBalance] = useState(0);
  const [verifiedBalance, setVerifiedBalance] = useState(0);

  const accountAddress = accountData?.address || null;
  const chainId = networkData?.chain?.id || null;
  const chainName = networkData?.chain?.name || null;
  const isConnected = connectData?.connected || false;

  useEffect(async () => {
    if (accountAddress && signerData && !zkSyncAccountState?.address && chainName === 'Rinkeby') {
      console.log('LOG: in here again');
      const zkSyncProvider = await getZkSyncProvider(zksync, chainName.toLowerCase());
      const userZkSyncWallet = await initAccount(signerData, zkSyncProvider, zksync);

      // console.log('LOG: userzksyncwallet', userZkSyncWallet);

      const zkSyncWalletAccountState = await userZkSyncWallet.getAccountState();
      // console.log('LOG: zkSyncWalletAccountState', zkSyncWalletAccountState);
      setZkSyncAccountState(zkSyncWalletAccountState);

      const zkSyncSigningKeySet = await userZkSyncWallet.isSigningKeySet();
      setIsZkSyncSigningKeySet(zkSyncSigningKeySet);

      const userZkSyncBalance = await displayZkSyncBalance(userZkSyncWallet, ethers);
      setCommittedBalance(userZkSyncBalance.committed);
      setVerifiedBalance(userZkSyncBalance.verified);
    }
  }, [accountAddress, chainName, signerData, zkSyncAccountState]);

  return (
    <div className="flex flex-col items-start min-h-screen py-2 justify-items-start">
      <Head>
        <title>Wallet Dashboard - zkSync</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="w-full max-w-full">
        <div className="p-4 lg:p-10">
          {chainId !== 4 && (
            <div className="mb-4 alert alert-warning">
              <div className="flex-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  className="w-6 h-6 mx-2 stroke-current"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  ></path>
                </svg>
                <label>
                  zkSync wallet for this dashboard is only available on the rinkeby network right now. Change to the
                  rinkeby network to try it out
                </label>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 gap-6 lg:p-10 xl:grid-cols-3 lg:bg-base-200 rounded-box">
            <div className="col-span-2 shadow-lg card compact bg-base-100">
              <div className="card-body">
                <div className="card-title">zkSync Balance</div>
                <div className="flex-row items-center justify-center">
                  <div className="w-full shadow stats">
                    <div className="stat">
                      <div className="text-green-700 stat-figure">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          className="inline-block w-8 h-8 stroke-current"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          ></path>
                        </svg>
                      </div>
                      <div className="stat-title">Total</div>
                      <div className="stat-value">{committedBalance} eth</div>
                      <div className="stat-desc text-success">comitted</div>
                    </div>
                    <div className="stat">
                      <div className="text-green-700 stat-figure">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          className="inline-block w-8 h-8 stroke-current"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                          ></path>
                        </svg>
                      </div>
                      <div className="stat-title">Total</div>
                      <div className="stat-value">{verifiedBalance} eth</div>
                      <div className="stat-desc text-success">verified</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="shadow-lg card compact bg-base-100">
              <div className="card-body">
                <div className="card-title">Account State</div>
                <div className="flex-row items-center justify-center">
                  <div className="flex">
                    <span>Type:</span>
                    <span>{zkSyncAccountState?.accountType}</span>
                  </div>
                  <div className="flex">
                    <span>SigningKeySet:</span>
                    <span>{isZkSyncSigningKeySet ? 'yes' : 'no'}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="shadow-lg card compact bg-base-100"></div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default zksyncPage;
