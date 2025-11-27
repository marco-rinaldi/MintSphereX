import { useEffect, useState } from 'react';
import { useAccount, usePublicClient, useReadContract } from 'wagmi';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contracts';
import '../styles/SphereCollection.css';

type SphereToken = {
  tokenId: bigint;
  mintedAt: number;
  tokenUri: string;
  ciphertext: string;
  decryptedValue?: string;
  decrypting?: boolean;
  error?: string;
};

export function SphereCollection() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const signerPromise = useEthersSigner();
  const { instance, isLoading: zamaLoading, error: zamaError } = useZamaInstance();
  const [tokens, setTokens] = useState<SphereToken[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [loadError, setLoadError] = useState('');

  const { data: ownedTokenIds } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'tokensOfOwner',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  useEffect(() => {
    let cancelled = false;

    const loadTokens = async () => {
      if (!address || !publicClient || !ownedTokenIds) {
        setTokens([]);
        return;
      }

      setLoadingTokens(true);
      setLoadError('');

      try {
        const ids = ownedTokenIds as bigint[];
        const fetched = await Promise.all(
          ids.map(async (tokenId) => {
            const metadata = await publicClient.readContract({
              address: CONTRACT_ADDRESS,
              abi: CONTRACT_ABI,
              functionName: 'getTokenMetadata',
              args: [tokenId],
            });

            const ciphertext = await publicClient.readContract({
              address: CONTRACT_ADDRESS,
              abi: CONTRACT_ABI,
              functionName: 'getSphereCiphertext',
              args: [tokenId],
            });

            return {
              tokenId,
              mintedAt: Number(metadata[0] as bigint) * 1000,
              tokenUri: metadata[1] as string,
              ciphertext: ciphertext as string,
            } satisfies SphereToken;
          }),
        );

        if (!cancelled) {
          setTokens(fetched);
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : 'Unable to load tokens';
          setLoadError(message);
        }
      } finally {
        if (!cancelled) {
          setLoadingTokens(false);
        }
      }
    };

    loadTokens();

    return () => {
      cancelled = true;
    };
  }, [address, ownedTokenIds, publicClient]);

  const decryptToken = async (token: SphereToken) => {
    if (!instance || !address) {
      return;
    }

    const signer = await signerPromise;
    if (!signer) {
      return;
    }

    setTokens((prev) =>
      prev.map((item) => (item.tokenId === token.tokenId ? { ...item, decrypting: true, error: undefined } : item)),
    );

    try {
      const keypair = instance.generateKeypair();
      const contractAddresses = [CONTRACT_ADDRESS];
      const startTimestamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '7';
      const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, startTimestamp, durationDays);

      const signature = await signer.signTypedData(
        eip712.domain,
        { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        eip712.message,
      );

      const result = await instance.userDecrypt(
        [
          {
            handle: token.ciphertext,
            contractAddress: CONTRACT_ADDRESS,
          },
        ],
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x', ''),
        contractAddresses,
        address,
        startTimestamp,
        durationDays,
      );

      const decryptedValue = result[token.ciphertext];
      setTokens((prev) =>
        prev.map((item) =>
          item.tokenId === token.tokenId
            ? {
                ...item,
                decryptedValue: typeof decryptedValue === 'bigint' ? decryptedValue.toString() : `${decryptedValue}`,
                decrypting: false,
              }
            : item,
        ),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Decryption failed';
      setTokens((prev) =>
        prev.map((item) => (item.tokenId === token.tokenId ? { ...item, decrypting: false, error: message } : item)),
      );
    }
  };

  if (!address) {
    return (
      <section className="collection-panel">
        <div className="panel-card empty-state">
          <h3>Connect wallet</h3>
          <p>Sign in with RainbowKit to see your private spheres.</p>
        </div>
      </section>
    );
  }

  if (loadingTokens) {
    return (
      <section className="collection-panel">
        <div className="panel-card empty-state">
          <p>Loading your encrypted NFTs...</p>
        </div>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="collection-panel">
        <div className="panel-card empty-state">
          <p className="error-text">{loadError}</p>
        </div>
      </section>
    );
  }

  if (!tokens.length) {
    return (
      <section className="collection-panel">
        <div className="panel-card empty-state">
          <h3>No spheres yet</h3>
          <p>Mint a Sphere NFT to unlock a hidden score.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="collection-panel">
      {zamaError && <p className="error-text">{zamaError}</p>}
      <div className="sphere-grid">
        {tokens.map((token) => (
          <article key={token.tokenId.toString()} className="sphere-card">
            <header>
              <p className="sphere-id">Sphere #{token.tokenId.toString()}</p>
              <p className="sphere-date">Minted {new Date(token.mintedAt).toLocaleString()}</p>
            </header>
            <div className="sphere-body">
              <p className="cipher-label">Ciphertext handle</p>
              <code className="cipher-value">{token.ciphertext.slice(0, 22)}...</code>
              <p className="uri-label">Metadata URI</p>
              <a href={token.tokenUri} target="_blank" rel="noreferrer">
                {token.tokenUri || 'Not set'}
              </a>
            </div>
            <footer className="sphere-footer">
              {token.decryptedValue ? (
                <p className="sphere-score">Sphere value: {token.decryptedValue}</p>
              ) : (
                <button
                  className="decrypt-button"
                  onClick={() => decryptToken(token)}
                  disabled={token.decrypting || zamaLoading || !instance}
                >
                  {token.decrypting ? 'Decrypting...' : zamaLoading ? 'Loading Zama...' : 'Decrypt sphere'}
                </button>
              )}
              {token.error && <p className="error-text">{token.error}</p>}
            </footer>
          </article>
        ))}
      </div>
    </section>
  );
}
