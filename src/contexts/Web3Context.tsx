/**
 * Web3Context — Estado global da wallet para toda a aplicação.
 * Wraps o Web3Service em um React Context para uso em qualquer componente.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  connectWallet as connectWalletService,
  disconnectWallet as disconnectWalletService,
  getWalletState,
  onWalletStateChange,
  switchToInkNetwork,
  isWeb3Available,
  type WalletState,
} from '../services/Web3Service';

interface Web3ContextType {
  wallet: WalletState;
  isWeb3Ready: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: () => Promise<boolean>;
  error: string | null;
}

const Web3Context = createContext<Web3ContextType | null>(null);

export function Web3Provider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletState>(getWalletState());
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Escutar mudanças no estado da wallet
  useEffect(() => {
    const unsubscribe = onWalletStateChange(setWallet);
    return unsubscribe;
  }, []);

  const connect = useCallback(async () => {
    if (!isWeb3Available()) {
      setError('Instale o MetaMask para continuar');
      return;
    }

    setIsConnecting(true);
    setError(null);
    try {
      await connectWalletService();
      
      // Auto-switch para rede INK se necessário
      const state = getWalletState();
      if (!state.isCorrectNetwork) {
        await switchToInkNetwork();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    disconnectWalletService();
    setError(null);
  }, []);

  const switchNetwork = useCallback(async () => {
    return await switchToInkNetwork();
  }, []);

  return (
    <Web3Context.Provider value={{
      wallet,
      isWeb3Ready: isWeb3Available(),
      isConnecting,
      connect,
      disconnect,
      switchNetwork,
      error,
    }}>
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3(): Web3ContextType {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
}
