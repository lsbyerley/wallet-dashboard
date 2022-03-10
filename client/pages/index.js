import { Fragment, useState, useEffect } from 'react';
import Head from 'next/head';
import { ethers } from 'ethers';
import {
  useAccount,
  useConnect,
  useNetwork,
  useBalance,
  useContract,
  useContractEvent,
  useProvider,
  useSigner,
  useFeeData,
} from 'wagmi';
import { Bars } from 'react-loader-spinner';
import { Menu, Transition, Switch } from '@headlessui/react';
import shortenAddress from '../lib/shortenAddress';
import useIsMounted from '../lib/useIsMounted';
import axios from 'axios';
import GratuityJSON from '../lib/abis/Gratuity.json';
import NFTCard from '../components/NFTCard';

// TODO: use updated contract config
const contractAddressConfig = (chainId) => {
  const config = {
    4: {
      name: 'rinkeby',
      address: '0x5321312F9aE04ea5f097D8F304004facf67Fa422',
    },
    80001: {
      name: 'polygon-mumbai',
      address: '0x57c4383863eb8f7716F842e8D4208B9C7cfb3608',
    },
  };
  return config[chainId] || false;
};

// TODO: enable mumbai contract support
const RINKEBY_CONTRACT = '0x5321312F9aE04ea5f097D8F304004facf67Fa422';
const POLYGON_MUMBAI_CONTRACT = '0x57c4383863eb8f7716F842e8D4208B9C7cfb3608';
// chainIds the contract is deployed
const contractChainIds = [4 /* 80001 */];
// chainIds the nft opensea api supports
const nftChainIds = [1, 4];

