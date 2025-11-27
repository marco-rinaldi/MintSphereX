import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Header } from './Header';
import { MintPanel } from './MintPanel';
import { SphereCollection } from './SphereCollection';
import '../styles/MintSphereApp.css';

export function MintSphereApp() {
  const [activeTab, setActiveTab] = useState<'mint' | 'collection'>('mint');
  const { address } = useAccount();

  return (
    <div className="sphere-app">
      <Header />
      <main className="sphere-main">
        <div className="tab-navigation">
          <button
            className={`tab-button ${activeTab === 'mint' ? 'active' : ''}`}
            onClick={() => setActiveTab('mint')}
          >
            Mint Sphere NFTs
          </button>
          <button
            className={`tab-button ${activeTab === 'collection' ? 'active' : ''}`}
            onClick={() => setActiveTab('collection')}
            disabled={!address}
          >
            My Collection
          </button>
        </div>
        <div className="tab-content">
          {activeTab === 'mint' ? <MintPanel /> : <SphereCollection />}
        </div>
      </main>
    </div>
  );
}
