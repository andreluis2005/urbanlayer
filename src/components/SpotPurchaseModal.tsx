/**
 * SpotPurchaseModal — Modal premium para compra de spots NFT
 * 
 * Fluxo: Mostrar Tier → Conectar Wallet → Aprovar TX → Mintando → Sucesso!
 * Design: Glassmorphism + animações dinâmicas + confetti no sucesso
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Wallet, MapPin, Shield, ExternalLink, Loader2, Check, AlertTriangle, Sparkles } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { mintUrbanLayerNFT, type MintResult } from '../services/Web3Service';
import { calculateSpotPrice } from '../services/PricingEngine';
import { SPOT_TIERS, type SpotTier, getActiveNetwork } from '../services/InkNetworkConfig';
import confetti from 'canvas-confetti';

interface SpotPurchaseModalProps {
  lat: number;
  lng: number;
  locationName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: MintResult) => void;
}

type ModalStep = 'loading' | 'pricing' | 'minting' | 'success' | 'error';

const SpotPurchaseModal: React.FC<SpotPurchaseModalProps> = ({
  lat, lng, locationName, isOpen, onClose, onSuccess
}) => {
  const { wallet, connect, isConnecting } = useWeb3();
  const [step, setStep] = useState<ModalStep>('loading');
  const [tier, setTier] = useState<SpotTier>('bronze');
  const [poiCount, setPoiCount] = useState(0);
  const [mintResult, setMintResult] = useState<MintResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const network = getActiveNetwork();

  // Calcular preço quando modal abre
  useEffect(() => {
    if (!isOpen) return;
    setStep('loading');
    setMintResult(null);
    setErrorMessage('');
    
    calculateSpotPrice(lat, lng).then((result) => {
      setTier(result.tier);
      setPoiCount(result.poiCount);
      setStep('pricing');
    }).catch(() => {
      setTier('bronze');
      setStep('pricing');
    });
  }, [isOpen, lat, lng]);

  const handleMint = async () => {
    if (!wallet.isConnected) {
      await connect();
      return;
    }

    setStep('minting');
    const tierInfo = SPOT_TIERS[tier];
    
    const result = await mintUrbanLayerNFT(
      lat, lng, locationName, tier, tierInfo.priceWei
    );

    if (result.success) {
      setMintResult(result);
      setStep('success');
      confetti({
        particleCount: 200,
        spread: 120,
        origin: { y: 0.5 },
        colors: ['#FF6321', '#00FF00', '#00F0FF', '#FFD700']
      });
      onSuccess(result);
    } else {
      setErrorMessage(result.error || 'Erro desconhecido');
      setStep('error');
    }
  };

  if (!isOpen) return null;

  const tierInfo = SPOT_TIERS[tier];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
        
        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-md bg-black/90 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl shadow-[0_0_80px_rgba(255,99,33,0.15)]"
        >
          {/* Header com gradiente */}
          <div className="relative px-6 pt-6 pb-4">
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent" />
            <div className="relative flex items-center justify-between">
              <h2 className="text-lg font-bold uppercase tracking-widest flex items-center gap-2">
                <Shield className="w-5 h-5 text-neon-orange" />
                Claim This Spot
              </h2>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="px-6 pb-6 space-y-5">
            {/* Localização */}
            <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
              <MapPin className="w-5 h-5 text-neon-orange mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Location</p>
                <p className="text-sm font-medium truncate max-w-[300px]">{locationName}</p>
                <p className="text-[10px] text-gray-500 font-mono mt-1">{lat.toFixed(6)}, {lng.toFixed(6)}</p>
              </div>
            </div>

            {/* Loading */}
            {step === 'loading' && (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="w-8 h-8 text-neon-orange animate-spin mb-3" />
                <p className="text-xs text-gray-400 uppercase tracking-widest">Analyzing location...</p>
              </div>
            )}

            {/* Pricing */}
            {step === 'pricing' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                {/* Tier Badge */}
                <div className="flex items-center justify-center">
                  <div
                    className="px-6 py-3 rounded-2xl border text-center"
                    style={{ 
                      borderColor: `${tierInfo.color}40`,
                      background: `${tierInfo.color}10`
                    }}
                  >
                    <div className="text-3xl mb-1">{tierInfo.emoji}</div>
                    <div className="text-xs font-bold uppercase tracking-widest" style={{ color: tierInfo.color }}>
                      {tierInfo.name} Tier
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1">{poiCount} POIs detected • {tierInfo.multiplier}</div>
                  </div>
                </div>

                {/* Preço */}
                <div className="text-center space-y-1">
                  <p className="text-3xl font-bold tracking-tight">
                    {tierInfo.price} <span className="text-lg text-gray-400">ETH</span>
                  </p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                    on {network.name} {network.isTestnet && '(Testnet)'}
                  </p>
                </div>

                {/* O que você ganha */}
                <div className="space-y-2 p-3 bg-white/5 rounded-xl border border-white/5">
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">What you get</p>
                  <div className="space-y-1.5 text-xs text-gray-300">
                    <div className="flex items-center gap-2">
                      <Check className="w-3 h-3 text-neon-green shrink-0" />
                      <span>NFT ownership of this exact location</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3 h-3 text-neon-green shrink-0" />
                      <span>Exclusive right to graffiti this wall</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3 h-3 text-neon-green shrink-0" />
                      <span>Tradeable on OpenSea</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3 h-3 text-neon-green shrink-0" />
                      <span>5% royalties on resales</span>
                    </div>
                  </div>
                </div>

                {/* Botão de ação */}
                {!wallet.isConnected ? (
                  <motion.button
                    onClick={connect}
                    disabled={isConnecting}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-4 bg-gradient-to-r from-neon-orange to-orange-500 text-black rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,99,33,0.3)] disabled:opacity-50"
                  >
                    {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                    {isConnecting ? 'Connecting...' : 'Connect Wallet to Buy'}
                  </motion.button>
                ) : (
                  <motion.button
                    onClick={handleMint}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-4 bg-gradient-to-r from-neon-green to-emerald-500 text-black rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,255,0,0.2)]"
                  >
                    <Sparkles className="w-4 h-4" />
                    Buy & Mint NFT — {tierInfo.price} ETH
                  </motion.button>
                )}

                {!wallet.isCorrectNetwork && wallet.isConnected && (
                  <p className="text-center text-[10px] text-neon-orange flex items-center justify-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Wrong network — will auto-switch to {network.name}
                  </p>
                )}
              </motion.div>
            )}

            {/* Minting */}
            {step === 'minting' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-8 space-y-4">
                <div className="relative">
                  <Loader2 className="w-16 h-16 text-neon-orange animate-spin" />
                  <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-white animate-pulse" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-lg font-bold uppercase tracking-wider">Minting your NFT...</p>
                  <p className="text-[10px] text-gray-400">Confirm the transaction in your wallet</p>
                  <p className="text-[10px] text-gray-500 mt-2">This may take a few seconds</p>
                </div>
              </motion.div>
            )}

            {/* Success */}
            {step === 'success' && mintResult && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                <div className="flex flex-col items-center py-4 space-y-3">
                  <div className="w-16 h-16 bg-neon-green rounded-full flex items-center justify-center">
                    <Check className="w-8 h-8 text-black" />
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-neon-green uppercase tracking-wider">Spot Claimed!</p>
                    <p className="text-xs text-gray-400 mt-1">Token #{mintResult.tokenId}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {mintResult.explorerUrl && (
                    <a
                      href={mintResult.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-xs font-mono"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View Transaction
                    </a>
                  )}
                  {mintResult.openSeaUrl && (
                    <a
                      href={mintResult.openSeaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl transition-colors text-xs font-bold uppercase tracking-wider"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View on OpenSea
                    </a>
                  )}
                </div>

                <button
                  onClick={onClose}
                  className="w-full py-4 bg-neon-orange text-black rounded-xl font-bold uppercase tracking-widest"
                >
                  Start Graffitiing! 🎨
                </button>
              </motion.div>
            )}

            {/* Error */}
            {step === 'error' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="flex flex-col items-center py-4 space-y-3">
                  <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8 text-red-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-red-400 uppercase tracking-wider">Transaction Failed</p>
                    <p className="text-xs text-gray-400 mt-2 max-w-xs">{errorMessage}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setStep('pricing')}
                    className="flex-1 py-3 border border-white/20 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-white/5 transition-colors"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 bg-white/10 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-white/15 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SpotPurchaseModal;