const Home = ({ chains, autoconnectEnabled, setAutoconnectEnabled, setItem }) => {
  const provider = useProvider();
  const isMounted = useIsMounted();
  const [{ data: signerData, error, loading }, getSigner] = useSigner();
  const [{ data: connectData, error: connectError }, connect] = useConnect();
  const [{ data: feeData, error: feeError, loading: feeLoading }, getFeeData] = useFeeData({
    formatUnits: 'gwei',
    watch: true,
  });
  const [{ data: networkData, error: networkError, loading: networkLoading }, switchNetwork] = useNetwork();
  const [{ data: accountData, error: accountError, loading: accountLoading }, disconnect] = useAccount({
    fetchEns: true,
  });
  const [{ data: balanceData, error: balanceError, loading: balanceLoading }, getBalance] = useBalance({
    addressOrName: accountData?.address,
  });
  const contract = useContract({
    addressOrName: RINKEBY_CONTRACT,
    contractInterface: GratuityJSON.abi,
    signerOrProvider: signerData,
  });
  useContractEvent(
    {
      addressOrName: RINKEBY_CONTRACT,
      contractInterface: GratuityJSON.abi,
      signerOrProvider: provider,
    },
    'GratuityItemGifted',
    async (event) => {
      console.log('LOG: GratuityItemGifted', event);
      await fetchGratuityData();
    }
  );

  const [nfts, setNfts] = useState([]);
  const [nftsError, setNftsError] = useState();
  const [nftsLoading, setNftsLoading] = useState(false);
  const [formInput, updateFormInput] = useState({
    gratuityAmount: '',
    message: '',
  });
  const [totalGratuity, setTotalGratuity] = useState(0);
  const [gratuityItems, setGratuityItems] = useState([]);
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositError, setDepositError] = useState();
  const accountAddress = accountData?.address || null;
  const chainId = networkData?.chain?.id || null;
  const chainName = networkData?.chain?.name || null;
  const isConnected = connectData?.connected || false;

  // console.log("LOG: provider", provider);
  // console.log('LOG: signerData', signerData);
  // console.log("LOG: accountData", accountData);
  // console.log('LOG: networkData', networkData);
  // console.log("LOG: connectData", connectData);
  // console.log("LOG: balanceData", balanceData);
  // console.log('LOG: feeData', feeData);
  // console.log('LOG: contract', contract);

  useEffect(() => {
    if (accountAddress && nftChainIds.includes(chainId)) {
      // fetchNfts(chainId);
    }
  }, [accountAddress]);

  const fetchNfts = async (chainId) => {
    try {
      setNftsLoading(true);
      // `https://eth-mainnet.g.alchemy.com/${process.env.NEXT_PUBLIC_ALCHEMY_ID}/v1/getNFTs/?owner=${accountAddress}`
      let url =
        chainId === 4
          ? `https://testnets-api.opensea.io/api/v1/assets?owner=${accountAddress}`
          : `https://api.opensea.io/api/v1/assets?owner=${accountAddress}`;
      const res = await axios.get(url);
      if (res.status !== 200) {
        throw Error(`Fetching NFTS request failed with status: ${res.status}. Network may not be supported`);
      }
      setNfts(res.data.assets);
      setNftsLoading(false);
    } catch (error) {
      setNftsLoading(false);
      if (error instanceof Error) {
        setNftsError(error.message);
      } else {
        setNftsError('An unknown error occurred');
      }
    }
  };

  useEffect(() => {
    if (isConnected && signerData && contractChainIds.includes(chainId)) {
      console.log('LOG: contract fetch');
      fetchGratuityData();
    } else {
      console.log('LOG: contract not on this chain or not connected');
    }
  }, [chainId, isConnected, signerData]);

  const fetchGratuityData = async () => {
    try {
      const gratuityTotal = await contract.getTotalGratuity();
      setTotalGratuity(ethers.utils.formatEther(gratuityTotal));

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
      const reversedItems = [...items].reverse();
      setGratuityItems(reversedItems);
    } catch (error) {
      setGratuityItems([]);
      console.log('LOG: error fetching gratuity data', error);
    }
  };

  const onChangeNetwork = async (c) => {
    const newNetwork = await switchNetwork(c.id);
    setNfts([]);
    if (nftChainIds.includes(chainId)) await fetchNfts(newNetwork?.data?.id);
    await getFeeData();
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(accountData?.address);
  };

  const depositGratuity = async () => {
    try {
      setDepositError(false);
      setDepositLoading(true);
      const { gratuityAmount, message } = formInput;
      if (!gratuityAmount || !message) return;

      const amount = ethers.utils.parseEther(gratuityAmount);
      console.log('LOG: deposit', message, amount);

      let transaction = await contract.deposit(message, { value: amount });
      let txn = await transaction.wait();
      console.log('LOG: deposit complete!', txn);
      setDepositLoading(false);
    } catch (error) {
      setDepositLoading(false);
      setDepositError(true);
      console.log('LOG: deposit error', error);
    }
  };

  return (
    <div className="flex flex-col items-start min-h-screen py-2 justify-items-start">
      <Head>
        <title>Wallet Dashboard</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="w-full max-w-full">
        <div className="p-4 lg:p-10">
          <div className="grid grid-cols-1 gap-6 lg:p-10 xl:grid-cols-3 lg:bg-base-200 rounded-box">
            {!accountData && (
              <div className="col-span-1 alert xl:col-span-3 alert-info">
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
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                  <label>Use the Connect button to connect your wallet!</label>
                </div>
              </div>
            )}
            {connectError && (
              <div className="col-span-1 alert xl:col-span-3 alert-warning">
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
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                  <label>
                    There was an error connecting your wallet! Please try a different network or reload the page.
                  </label>
                </div>
              </div>
            )}
            <div className="shadow-lg card compact bg-base-100">
              <div className="flex-row items-center space-x-4 card-body">
                <div>
                  <div className="avatar">
                    <div className="rounded-full shadow w-14 h-14">
                      <img src={accountData?.ens?.avatar || 'https://via.placeholder.com/150'} alt="ENS Avatar" />
                    </div>
                  </div>
                </div>
                <div>
                  <h2 className="card-title">{accountData?.ens?.name || 'n/a'}</h2>
                  <p className="text-base-content text-opacity-40">ENS Domain</p>
                </div>
              </div>
            </div>
            <div className="overflow-visible shadow-lg card compact bg-base-100 ">
              <div className="flex-row items-center space-x-4 card-body">
                <div className="flex-1">
                  <h2 className="card-title">{chainName ?? chainId}</h2>
                  <p className="text-base-content text-opacity-40">
                    Network {networkData.chain?.unsupported && '(unsupported)'}
                  </p>
                </div>
                <div className="flex-0">
                  <Menu as="div" className="dropdown">
                    <Menu.Button tabIndex="0" className="m-1 btn btn-sm btn-outline" disabled={!connectData.connected}>
                      Switch Network
                    </Menu.Button>
                    <Transition
                      as={Fragment}
                      enter="transition ease-out duration-100"
                      enterFrom="transform opacity-0 scale-95"
                      enterTo="transform opacity-100 scale-100"
                      leave="transition ease-in duration-75"
                      leaveFrom="transform opacity-100 scale-100"
                      leaveTo="transform opacity-0 scale-95"
                    >
                      <Menu.Items
                        as="ul"
                        tabIndex="0"
                        className="p-2 shadow menu dropdown-content bg-base-100 rounded-box w-52"
                      >
                        {switchNetwork &&
                          chains &&
                          chains.length > 0 &&
                          chains.map((c) => {
                            return (
                              <Menu.Item key={c.id} as="li" onClick={() => onChangeNetwork(c)}>
                                {({ active }) => <a className={`${active && 'bg-blue-500'}`}>{c.name}</a>}
                              </Menu.Item>
                            );
                          })}
                      </Menu.Items>
                    </Transition>
                  </Menu>
                </div>
              </div>
            </div>
            <div className="row-span-2 shadow-lg card compact bg-base-100">
              <figure>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  style={{
                    background: 'linear-gradient(#135,#fbc,#135)',
                  }}
                  className="w-full"
                >
                  <filter id="filter">
                    <feTurbulence type="fractalNoise" baseFrequency=".005 0" numOctaves="5" />
                    <feDisplacementMap in="SourceAlpha" scale="99" />
                    <feColorMatrix
                      values="0 0 0 0 .01
                               0 0 0 0 .02
                               0 0 0 0 .02
                               0 0 0 -1 1"
                    />
                  </filter>
                  <use href="#e" y="-100%" transform="scale(1 -1)" filter="blur(3px)" />
                  <ellipse id="e" cx="50%" rx="63%" ry="43%" filter="url(#filter)" />
                </svg>
              </figure>
              <div className="flex-row items-center justify-between space-x-4 card-body">
                <div>
                  <h2 className="card-title">{accountData?.address && shortenAddress(accountData.address)}</h2>
                  <p className="text-base-content text-opacity-40">Wallet Address</p>
                </div>
                <div>
                  <button className="btn btn-sm btn-square" onClick={() => copyToClipboard()}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="inline-block w-6 h-6 text-gray-100 stroke-current"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <div className="shadow-lg card compact bg-base-100">
              <div className="flex-row items-center space-x-4 card-body">
                <div className="flex-1">
                  {accountData && balanceData && (
                    <h2 className="text-blue-300 card-title">
                      {balanceData?.formatted} {networkData?.chain.nativeCurrency.symbol || balanceData?.symbol}
                    </h2>
                  )}
                  <p className="text-base-content text-opacity-40">Balance</p>
                </div>
                <div className="flex space-x-2 flex-0"></div>
              </div>
            </div>
            <div className="shadow-lg card compact bg-base-100">
              <div className="flex-row items-center space-x-4 card-body">
                <div className="flex-1">
                  {isMounted && accountData?.connector.name && (
                    <h2 className="card-title">{accountData?.connector.name}</h2>
                  )}
                  <p className="text-base-content text-opacity-40">Connected With</p>
                </div>
                <div className="flex-0">
                  {!connectData.connected &&
                    connectData.connectors.map((x) => {
                      return (
                        <button
                          className="btn btn-sm"
                          key={x.id}
                          onClick={() => connect(x)}
                          disabled={isMounted ? !x.ready : false}
                        >
                          {`Connect With `}
                          {isMounted ? x.name : x.id === 'injected' ? x.id : x.name}
                          {isMounted ? !x.ready && ' (unsupported)' : ''}
                        </button>
                      );
                    })}

                  {connectData.connected && (
                    <button className="btn btn-sm btn-outline" onClick={() => disconnect()}>
                      Disconnect
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="shadow-lg card compact bg-base-100">
              <div className="flex-row items-center space-x-4 card-body">
                <div className="flex-1">
                  {networkLoading || accountLoading || (balanceLoading && <Bars arialLabel="loading-indicator" />)}
                  {!accountData && (
                    <h2 className="flex items-center card-title">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-6 h-6 mr-2 text-red-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Not Connected
                    </h2>
                  )}
                  {accountData && (
                    <h2 className="flex items-center card-title">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-6 h-6 mr-2 text-green-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Connected
                    </h2>
                  )}
                </div>
                <div className="flex-0"></div>
              </div>
            </div>
            <div className="shadow-lg card compact bg-base-100">
              <div className="flex-row items-center space-x-4 card-body">
                <label className="flex-0">
                  {isMounted && (
                    <Switch
                      checked={autoconnectEnabled}
                      onChange={(checked) => {
                        console.log('LOG: toggle', checked);
                        setAutoconnectEnabled(checked);
                        setItem('autoconnectEnabled', checked, 'local');
                      }}
                      className={`${
                        autoconnectEnabled ? 'bg-blue-600' : 'bg-gray-200'
                      } relative inline-flex items-center h-6 rounded-full w-11`}
                    >
                      <span className="sr-only">Enable AutoConnect</span>
                      <span
                        className={`${
                          autoconnectEnabled ? 'translate-x-6' : 'translate-x-1'
                        } inline-block w-4 h-4 transform bg-white rounded-full`}
                      />
                    </Switch>
                  )}
                </label>
                <div className="flex-1">
                  <h2 className="card-title">Autoconnect</h2>
                  <p className="text-base-content text-opacity-40">Automatically connect your wallet on page load</p>
                </div>
              </div>
            </div>
            <div className="shadow-lg card compact bg-base-100">
              <div className="flex-row items-center space-x-4 card-body">
                <div className="flex-1">
                  {chainId && feeData && (
                    <h2 className="text-blue-300 card-title">
                      {feeData?.formatted.gasPrice}
                      <span className="">{'gwei'}</span>
                    </h2>
                  )}
                  <p className="text-base-content text-opacity-40">Estimated Gas Fee</p>
                </div>
                <div className="flex space-x-2 flex-0"></div>
              </div>
            </div>
            <div className="col-span-1 row-span-3 shadow-lg xl:col-span-3 card compact bg-base-100">
              <div className="card-body">
                <h2 className="my-4 text-4xl font-bold card-title">
                  Owned NFT's
                  <div className="ml-4 badge badge-outline badge-lg">{nfts.length}</div>
                </h2>
                <div className="mb-4 space-x-2 card-actions">
                  <div className="badge badge-ghost">Ethereum</div>
                  <div className="badge badge-ghost">{networkData.chain?.name ?? networkData.chain?.id}</div>
                </div>
                {nftsLoading && !nftsError && (
                  <div className="flex items-center justify-center">
                    <Bars heigth="100" width="100" color="grey" ariaLabel="loading-indicator" />
                  </div>
                )}
                {nftsError && (
                  <div className="alert xl:col-span-3 alert-error">
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
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        ></path>
                      </svg>
                      <label>{nftsError}</label>
                    </div>
                  </div>
                )}
                {!accountData?.address && !connectData.connected && (
                  <div className="alert xl:col-span-3 alert-info">
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
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        ></path>
                      </svg>
                      <label>Connect wallet to see NFT's</label>
                    </div>
                  </div>
                )}
                {!nftsLoading && !nftsError && nfts.length === 0 && connectData.connected && (
                  <div className="alert xl:col-span-3 alert-info">
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
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        ></path>
                      </svg>
                      <label>No NFT's associated with this wallet yet! Go buy some!</label>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 max-h-[550px] overflow-scroll">
                  {!nftsLoading &&
                    nfts.length > 0 &&
                    nfts.map((nft) => {
                      return <NFTCard data={nft} key={`${nft.id}-${nft.token_id}`} />;
                    })}
                </div>
                <div className="mt-4 alert alert-info">
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
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      ></path>
                    </svg>
                    <label>The NFT's shown here are only fetched for ETH Mainnnet and Rinkeby Testnet</label>
                  </div>
                </div>
              </div>
            </div>

            <div className="shadow-lg card compact bg-base-100">
              <div className="card-body">
                <div className="card-title">Like this dashboard? Send a tip!</div>
                {depositLoading && !depositError && (
                  <div className="flex items-center justify-center mt-8">
                    <Bars heigth="100" width="100" color="grey" ariaLabel="loading-indicator" />
                  </div>
                )}
                {!depositLoading && contractChainIds.includes(chainId) && (
                  <>
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Gratuity</span>
                      </label>
                      <label className="input-group input-group-md">
                        <input
                          type="text"
                          placeholder="0.001"
                          className="input input-bordered input-md"
                          onChange={(e) =>
                            updateFormInput({
                              ...formInput,
                              gratuityAmount: e.target.value,
                            })
                          }
                        />
                        <span>ETH</span>
                      </label>
                    </div>
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Message</span>
                      </label>
                      <input
                        type="text"
                        placeholder="message"
                        maxLength="120"
                        className="input input-bordered input-md"
                        onChange={(e) =>
                          updateFormInput({
                            ...formInput,
                            message: e.target.value,
                          })
                        }
                      />
                    </div>
                    <button
                      onClick={depositGratuity}
                      className="mt-4 btn btn-block btn-accent"
                      disabled={!formInput.gratuityAmount}
                    >
                      Send Gratuity
                    </button>
                  </>
                )}
                {!contractChainIds.includes(chainId) && (
                  <p className="text-base-content">contract not deployed to the current chain</p>
                )}
              </div>
            </div>
            <div className="shadow-lg card compact bg-base-100">
              <div className="card-body">
                <div className="card-title">Gratuity Messages</div>
                {contractChainIds.includes(chainId) && (
                  <ul className="px-0 py-4 overflow-scroll menu bg-base-100 text-base-content text-opacity-40 rounded-box max-h-64">
                    {gratuityItems.map((item, index) => {
                      return (
                        <li key={`gitem-${index}`}>
                          <a
                            href={`https://${chainId === 4 ? 'rinkeby.' : ''}etherscan.io/address/${item.sender}`}
                            target="_blank"
                            rel="noreferrer nofollow"
                            className="px-0 py-4"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="inline-block w-5 h-5 mr-2 stroke-current"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            ({item.amount}) {item.message}
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {!contractChainIds.includes(chainId) && (
                  <p className="text-base-content">contract not deployed to the current chain</p>
                )}
              </div>
            </div>
            <div className="shadow-lg card compact bg-base-100">
              <div className="card-body">
                <div className="card-title">Gratuity Contract Stats</div>
                {contractChainIds.includes(chainId) && (
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
                        <div className="stat-value">{totalGratuity} eth</div>
                        <div className="stat-desc text-success">ether given</div>
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
                        <div className="stat-value">{gratuityItems.length}</div>
                        <div className="stat-desc text-success">donations</div>
                      </div>
                    </div>
                  </div>
                )}
                {!contractChainIds.includes(chainId) && (
                  <p className="text-base-content">contract not deployed to the current chain</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
