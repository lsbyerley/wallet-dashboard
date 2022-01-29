import React, { useEffect, useState } from "react";
import "../styles/globals.css";
import { ethers, providers } from "ethers";
import { Provider, defaultChains, defaultL2Chains } from "wagmi";
import { InjectedConnector } from "wagmi/connectors/injected";
import * as zksync from "zksync";
import useLocalStorage from "../lib/useLocalStorage";

// Constants
const TWITTER_HANDLE = "lsbyerley";
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;
const alchemyId = process.env.NEXT_PUBLIC_ALCHEMY_ID;
const chains = [...defaultChains, ...defaultL2Chains];

// Set up connectors
const connectors = ({ chainId }) => {
  return [
    new InjectedConnector({
      chains,
    }),
  ];
};

function MyApp({ Component, pageProps }) {
  /* const [autoconnectEnabled, setAutoconnectEnabled] = useLocalStorage(
    "autoconnectEnabled",
    true
  ); */
  const { getItem, setItem } = useLocalStorage();

  const [autoconnectEnabled, setAutoconnectEnabled] = useState(
    getItem("autoconnectEnabled", "local") === "true"
  );

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
    <Provider
      autoConnect={autoconnectEnabled}
      connectors={connectors}
      provider={provider}
    >
      <header class="navbar mb-2 shadow-lg bg-neutral text-neutral-content">
        <div class="flex-1 px-2 mx-2">
          <span class="text-lg font-bold">Wallet Dashboard</span>
        </div>
        <div class="flex-none">
          <button class="btn btn-square btn-ghost">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="inline-block w-6 h-6 stroke-current"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </button>
        </div>
      </header>
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
  );
}

export default MyApp;
