import { useState } from 'react'
import 'tailwindcss/tailwind.css'
import { APP_NAME } from '@/lib/consts'
import '@rainbow-me/rainbowkit/styles.css'
import { defaultChains, defaultL2Chains, createClient, WagmiConfig, configureChains } from 'wagmi'
import { alchemyProvider } from 'wagmi/providers/alchemy'
import { infuraProvider } from 'wagmi/providers/infura'
import { publicProvider } from 'wagmi/providers/public'
import { getDefaultWallets, RainbowKitProvider } from '@rainbow-me/rainbowkit'
import useLocalStorage from '@/lib/useLocalStorage'
import Header from '@/components/Header'
import { ThemeProvider } from 'next-themes'

const infuraId = process.env.NEXT_PUBLIC_INFURA_ID
const alchemyId = process.env.NEXT_PUBLIC_ALCHEMY_ID

const App = ({ Component, pageProps }) => {
	const { getItem, setItem } = useLocalStorage()
	const [autoConnectEnabled, setAutoConnectEnabled] = useState(getItem('autoConnectEnabled', 'local') === 'true')

	const { chains, provider } = configureChains(
		[...defaultChains, ...defaultL2Chains],
		[alchemyProvider({ alchemyId }), publicProvider()]
	)

	const { connectors } = getDefaultWallets({ appName: APP_NAME, chains })
	const wagmiClient = createClient({ autoConnect: autoConnectEnabled, connectors, provider })

	const props = {
		...pageProps,
		autoConnectEnabled,
		setAutoConnectEnabled,
		setItem,
	}

	return (
		<ThemeProvider>
			<WagmiConfig client={wagmiClient}>
				<RainbowKitProvider chains={chains}>
					<Header />
					<Component {...props} />
				</RainbowKitProvider>
			</WagmiConfig>
		</ThemeProvider>
	)
}

export default App
