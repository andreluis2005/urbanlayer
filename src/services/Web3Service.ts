/**
 * Web3Service — Integração com a blockchain INK (Kraken L2)
 * 
 * Gerencia conexão de wallet, mint de NFTs e verificação de ownership.
 * Usa ethers.js v6 para comunicação com smart contracts ERC-721.
 */

import { BrowserProvider, Contract, formatEther, parseEther, JsonRpcProvider } from 'ethers';
import { getActiveNetwork, getOpenSeaUrl, getTxUrl, type InkNetworkConfig } from './InkNetworkConfig';

// ABI mínima do contrato UrbanLayerSpot (ERC-721)
// Será atualizada quando o contrato for deployado via Remix
const GRAFFITI_SPOT_ABI = [
  // Leitura
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function balanceOf(address owner) view returns (uint256)',
  
  // UrbanLayer custom functions
  'function getSpotPrice(uint8 tier) view returns (uint256)',
  'function isSpotClaimed(int256 lat, int256 lng) view returns (bool)',
  'function getSpotOwner(int256 lat, int256 lng) view returns (address)',
  'function getSpotTokenId(int256 lat, int256 lng) view returns (uint256)',
  
  // Escrita
  'function mintSpot(int256 lat, int256 lng, string locationName, uint8 tier) payable returns (uint256)',
  'function updateGraffitiURI(uint256 tokenId, string uri) external',
  
  // Eventos
  'event SpotMinted(uint256 indexed tokenId, address indexed owner, int256 lat, int256 lng, string locationName, uint8 tier, uint256 price)',
  'event GraffitiUpdated(uint256 indexed tokenId, string newUri)',
];

// Mapeamento de tier string para uint8 do contrato
const TIER_TO_UINT: Record<string, number> = {
  bronze: 0,
  silver: 1,
  gold: 2,
  diamond: 3,
  legendary: 4,
};

/**
 * Estado da wallet
 */
export interface WalletState {
  isConnected: boolean;
  address: string | null;
  balance: string | null;
  chainId: number | null;
  isCorrectNetwork: boolean;
  networkName: string;
}

/**
 * Resultado do mint
 */
export interface MintResult {
  success: boolean;
  tokenId?: number;
  txHash?: string;
  explorerUrl?: string;
  openSeaUrl?: string;
  error?: string;
}

// Singleton provider / signer
let browserProvider: BrowserProvider | null = null;
let currentWalletState: WalletState = {
  isConnected: false,
  address: null,
  balance: null,
  chainId: null,
  isCorrectNetwork: false,
  networkName: '',
};

// Listeners para mudanças de estado
type StateListener = (state: WalletState) => void;
const stateListeners: StateListener[] = [];

function notifyListeners() {
  stateListeners.forEach(fn => fn({ ...currentWalletState }));
}

/**
 * Registra um listener para mudanças no estado da wallet
 */
export function onWalletStateChange(listener: StateListener): () => void {
  stateListeners.push(listener);
  // Retorna função de cleanup
  return () => {
    const idx = stateListeners.indexOf(listener);
    if (idx >= 0) stateListeners.splice(idx, 1);
  };
}

/**
 * Retorna o estado atual da wallet
 */
export function getWalletState(): WalletState {
  return { ...currentWalletState };
}

/**
 * Verifica se o MetaMask ou outro provider Web3 está disponível
 */
export function isWeb3Available(): boolean {
  return typeof window !== 'undefined' && typeof (window as any).ethereum !== 'undefined';
}

/**
 * Conecta a wallet do usuário
 */
export async function connectWallet(): Promise<WalletState> {
  if (!isWeb3Available()) {
    throw new Error('MetaMask ou outra wallet Web3 não detectada. Por favor instale o MetaMask.');
  }

  try {
    const ethereum = (window as any).ethereum;
    browserProvider = new BrowserProvider(ethereum);
    
    // Solicitar conexão
    const accounts = await browserProvider.send('eth_requestAccounts', []);
    const address = accounts[0];
    
    // Obter balanço e rede
    const balance = await browserProvider.getBalance(address);
    const network = await browserProvider.getNetwork();
    const activeNetwork = getActiveNetwork();

    currentWalletState = {
      isConnected: true,
      address,
      balance: formatEther(balance),
      chainId: Number(network.chainId),
      isCorrectNetwork: Number(network.chainId) === activeNetwork.chainId,
      networkName: activeNetwork.name,
    };

    // Registrar listeners para mudanças de forma segura
    try {
      if (ethereum.on) {
        ethereum.on('accountsChanged', handleAccountsChanged);
        ethereum.on('chainChanged', handleChainChanged);
      }
    } catch (e) {
      console.warn("⚠️ Não foi possível registrar listeners da wallet (conflito de provedor).");
    }

    console.log('🔗 Wallet conectada:', address);
    console.log('💰 Balanço:', formatEther(balance), 'ETH');
    console.log('🔗 Chain ID:', Number(network.chainId));

    notifyListeners();
    return { ...currentWalletState };
  } catch (error: any) {
    console.error('❌ Erro ao conectar wallet:', error);
    throw new Error(error.message || 'Falha ao conectar wallet');
  }
}

