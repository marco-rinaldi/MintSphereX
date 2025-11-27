import { useMemo, useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { Contract, Interface } from 'ethers';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contracts';
import '../styles/MintPanel.css';

export function MintPanel() {
  const { address } = useAccount();
  const signerPromise = useEthersSigner();
  const [isMinting, setIsMinting] = useState(false);
  const [txHash, setTxHash] = useState<string>('');
  const [mintedTokenId, setMintedTokenId] = useState<bigint | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const contractInterface = useMemo(() => new Interface(CONTRACT_ABI), []);

  const {
    data: totalSupply,
    refetch: refetchTotalSupply,
    isPending: supplyLoading,
  } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'totalSupply',
    query: {
      enabled: true,
    },
  });

  const mintedCount = totalSupply ? Number(totalSupply) : 0;

  const handleMint = async () => {
    if (!address) {
      setErrorMessage('Connect your wallet to mint.');
      return;
    }

    const signer = await signerPromise;
    if (!signer) {
      setErrorMessage('Signer not available.');
      return;
    }

    try {
      setIsMinting(true);
      setErrorMessage('');
      setTxHash('');
      setMintedTokenId(null);

      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.mintSphere();
      setTxHash(tx.hash);
      const receipt = await tx.wait();

      let tokenId: bigint | null = null;
      for (const log of receipt.logs) {
        const parsed = (() => {
          try {
            return contractInterface.parseLog(log);
          } catch (_) {
            return null;
          }
        })();
        if (parsed && parsed.name === 'SphereMinted') {
          tokenId = parsed.args.tokenId as bigint;
          break;
        }
      }

      if (!tokenId) {
        const latestSupply = await contract.totalSupply();
        tokenId = latestSupply;
      }

      setMintedTokenId(tokenId);
      refetchTotalSupply();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown mint error';
      setErrorMessage(message);
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <section className="mint-panel">
      <div className="panel-card">
        <h2>Mint a private Sphere NFT</h2>
        <p className="panel-description">
          Every mint creates an ERC721 token with a Zama-generated random sphere score between 1 and 100. Only the
          token owner can decrypt it through the Relayer SDK.
        </p>

        <div className="stat-grid">
          <div className="stat-card">
            <span className="stat-label">Total Minted</span>
            <p className="stat-value">{supplyLoading ? 'Loading...' : mintedCount}</p>
          </div>
          <div className="stat-card">
            <span className="stat-label">Network</span>
            <p className="stat-value">Sepolia</p>
          </div>
        </div>

        <button className="mint-button" onClick={handleMint} disabled={isMinting || !address}>
          {isMinting ? 'Minting...' : address ? 'Mint Sphere' : 'Connect Wallet'}
        </button>

        {txHash && (
          <div className="result-box">
            <p className="result-title">Mint transaction</p>
            <p className="result-text">
              Hash: <code>{txHash.slice(0, 18)}...</code>
            </p>
          </div>
        )}

        {mintedTokenId && (
          <div className="result-box">
            <p className="result-title">Newest sphere</p>
            <p className="result-text">Token #{mintedTokenId.toString()}</p>
          </div>
        )}

        {errorMessage && <p className="error-text">{errorMessage}</p>}
      </div>
    </section>
  );
}
