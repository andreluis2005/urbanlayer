/**
 * AuthContext — Estado global de autenticação unificada
 * 
 * Suporta 3 métodos de login, TODOS via Supabase Auth:
 * 1. Email/Senha (signInWithPassword)
 * 2. Google OAuth (signInWithOAuth)
 * 3. Wallet EVM — MetaMask etc (signInWithWeb3 — EIP-4361 nativo!)
 * 
 * SEGURANÇA:
 * - Todas as sessões são gerenciadas pelo Supabase (JWT + server-side)
 * - walletAddress é derivado do user.identities (não do localStorage)
 * - signOut limpa sessão Supabase + desconecta Web3Service
 * - Sem mais localStorage para wallet = sem sessão fantasma
 */
import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { disconnectWallet as disconnectWeb3Wallet } from '../services/Web3Service';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  walletAddress: string | null;
  signInWithWallet: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Extrai o endereço da wallet EVM do user Supabase.
 * Quando o login é feito via signInWithWeb3, o Supabase salva o
 * endereço da wallet como identity com provider 'web3' ou 'ethereum'.
 */
function extractWalletAddress(user: User | null): string | null {
  if (!user) return null;

  // Verificar identities do user
  const web3Identity = user.identities?.find(
    (id) => id.provider === 'web3' || id.provider === 'ethereum'
  );

  if (web3Identity?.identity_data?.address) {
    return web3Identity.identity_data.address as string;
  }

  // Fallback: verificar user_metadata (alguns SDKs salvam aqui)
  if (user.user_metadata?.wallet_address) {
    return user.user_metadata.wallet_address as string;
  }

  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // walletAddress é derivado do user — não armazenado separadamente
  const walletAddress = extractWalletAddress(user);

  // --- Inicialização + listener de auth ---
  useEffect(() => {
    // Verificar sessão existente
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Escutar mudanças de auth (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (_event === 'SIGNED_IN') {
        console.log('🔐 Auth: Usuário autenticado via', session?.user?.app_metadata?.provider || 'unknown');
      } else if (_event === 'SIGNED_OUT') {
        console.log('🔐 Auth: Sessão encerrada');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- Métodos de autenticação ---

  /**
   * Login via Wallet EVM (MetaMask, Rabby, etc.)
   * 
   * Usa o Supabase Auth nativo com EIP-4361 (Sign-In With Ethereum).
   * O Supabase cria automaticamente:
   * - Um user em auth.users
   * - Uma sessão com JWT válido
   * - Uma identity com o endereço da wallet
   * 
   * O MetaMask mostra um diálogo "Confirm Sign In" formatado e seguro.
   */
  const signInWithWallet = async () => {
    try {
      if (!(window as any).ethereum) {
        return { error: 'MetaMask não encontrado. Instale a extensão para continuar.' };
      }

      const { data, error } = await supabase.auth.signInWithWeb3({
        chain: 'ethereum',
        statement: 'I accept the UrbanLayer Terms of Service',
      });

      if (error) {
        console.error('🔐 Auth: Erro no signInWithWeb3:', error.message);
        // Tratar erros comuns
        if (error.message.includes('rejected') || error.message.includes('denied')) {
          return { error: 'Assinatura rejeitada pelo usuário.' };
        }
        return { error: error.message };
      }

      console.log('🔐 Auth: Login Web3 bem-sucedido!', data?.user?.id?.slice(0, 8) + '...');
      return { error: null };
    } catch (err: any) {
      console.error('🔐 Auth: Exceção no signInWithWeb3:', err);
      if (err.code === 4001) {
        return { error: 'Conexão rejeitada pelo usuário.' };
      }
      return { error: err.message || 'Erro ao conectar wallet.' };
    }
  };

  /**
   * SignOut completo — limpa TUDO:
   * 1. Supabase auth session (invalida JWT no servidor)
   * 2. Web3Service (limpa listeners + provider do MetaMask)
   */
  const signOut = async () => {
    await supabase.auth.signOut();
    disconnectWeb3Wallet();
    console.log('🔐 Auth: SignOut completo');
  };

  // isAuthenticated agora depende SOMENTE do Supabase user
  // Não depende mais de walletAddress manual/localStorage
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isLoading,
      isAuthenticated,
      walletAddress,
      signInWithWallet,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

