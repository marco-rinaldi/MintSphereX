import { ConnectButton } from '@rainbow-me/rainbowkit';
import '../styles/Header.css';

export function Header() {
  return (
    <header className="header">
      <div className="header-container">
        <div>
          <p className="eyebrow">MintSphereX</p>
          <h1>Mint privacy-preserving Sphere NFTs</h1>
          <p className="subtitle">
            Each mint locks a random score (1-100) behind Zama FHE. Decrypt it in your browser once you own the token.
          </p>
        </div>
        <ConnectButton />
      </div>
    </header>
  );
}
