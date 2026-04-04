/**
 * Configuração da rede INK (Kraken L2)
 * Suporta testnet (Sepolia) e mainnet automaticamente
 */

export interface InkNetworkConfig {
  chainId: number;
  chainIdHex: string;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  currency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  isTestnet: boolean;
}

export const INK_SEPOLIA: InkNetworkConfig = {
  chainId: 763373,
  chainIdHex: '0xBA5ED',
  name: 'Ink Sepolia',
  rpcUrl: 'https://rpc-gel-sepolia.inkonchain.com/',
  explorerUrl: 'https://explorer-sepolia.inkonchain.com',
  currency: {
    name: 'Sepolia ETH',
    symbol: 'ETH',
    decimals: 18,
  },
  isTestnet: true,
};

export const INK_MAINNET: InkNetworkConfig = {
  chainId: 57073,
  chainIdHex: '0xDEF1',
  name: 'Ink',
  rpcUrl: 'https://rpc-gel.inkonchain.com',
  explorerUrl: 'https://explorer.inkonchain.com',
  currency: {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18,
  },
  isTestnet: false,
};

/**
 * Retorna a config de rede baseada na env var VITE_USE_TESTNET
 */
export function getActiveNetwork(): InkNetworkConfig {
  const useTestnet = import.meta.env.VITE_USE_TESTNET !== 'false';
  return useTestnet ? INK_SEPOLIA : INK_MAINNET;
}

/**
 * Retorna a URL do explorer para uma transação
 */
export function getTxUrl(txHash: string): string {
  const network = getActiveNetwork();
  return `${network.explorerUrl}/tx/${txHash}`;
}

/**
 * Retorna a URL do explorer para um endereço
 */
export function getAddressUrl(address: string): string {
  const network = getActiveNetwork();
  return `${network.explorerUrl}/address/${address}`;
}

/**
 * Retorna a URL do OpenSea para um NFT na rede Ink
 */
export function getOpenSeaUrl(contractAddress: string, tokenId: number): string {
  const network = getActiveNetwork();
  // OpenSea suporta Ink — o slug da chain é 'ink' para mainnet
  const chainSlug = network.isTestnet ? 'ink-sepolia' : 'ink';
  return `https://opensea.io/assets/${chainSlug}/${contractAddress}/${tokenId}`;
}

/**
 * Tiers de preço para spots
 */
export const SPOT_TIERS = {
  bronze: {
    name: 'Bronze',
    emoji: '🥉',
    price: '0.0003', // ETH
    priceWei: '300000000000000', // 0.0003 ETH em wei
    multiplier: '1x',
    color: '#CD7F32',
    description: 'Entrada massiva — áreas rurais e suburbanas',
  },
  silver: {
    name: 'Silver',
    emoji: '🥈',
    price: '0.0008',
    priceWei: '800000000000000',
    multiplier: '~3x',
    color: '#C0C0C0',
    description: 'Uso comum — cidades médias e ruas comerciais',
  },
  gold: {
    name: 'Gold',
    emoji: '🥇',
    price: '0.003',
    priceWei: '3000000000000000',
    multiplier: '10x',
    color: '#FFD700',
    description: 'Locais relevantes — centros de metrópoles',
  },
  diamond: {
    name: 'Diamond',
    emoji: '💎',
    price: '0.01',
    priceWei: '10000000000000000',
    multiplier: '~30x',
    color: '#B9F2FF',
    description: 'Pontos turísticos — alta demanda',
  },
  legendary: {
    name: 'Legendary',
    emoji: '👑',
    price: '0.05',
    priceWei: '50000000000000000',
    multiplier: '150x+',
    color: '#FF6321',
    description: 'Locais icônicos — escassez e prestígio',
  },
} as const;

export type SpotTier = keyof typeof SPOT_TIERS;
