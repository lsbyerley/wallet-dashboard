import { FC, Fragment, useState, useEffect } from 'react';
import Head from 'next/head';
import { ethers, constants } from 'ethers';
import { APP_NAME } from '@/lib/consts';
// import { BookOpenIcon, CodeIcon, ShareIcon } from '@heroicons/react/outline'
// import ConnectWallet from '@/components/ConnectWallet'
import { Bars } from 'react-loader-spinner';
import { Menu, Transition, Switch } from '@headlessui/react';
import shortenAddress from '@/lib/shortenAddress';
import useIsMounted from '@/lib/useIsMounted';
import axios from 'axios';
import GratuityJSON from '@/lib/abis/Gratuity.json';
import NFTCard from '@/components/NFTCard';
import {
	useAccount,
	useBalance,
	useConnect,
	useContract,
	useDisconnect,
	useContractEvent,
	useFeeData,
	useNetwork,
	useSigner,
	useSwitchNetwork,
	useEnsName,
	useEnsAvatar,
} from 'wagmi';
import ConnectWallet from '@/components/ConnectWallet';

const RINKEBY_CONTRACT = '0x5321312F9aE04ea5f097D8F304004facf67Fa422';
const GOERLI_CONTRACT = '0x30d2D684f3Ec6eA6FA00f4BCDF33460e46a1F9eB';
const POLYGON_MUMBAI_CONTRACT = '0x57c4383863eb8f7716F842e8D4208B9C7cfb3608';
const ARBITRUM_ONE_CONTRACT = '0xfa51c2b728a3b7e076ce415f69180efb8ebac67b';
const contractAddressConfig = chainId => {
	const config = {
		4: {
			name: 'rinkeby',
			address: RINKEBY_CONTRACT,
		},
		5: {
			name: 'goerli',
			address: GOERLI_CONTRACT,
		},
		80001: {
			name: 'polygon-mumbai',
			address: POLYGON_MUMBAI_CONTRACT,
		},
		42161: {
			name: 'Arbitrum',
			address: ARBITRUM_ONE_CONTRACT,
		},
	};
	return config[chainId]?.address || false;
};

// chainIds the nft opensea api supports
const nftChainIds = [1, 4];

