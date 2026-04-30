/**
 * WalletModal — Modal Web3 nativo
 * 
 * Exclusivamente para conexões de carteiras EVM.
 * Design: Glassmorphism, dark, limpo.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Wallet, Loader2, Info } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function WalletModal({ isOpen, onClose, onSuccess }: WalletModalProps) {
  const { signInWithWallet } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleWallet = async () => {
    setIsLoading(true);
    setError(null);
    const result = await signInWithWallet();
    setIsLoading(false);
    
    if (result.error) {
      setError(result.error);
    } else {
      onSuccess();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-sm bg-[#111111] border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(139,92,246,0.1)]"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors text-gray-400 hover:text-white z-10"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="p-8">
            <div className="text-center mb-8 mt-2">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-purple-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                <Wallet className="w-8 h-8 text-purple-400" />
              </div>
              <h2 className="text-xl font-bold mb-2">Connect Wallet</h2>
              <p className="text-sm text-gray-400">Autenticação Web3 segura e rápida</p>
            </div>

            {/* Wallet Options */}
            <div className="space-y-3">
              {/* Browser Wallet (MetaMask, Rabby, etc) */}
              <button
                onClick={handleWallet}
                disabled={isLoading}
                className="w-full flex items-center gap-4 px-5 py-4 bg-white/[0.03] border border-white/10 rounded-2xl hover:bg-white/[0.08] hover:border-white/20 transition-all group disabled:opacity-50 relative overflow-hidden"
              >
                <div className="w-10 h-10 bg-[#F6851B]/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  {/* Ícone genérico de raposa/injected */}
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21.5 5.5L18.5 2L16.5 6L14.5 4.5L12 9.5L9.5 4.5L7.5 6L5.5 2L2.5 5.5L4 12.5L2 19L7.5 17L12 21.5L16.5 17L22 19L20 12.5L21.5 5.5Z" fill="#F6851B"/>
                  </svg>
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-sm">Browser Wallet</p>
                  <p className="text-[10px] text-gray-400 font-mono">MetaMask, Rabby, Trust</p>
                </div>
                {isLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
              </button>

              {/* WalletConnect (Stub) */}
              <button
                disabled
                className="w-full flex items-center gap-4 px-5 py-4 bg-white/[0.01] border border-white/5 rounded-2xl opacity-50 cursor-not-allowed"
              >
                <div className="w-10 h-10 bg-[#3B99FC]/10 rounded-xl flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 8C9.31371 8 12 10.6863 12 14M6 14C6 14 6 14.01 6 14.01M6 11C7.65685 11 9 12.3431 9 14" stroke="#3B99FC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-sm text-gray-500">WalletConnect</p>
                  <p className="text-[10px] text-gray-600 font-mono">Em breve</p>
                </div>
              </button>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="mt-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-start gap-2"
              >
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </motion.div>
            )}

            <p className="text-center text-[10px] text-gray-600 mt-6 max-w-[250px] mx-auto">
              Ao conectar sua wallet você concorda com os Termos de Serviço da UrbanLayer.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
