import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'MintSphereX',
  projectId: 'MintSphereXProjectId',
  chains: [sepolia],
  ssr: false,
});