/**
 * Tenta conectar silenciosamente (sem abrir popup) se já houver permissão prévia
 */
export async function silentConnectWallet(): Promise<WalletState | null> {
  if (!isWeb3Available()) return null;

  try {
    const ethereum = (window as any).ethereum;
    // Usamos um provider temporário para checar contas sem pedir permissão
    const tempProvider = new BrowserProvider(ethereum);
    const accounts = await tempProvider.send('eth_accounts', []);

    if (accounts && accounts.length > 0) {
      browserProvider = tempProvider;
      const address = accounts[0];
      
      const balance = await browserProvider.getBalance(address);
      const network = await browserProvider.getNetwork();
      const activeNetwork = getActiveNetwork();

      currentWalletState = {
        isConnected: true,
        address,
        balance: formatEther(balance),
        chainId: Number(network.chainId),
        isCorrectNetwork: Number(network.chainId) === activeNetwork.chainId,
        networkName: activeNetwork.name,
      };

      try {
        if (ethereum.on) {
          ethereum.on('accountsChanged', handleAccountsChanged);
          ethereum.on('chainChanged', handleChainChanged);
        }
      } catch (e) {
        console.warn("⚠️ Não foi possível registrar listeners da wallet.");
      }

      console.log('🔗 Silently connected:', address);
      notifyListeners();
      return { ...currentWalletState };
    }
    return null;
  } catch (error) {
    console.warn('Silent connect failed:', error);
    return null;
  }
}

/**
 * Desconecta a wallet (limpa estado local)
 */
export function disconnectWallet(): void {
  const ethereum = (window as any).ethereum;
  if (ethereum) {
    ethereum.removeListener('accountsChanged', handleAccountsChanged);
    ethereum.removeListener('chainChanged', handleChainChanged);
  }
  
  browserProvider = null;
  currentWalletState = {
    isConnected: false,
    address: null,
    balance: null,
    chainId: null,
    isCorrectNetwork: false,
    networkName: '',
  };
  
  notifyListeners();
  console.log('🔌 Wallet desconectada');
}

/**
 * Troca para a rede INK automaticamente
 */
export async function switchToInkNetwork(): Promise<boolean> {
  if (!isWeb3Available()) return false;
  
  const ethereum = (window as any).ethereum;
  const network = getActiveNetwork();

  try {
    // Tenta trocar para a rede INK
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: network.chainIdHex }],
    });
    return true;
  } catch (switchError: any) {
    // Se a rede não existe na wallet, adiciona
    if (switchError.code === 4902) {
      try {
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: network.chainIdHex,
            chainName: network.name,
            nativeCurrency: network.currency,
            rpcUrls: [network.rpcUrl],
            blockExplorerUrls: [network.explorerUrl],
          }],
        });
        return true;
      } catch (addError) {
        console.error('❌ Erro ao adicionar rede INK:', addError);
        return false;
      }
    }
    console.error('❌ Erro ao trocar rede:', switchError);
    return false;
  }
}

/**
 * Converte lat/lng para inteiros (6 casas decimais) para o smart contract
 * Exemplo: 40.758000 → 40758000
 */
function coordToInt(coord: number): bigint {
  return BigInt(Math.round(coord * 1_000_000));
}

/**
 * Verifica se um spot já foi comprado
 */
