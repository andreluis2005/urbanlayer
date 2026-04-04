/**
 * WalletButton — Botão premium de conexão de wallet
 * 
 * Aparece no canto superior direito em todas as telas.
 * Estados: Desconectado → Conectando → Conectado (endereço + balanço + rede)
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wallet, Loader2, ChevronDown, ExternalLink, LogOut, Zap, AlertTriangle } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { formatAddress } from '../services/Web3Service';
import { getActiveNetwork, getAddressUrl } from '../services/InkNetworkConfig';

const WalletButton: React.FC = () => {
  const { wallet, isWeb3Ready, isConnecting, connect, disconnect, switchNetwork, error } = useWeb3();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const network = getActiveNetwork();

  // Sem MetaMask
  if (!isWeb3Ready) {
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

  // Não conectado
  if (!wallet.isConnected) {
    return (
      <div className="flex flex-col items-end gap-1">
        <motion.button
          onClick={connect}
          disabled={isConnecting}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-neon-orange to-orange-500 text-black rounded-xl text-xs font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(255,99,33,0.3)] hover:shadow-[0_0_30px_rgba(255,99,33,0.5)] transition-shadow disabled:opacity-50"
        >
          {isConnecting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Wallet className="w-4 h-4" />
          )}
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </motion.button>
        {error && (
          <span className="text-red-400 text-[10px] font-mono max-w-[200px] truncate">{error}</span>
        )}
      </div>
    );
  }

  // Conectado — mostra endereço + balanço + dropdown
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

            {/* Disconnect */}
            <button
              onClick={() => { disconnect(); setIsMenuOpen(false); }}
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
