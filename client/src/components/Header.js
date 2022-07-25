import Link from 'next/link';
import ThemeSwitch from './ThemeSwitch';
import { Menu } from '@headlessui/react';

const Header = () => {
	return (
		<header className="shadow-xl navbar bg-base-100 rounded-box">
			<div className="navbar-start">
				<Menu as="div" className="dropdown">
					<Menu.Button as="label" tabIndex="0" className="btn btn-ghost btn-circle">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="w-5 h-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="2"
								d="M4 6h16M4 12h16M4 18h7"
							/>
						</svg>
					</Menu.Button>
					<Menu.Items
						as="ul"
						tabIndex="0"
						className="p-2 mt-3 shadow menu menu-compact dropdown-content bg-base-100 rounded-box w-52"
					>
						<Link href="/">
							<a className="btn btn-ghost btn-sm rounded-btn">Home</a>
						</Link>
					</Menu.Items>
				</Menu>
			</div>
			<div className="navbar-center">
				<Link href="/">
					<a className="text-xl normal-case btn btn-ghost">WalletDash</a>
				</Link>
			</div>
			<div className="navbar-end">
				<ThemeSwitch />
			</div>
		</header>
	);
};

export default Header;
