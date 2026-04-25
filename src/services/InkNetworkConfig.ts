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
 * Tiers de preço para spots — MODELO B: Preço Adaptativo
 * 
 * FÓRMULA: preço_final = preço_base × multiplicador_local × fator_escassez
 * 
 * O multiplicador_local é calculado pelo PricingEngine baseado no weightedScore
 * dos POIs (Overpass API). Quanto mais turístico e famoso, maior o multiplicador.
 * 
 * ESTRATÉGIA "Spray Can Economics":
 * - Bronze BARATO (~$0.90) para atrair massa de usuários
 * - Receita da geração de arte por IA subsidia o Bronze barato
 * - Tiers superiores geram lucro puro por escassez e prestígio
 * 
 * REFERÊNCIA COMPETITIVA:
 * - OVR: ~$0.50-5 (entrada) → $50K+ (premium)
 * - Upland: ~$5-50 (cidades novas) → $500K+ (NYC, SF)
 * - SuperWorld: ~$0.10 (áreas vazias) → $100K+ (landmarks)
 */
export const SPOT_TIERS = {
  bronze: {
    name: 'Bronze',
    emoji: '🥉',
    price: '0.0005',   // ETH (~$0.90 @ $1800/ETH)
    priceWei: '500000000000000',   // 0.0005 ETH em wei
    multiplierMin: 1,
    multiplierMax: 3,
    color: '#CD7F32',
    description: 'Spray barato — becos, ruas residenciais, áreas rurais',
  },
  silver: {
    name: 'Silver',
    emoji: '🥈',
    price: '0.05',     // ETH (~$90)
    priceWei: '50000000000000000',  // 0.05 ETH em wei
    multiplierMin: 1,
    multiplierMax: 5,
    color: '#C0C0C0',
    description: 'Ruas comerciais — cidades médias, centros urbanos',
  },
  gold: {
    name: 'Gold',
    emoji: '🥇',
    price: '0.5',      // ETH (~$900)
    priceWei: '500000000000000000', // 0.5 ETH em wei
    multiplierMin: 1,
    multiplierMax: 10,
    color: '#FFD700',
    description: 'Metrópoles — Av. Paulista, Shibuya, Copacabana',
  },
  diamond: {
    name: 'Diamond',
    emoji: '💎',
    price: '5.0',      // ETH (~$9.000)
    priceWei: '5000000000000000000', // 5.0 ETH em wei
    multiplierMin: 1,
    multiplierMax: 20,
    color: '#B9F2FF',
    description: 'Pontos icônicos — Cristo Redentor, Golden Gate, Hollywood',
  },
  legendary: {
    name: 'Legendary',
    emoji: '👑',
    price: '50.0',     // ETH (~$90.000)
    priceWei: '50000000000000000000', // 50.0 ETH em wei
    multiplierMin: 1,
    multiplierMax: 100,
    color: '#FF6321',
    description: 'Lendário — Times Square, Torre Eiffel, Coliseu',
  },
} as const;

export type SpotTier = keyof typeof SPOT_TIERS;
