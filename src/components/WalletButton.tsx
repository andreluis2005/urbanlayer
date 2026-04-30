/**
 * WalletButton — Botão premium de conexão de wallet e Menu do Usuário
 * 
 * Aparece no canto superior direito em todas as telas.
 * Estados: 
 * 1. Autenticado s/ Wallet (Google Login) -> Mostra Avatar/Email e Menu de Logout
 * 2. Autenticado c/ Wallet -> Mostra Endereço, Balanço, Rede e Menu
 * 3. Não Autenticado e Não Conectado -> Mostra Botão de Instalar ou Conectar
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wallet, Loader2, ChevronDown, ExternalLink, LogOut, Zap, AlertTriangle, User as UserIcon } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { useAuth } from '../contexts/AuthContext';
import { formatAddress } from '../services/Web3Service';
import { getActiveNetwork, getAddressUrl } from '../services/InkNetworkConfig';

const WalletButton: React.FC = () => {
  const { wallet, isWeb3Ready, isConnecting, connect, disconnect, switchNetwork, silentConnect, error } = useWeb3();
  const { user, isAuthenticated, walletAddress, signOut, signInWithWallet } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const network = getActiveNetwork();
  const autoConnectAttempted = useRef(false);

  /**
   * AUTO-CONNECT: Quando o login é feito via MetaMask (signInWithWeb3),
   * o Supabase cria a sessão, mas o Web3Context fica desconectado.
   * Este efeito detecta essa situação e conecta automaticamente a wallet,
   * evitando o clique extra em "Connect Wallet" após o Confirm.
   */
  useEffect(() => {
    if (
      isAuthenticated &&
      walletAddress &&          // Login foi via Web3 (tem wallet no user)
      !wallet.isConnected &&    // Web3Context ainda não conectou
      isWeb3Ready &&            // MetaMask está instalado
      !autoConnectAttempted.current  // Evita loops
    ) {
      autoConnectAttempted.current = true;
      console.log('🔗 Auto-connect: Login Web3 detectado, conectando silenciosamente...');
      silentConnect().finally(() => {
        // Reset para permitir reconexão em caso de mudança de conta
        autoConnectAttempted.current = false;
      });
    }
  }, [isAuthenticated, walletAddress, wallet.isConnected, isWeb3Ready, silentConnect]);

  // Caso 1: Usuário não tem MetaMask / Web3 Provider instalado e não está logado
  if (!isWeb3Ready && !isAuthenticated) {
    return (
      <a
        href="https://metamask.io/download/"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-mono uppercase tracking-wider transition-all backdrop-blur-md"
      >
        <Wallet className="w-4 h-4 text-neon-orange" />
        Install Wallet
      </a>
    );
  }

  // Caso 2: Não logado e não conectado a nenhuma wallet
  if (!isAuthenticated && !wallet.isConnected) {
    return (
      <div className="flex flex-col items-end gap-1">
        <motion.button
          onClick={async () => {
            setIsSigningIn(true);
            await signInWithWallet();
            setIsSigningIn(false);
          }}
          disabled={isSigningIn}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-neon-orange to-orange-500 text-black rounded-xl text-xs font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(255,99,33,0.3)] hover:shadow-[0_0_30px_rgba(255,99,33,0.5)] transition-shadow disabled:opacity-50"
        >
          {isSigningIn ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Wallet className="w-4 h-4" />
          )}
          {isSigningIn ? 'Signing In...' : 'Connect Wallet'}
        </motion.button>
        {error && (
          <span className="text-red-400 text-[10px] font-mono max-w-[200px] truncate">{error}</span>
        )}
      </div>
    );
  }

  // Identifica como o usuário está logado
  const isGoogleUser = isAuthenticated && user?.app_metadata?.provider === 'google';
  const displayEmail = user?.email;
  const avatarUrl = user?.user_metadata?.avatar_url;

  // Caso 3: Logado via Google/Email, mas sem Wallet conectada
  // Mostra um perfil simples + botão de conectar wallet + menu dropdown
  if (isAuthenticated && !wallet.isConnected) {
    return (
      <div className="relative flex items-center gap-3">
        {/* Sugestão para conectar wallet se quiser mintar grafites */}
        <motion.button
          onClick={connect}
          disabled={isConnecting}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-mono uppercase tracking-wider transition-all backdrop-blur-md"
        >
          {isConnecting ? <Loader2 className="w-3 h-3 animate-spin text-neon-orange" /> : <Wallet className="w-3 h-3 text-neon-orange" />}
          <span className="hidden sm:inline">Connect Wallet</span>
        </motion.button>

        {/* User Menu Button */}
        <motion.button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          whileHover={{ scale: 1.02 }}
          className="flex items-center gap-3 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl backdrop-blur-md transition-all"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="w-6 h-6 rounded-full border border-white/20" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-500 to-neon-orange flex items-center justify-center border border-white/20">
              <UserIcon className="w-3 h-3 text-white" />
            </div>
          )}
          <div className="flex flex-col items-start hidden sm:flex">
            <span className="text-xs font-bold text-white">{isGoogleUser ? 'Google User' : 'Authenticated'}</span>
            <span className="text-[10px] text-gray-400 font-mono truncate max-w-[100px]">{displayEmail}</span>
          </div>
          <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
        </motion.button>

        {/* Dropdown Menu para Usuários sem Wallet (Google/Email) */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -5, scale: 0.95 }}
              className="absolute top-full right-0 mt-2 w-56 bg-black/90 border border-white/10 rounded-xl backdrop-blur-xl shadow-2xl overflow-hidden z-[200]"
            >
              <button
                onClick={() => { 
                  signOut(); 
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
              >
                <LogOut className="w-4 h-4 text-red-400" />
                <span className="text-xs font-bold text-red-400">Disconnect & Leave</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Overlay Invisível */}
        {isMenuOpen && <div className="fixed inset-0 z-[199]" onClick={() => setIsMenuOpen(false)} />}
      </div>
    );
  }

  // Caso 4: Conectado com Wallet (seja Login via Web3 ou Google + Wallet conectada depois)
  return (
    <div className="relative">
      <motion.button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        whileHover={{ scale: 1.02 }}
        className="flex items-center gap-3 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl backdrop-blur-md transition-all"
      >
        {/* Network Badge */}
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
          wallet.isCorrectNetwork
            ? 'bg-neon-green/10 text-neon-green border border-neon-green/20'
            : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          <Zap className="w-3 h-3" />
          {wallet.isCorrectNetwork ? (network.isTestnet ? 'Testnet' : 'Ink') : 'Wrong Net'}
        </div>

        {/* Balance + Address */}
        <div className="flex flex-col items-end">
          <span className="text-xs font-bold text-white">
            {parseFloat(wallet.balance || '0').toFixed(4)} ETH
          </span>
          <span className="text-[10px] text-gray-400 font-mono">
            {formatAddress(wallet.address || '')}
          </span>
        </div>

        <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
      </motion.button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.95 }}
            className="absolute top-full right-0 mt-2 w-64 bg-black/90 border border-white/10 rounded-xl backdrop-blur-xl shadow-2xl overflow-hidden z-[200]"
          >
            {/* Wrong Network Warning */}
            {!wallet.isCorrectNetwork && (
              <button
                onClick={async () => { await switchNetwork(); setIsMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors border-b border-white/5"
              >
                <AlertTriangle className="w-4 h-4 text-neon-orange" />
                <div>
                  <p className="text-xs font-bold text-neon-orange">Switch to {network.name}</p>
                  <p className="text-[10px] text-gray-500">Click to switch network</p>
                </div>
              </button>
            )}

            {/* View on Explorer */}
            <a
              href={getAddressUrl(wallet.address || '')}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-300">View on Explorer</span>
            </a>

            {/* Disconnect — limpa Web3 + Auth. AppRouter redireciona automaticamente */}
            <button
              onClick={() => { 
                disconnect();    // 1. Limpa Web3Service (provider + listeners)
                signOut();       // 2. Limpa AuthContext (wallet + localStorage + Supabase)
                setIsMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors border-t border-white/5"
            >
              <LogOut className="w-4 h-4 text-red-400" />
              <span className="text-xs text-red-400">Disconnect</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside to close */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[199]" onClick={() => setIsMenuOpen(false)} />
      )}
    </div>
  );
};

export default WalletButton;