export async function checkSpotOwnership(lat: number, lng: number): Promise<{
  isClaimed: boolean;
  owner: string | null;
  tokenId: number | null;
}> {
  const contractAddress = import.meta.env.VITE_INK_CONTRACT_ADDRESS;
  if (!contractAddress) {
    console.warn('⚠️ Endereço do contrato não configurado');
    return { isClaimed: false, owner: null, tokenId: null };
  }

  try {
    const network = getActiveNetwork();
    const readProvider = new JsonRpcProvider(network.rpcUrl);
    const contract = new Contract(contractAddress, GRAFFITI_SPOT_ABI, readProvider);
    
    const latInt = coordToInt(lat);
    const lngInt = coordToInt(lng);
    
    const isClaimed = await contract.isSpotClaimed(latInt, lngInt);
    
    if (isClaimed) {
      const owner = await contract.getSpotOwner(latInt, lngInt);
      const tokenId = await contract.getSpotTokenId(latInt, lngInt);
      return { 
        isClaimed: true, 
        owner, 
        tokenId: Number(tokenId) 
      };
    }
    
    return { isClaimed: false, owner: null, tokenId: null };
  } catch (error) {
    console.warn('⚠️ Erro ao verificar ownership (contrato pode não estar deployado ainda):', error);
    return { isClaimed: false, owner: null, tokenId: null };
  }
}

/**
 * Minta um spot NFT na rede INK
 */
export async function mintUrbanLayerNFT(
  lat: number,
  lng: number,
  locationName: string,
  tier: string,
  priceWei: string
): Promise<MintResult> {
  const contractAddress = import.meta.env.VITE_INK_CONTRACT_ADDRESS;
  if (!contractAddress) {
    return { success: false, error: 'Endereço do contrato não configurado no .env' };
  }

  if (!browserProvider) {
    return { success: false, error: 'Wallet não conectada' };
  }

  try {
    // Garantir rede correta
    const network = getActiveNetwork();
    const currentNetwork = await browserProvider.getNetwork();
    if (Number(currentNetwork.chainId) !== network.chainId) {
      const switched = await switchToInkNetwork();
      if (!switched) {
        return { success: false, error: `Por favor troque para a rede ${network.name}` };
      }
      // Re-create provider após trocar de rede
      browserProvider = new BrowserProvider((window as any).ethereum);
    }

    const signer = await browserProvider.getSigner();
    const contract = new Contract(contractAddress, GRAFFITI_SPOT_ABI, signer);
    
    const latInt = coordToInt(lat);
    const lngInt = coordToInt(lng);
    const tierUint = TIER_TO_UINT[tier] || 0;

    console.log('🎨 Mintando NFT...');
    console.log(`📍 Coords: ${lat}, ${lng} → ${latInt}, ${lngInt}`);
    console.log(`💰 Preço: ${formatEther(priceWei)} ETH`);
    console.log(`🏷️ Tier: ${tier} (${tierUint})`);

    // Chamar mintSpot com valor em ETH
    const tx = await contract.mintSpot(
      latInt,
      lngInt,
      locationName,
      tierUint,
      { value: priceWei }
    );

    console.log('⏳ Transação enviada:', tx.hash);
    
    // Aguardar confirmação
    const receipt = await tx.wait();
    console.log('✅ Transação confirmada! Block:', receipt.blockNumber);
    
    // Extrair tokenId do evento SpotMinted
    let tokenId = 0;
    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog({ 
          topics: log.topics as string[], 
          data: log.data 
        });
        if (parsed && parsed.name === 'SpotMinted') {
          tokenId = Number(parsed.args.tokenId);
          break;
        }
      } catch { /* skip logs que não são do nosso contrato */ }
    }

    return {
      success: true,
      tokenId,
      txHash: tx.hash,
      explorerUrl: getTxUrl(tx.hash),
      openSeaUrl: getOpenSeaUrl(contractAddress, tokenId),
    };
  } catch (error: any) {
    console.error('❌ Erro no mint:', error);
    
    // Tratar erros comuns
    if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
      return { success: false, error: 'Transação cancelada pelo usuário' };
    }
    if (error.message?.includes('insufficient funds')) {
      return { success: false, error: 'Saldo insuficiente de ETH na rede INK' };
    }
    if (error.message?.includes('already claimed')) {
      return { success: false, error: 'Este spot já foi comprado por outro usuário' };
    }
    
    return { success: false, error: error.reason || error.message || 'Erro desconhecido no mint' };
  }
}

/**
 * Formata endereço para exibição: 0x1234...5678
 */
export function formatAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Listeners internos para eventos do MetaMask
 */
async function handleAccountsChanged(accounts: string[]) {
  if (accounts.length === 0) {
    disconnectWallet();
  } else if (browserProvider) {
    const balance = await browserProvider.getBalance(accounts[0]);
    currentWalletState = {
      ...currentWalletState,
      address: accounts[0],
      balance: formatEther(balance),
    };
    notifyListeners();
  }
}

function handleChainChanged(_chainId: string) {
  // Recarrega a página como recomendado pelo MetaMask
  window.location.reload();
}
