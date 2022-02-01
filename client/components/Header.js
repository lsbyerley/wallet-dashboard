import ThemeSwitch from "./ThemeSwitch";

const Header = () => {
  return (
    <header className="mb-2 shadow-lg bg-neutral navbar text-neutral-content">
      <div className="flex-1 px-2 mx-2">
        <span className="text-lg font-bold">Wallet Dashboard</span>
      </div>
      <div className="flex-none">
        <ThemeSwitch />
      </div>
    </header>
  );
};

export default Header;
