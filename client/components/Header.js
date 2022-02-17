import Link from 'next/link';
import ThemeSwitch from './ThemeSwitch';

const Header = () => {
  return (
    <header className="mb-2 shadow-lg bg-neutral navbar text-neutral-content">
      <div className="flex-none px-2 mx-2">
        <span className="text-lg font-bold">Wallet Dashboard</span>
      </div>
      <div className="flex-1 px-2 mx-2">
        <div className="flex items-stretch">
          <Link href="/">
            <a className="btn btn-ghost btn-sm rounded-btn">home</a>
          </Link>
          <Link href="/zksync">
            <a className="btn btn-ghost btn-sm rounded-btn">zkSync</a>
          </Link>
        </div>
      </div>
      <div className="flex-none">
        <ThemeSwitch />
      </div>
    </header>
  );
};

export default Header;
