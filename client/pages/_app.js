import React, { useState } from 'react';
import '../styles/globals.css';
import { providers } from 'ethers';
import { Provider, defaultChains, defaultL2Chains } from 'wagmi';
import { InjectedConnector } from 'wagmi/connectors/injected';
import useLocalStorage from '../lib/useLocalStorage';
import { ThemeProvider } from 'next-themes';
import Header from '../components/Header';

const TWITTER_HANDLE = 'lsbyerley';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;
const alchemyId = process.env.NEXT_PUBLIC_ALCHEMY_ID;
const allChains = [...defaultChains, ...defaultL2Chains];
// Supporting chains right now are mainnet and rinkeby
const supportedChainIds = [1, 4, 5];
const chains = allChains.filter((c) => supportedChainIds.includes(c.id));

// Set up connectors
const connectors = ({ chainId }) => {
  return [
    new InjectedConnector({
      chains,
    }),
  ];
};

function MyApp({ Component, pageProps }) {
  const { getItem, setItem } = useLocalStorage();
  const [autoconnectEnabled, setAutoconnectEnabled] = useState(getItem('autoconnectEnabled', 'local') === 'true');
  const provider = ({ chainId }) => {
    return new providers.AlchemyProvider(chainId, alchemyId);
  };

  const props = {
    ...pageProps,
    autoconnectEnabled,
    setAutoconnectEnabled,
    setItem,
    chains,
  };

  return (
    <ThemeProvider>
      <Provider autoConnect={autoconnectEnabled} connectors={connectors} provider={provider}>
        <Header />
        <Component {...props} />
        <footer className="flex items-center justify-center w-full h-24 border-t bg-neutral">
          <a
            className="flex items-center justify-center text-gray-100"
            href={TWITTER_LINK}
            target="_blank"
            rel="noopener noreferrer"
          >{`built by @${TWITTER_HANDLE}`}</a>
        </footer>
      </Provider>
    </ThemeProvider>
  );
}

export default MyApp;