const Home = ({ autoConnectEnabled = false, setAutoConnectEnabled = () => {}, setItem = () => {} }) => {
	const [nfts, setNfts] = useState([]);
	const [nftsLoading, setNftsLoading] = useState(false);
	const [nftsError, setNftsError] = useState();
	const [depositLoading, setDepositLoading] = useState(false);
	const [depositError, setDepositError] = useState();
	const [totalGratuity, setTotalGratuity] = useState(0);
	const [gratuityItems, setGratuityItems] = useState([]);
	const [formInput, updateFormInput] = useState({
		gratuityAmount: '',
		message: '',
	});

	const isMounted = useIsMounted();
	const { chain } = useNetwork();
	const { data: signer } = useSigner();
	const { chains, switchNetwork, switchNetworkAsync } = useSwitchNetwork();
	const { connect, connectors, error, isLoading, pendingConnector } = useConnect();
	const { disconnect } = useDisconnect();
	const { address, connector: activeConnector, isConnecting, isConnected, isDisconnected } = useAccount();
	const { data: ensName } = useEnsName({
		address,
		chainId: 1,
	});
	const { data: ensAvatar } = useEnsAvatar({
		addressOrName: address,
		chainId: 1,
	});
	const { data: balanceData } = useBalance({
		addressOrName: address,
	});
	const { data: feeData } = useFeeData({ formatUnits: 'gwei' });

	const contract = useContract({
		addressOrName: contractAddressConfig(chain?.id) || constants.AddressZero,
		contractInterface: GratuityJSON.abi,
		signerOrProvider: signer,
	});

	useContractEvent({
		addressOrName: contractAddressConfig(chain?.id) || constants.AddressZero,
		contractInterface: GratuityJSON.abi,
		eventName: 'GratuityItemGifted',
		listener: event => {
			return fetchGratuityData();
		},
	});

	useEffect(() => {
		if (isConnected && address) {
			const nftChainId = nftChainIds.includes(chain.id) ? chain.id : 1;
			fetchNfts(nftChainId);
		}
	}, [isConnected, address]);

	useEffect(() => {
		if (isConnected && signer) {
			fetchGratuityData();
		}
	}, [isConnected, signer]);

	const copyToClipboard = async () => {
		await navigator.clipboard.writeText(address);
	};

	const onChangeNetwork = async c => {
		await switchNetworkAsync(c.id);
		setNfts([]);
		setNftsError();
		const nftChainId = nftChainIds.includes(c.id) ? c.id : 1;
		fetchNfts(nftChainId);
	};

	const fetchNfts = async chainId => {
		try {
			setNftsLoading(true);
			// `https://eth-mainnet.g.alchemy.com/${process.env.NEXT_PUBLIC_ALCHEMY_ID}/v1/getNFTs/?owner=${address}`
			let url =
				chainId === 4
					? `https://testnets-api.opensea.io/api/v1/assets?owner=${address}`
					: `https://api.opensea.io/api/v1/assets?owner=${address}`;
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

	const fetchGratuityData = async () => {
		try {
			const gratuityTotal = await contract.getTotalGratuity();
			setTotalGratuity(ethers.utils.formatEther(gratuityTotal));

			const gratuityItems = await contract.getAllGratuityItems();
			const items = await Promise.all(
				gratuityItems.map(async i => {
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
			console.log('LOG: error fetching gratuity data', chain.id, error);
		}
	};

	const depositGratuity = async () => {
		try {
			setDepositError(false);
			setDepositLoading(true);
			const { gratuityAmount, message } = formInput;
			if (!gratuityAmount || !message) return;

			const amount = ethers.utils.parseEther(gratuityAmount);

			let transaction = await contract.deposit(message, { value: amount });
			let txn = await transaction.wait();
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
						<div className="shadow-lg card compact bg-base-100">
							<div className="flex-row items-center space-x-4 card-body">
								<div>
									<div className="avatar">
										<div className="rounded-full shadow w-14 h-14">
											<img
												src={ensAvatar || 'https://via.placeholder.com/150'}
												alt="ENS Avatar"
											/>
										</div>
									</div>
								</div>
								<div>
									<h2 className="card-title">{isMounted && ensName && ensName}</h2>
									<p className="text-base-content text-opacity-40">ENS Domain</p>
								</div>
							</div>
						</div>
						<div className="overflow-visible shadow-lg card compact bg-base-100 ">
							<div className="flex-row items-center space-x-4 card-body">
								<div className="flex-1">
									<h2 className="card-title">{isMounted && chain && chain?.name}</h2>
									<p className="text-base-content text-opacity-40">
										Network {chain?.unsupported && '(unsupported)'}
									</p>
								</div>
								<div className="flex-0">
									{isMounted && (
										<Menu as="div" className="dropdown">
											<Menu.Button
												tabIndex="0"
												as="label"
												className="m-1 btn btn-sm btn-outline"
												disabled={!activeConnector}
											>
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
													className="p-2 shadow dropdown-content menu bg-base-100 rounded-box w-52"
												>
													{chains &&
														chains.length > 0 &&
														chains.map(c => {
															return (
																<Menu.Item
																	key={c.id}
																	as="li"
																	onClick={() => onChangeNetwork(c)}
																>
																	{({ active }) => (
																		<a className={`${active && 'bg-base-300'}`}>
																			{c.name}
																		</a>
																	)}
																</Menu.Item>
															);
														})}
												</Menu.Items>
											</Transition>
										</Menu>
									)}
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
									<h2 className="card-title">{isMounted && address && shortenAddress(address)}</h2>
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
									{isMounted && address && balanceData && (
										<h2 className="text-blue-300 card-title">
											{Number(
												ethers.utils.formatUnits(balanceData?.value, balanceData?.decimals)
											).toFixed(8)}{' '}
											{balanceData?.symbol}
										</h2>
									)}
									<p className="text-base-content text-opacity-40">Balance</p>
								</div>
								<div className="flex space-x-2 flex-0"></div>
							</div>
						</div>
						<div className="shadow-lg card compact bg-base-100">
							<div className="flex-row items-center space-x-4 card-body">
								{isMounted && isConnected && (
									<>
										<div className="flex-1">
											<h2 className="card-title">{activeConnector?.name}</h2>
											<p className="text-base-content text-opacity-40">Connected With</p>
										</div>
										<div className="flex-0">
											<button
												className="btn btn-sm btn-outline"
												onClick={() => {
													// should disable autoconnect on disconnect?
													setAutoConnectEnabled(false);
													setItem('autoConnectEnabled', false, 'local');
													setNfts([]);
													return disconnect();
												}}
											>
												Disconnect
											</button>
										</div>
									</>
								)}
								{isMounted && !isConnected && (
									<ConnectWallet show={isConnected ? 'connected' : 'not_connected'} />
								)}
							</div>
						</div>
						<div className="shadow-lg card compact bg-base-100">
							<div className="flex-row items-center space-x-4 card-body">
								<div className="flex-1">
									{isMounted && !address && (
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
									{isMounted && address && (
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
											checked={autoConnectEnabled}
											onChange={checked => {
												setAutoConnectEnabled(checked);
												setItem('autoConnectEnabled', checked, 'local');
											}}
											className={`${
												autoConnectEnabled ? 'bg-blue-600' : 'bg-gray-200'
											} relative inline-flex items-center h-6 rounded-full w-11`}
										>
											<span className="sr-only">Enable AutoConnect</span>
											<span
												className={`${
													autoConnectEnabled ? 'translate-x-6' : 'translate-x-1'
												} inline-block w-4 h-4 transform bg-white rounded-full`}
											/>
										</Switch>
									)}
								</label>
								<div className="flex-1">
									<h2 className="card-title">Autoconnect</h2>
									<p className="text-base-content text-opacity-40">
										Automatically connect your wallet
									</p>
								</div>
							</div>
						</div>
						<div className="shadow-lg card compact bg-base-100">
							<div className="flex-row items-center space-x-4 card-body">
								<div className="flex-1">
									{isMounted && feeData && (
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
									Owned NFTs
									<div className="ml-4 badge badge-outline badge-lg">{nfts.length}</div>
								</h2>
								<div className="mt-4 mb-4 alert">
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
											The NFTs shown here are only fetched for ETH Mainnnet and Rinkeby Testnet
										</label>
									</div>
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
								{isMounted && !address && !activeConnector && (
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
											<label>Connect wallet to see NFTs</label>
										</div>
									</div>
								)}
								{!nftsLoading && !nftsError && nfts.length === 0 && activeConnector && (
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
											<label>No NFTs associated with this wallet yet! Go buy some!</label>
										</div>
									</div>
								)}
								<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 sm:max-h-[550px] overflow-scroll">
									{!nftsLoading &&
										nfts.length > 0 &&
										nfts.map(nft => {
											return <NFTCard data={nft} key={`${nft.id}-${nft.token_id}`} />;
										})}
								</div>
							</div>
						</div>

						<div className="shadow-lg card compact bg-base-100">
							<div className="card-body">
								<div className="card-title">Like this dashboard? Send a tip!</div>
								{isMounted && depositLoading && !depositError && (
									<div className="flex items-center justify-center mt-8">
										<Bars heigth="100" width="100" color="grey" ariaLabel="loading-indicator" />
									</div>
								)}
								{isMounted && !depositLoading && contractAddressConfig(chain?.id) && (
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
													onChange={e =>
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
												onChange={e =>
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
								{isMounted && !contractAddressConfig(chain?.id) && (
									<p className="text-base-content">contract not deployed to the current chain</p>
								)}
							</div>
						</div>
						<div className="shadow-lg card compact bg-base-100">
							<div className="card-body">
								<div className="card-title">Gratuity Messages</div>
								{isMounted && contractAddressConfig(chain?.id) && (
									<ul className="px-0 py-4 overflow-scroll menu bg-base-100 text-base-content text-opacity-40 rounded-box max-h-64">
										{gratuityItems.map((item, index) => {
											return (
												<li key={`gitem-${index}`}>
													<a
														href={`https://${
															chain?.id === 4 ? 'rinkeby.' : ''
														}etherscan.io/address/${item.sender}`}
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
								{isMounted && !contractAddressConfig(chain?.id) && (
									<p className="text-base-content">contract not deployed to the current chain</p>
								)}
							</div>
						</div>
						<div className="shadow-lg card compact bg-base-100">
							<div className="card-body">
								<div className="card-title">Gratuity Contract Stats</div>
								{isMounted && contractAddressConfig(chain?.id) && (
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
								{isMounted && !contractAddressConfig(chain?.id) && (
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
