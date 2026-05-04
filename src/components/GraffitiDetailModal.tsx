/**
 * GraffitiDetailModal — Lightbox fullscreen para visualizar um grafite em detalhe.
 *
 * Features:
 * - Imagem em alta resolução com zoom
 * - Informações do artista, tier, localização
 * - Botões: "Ver no Street View", "Compartilhar", "Like"
 * - Animação glassmorphism de entrada
 * - Contadores de likes e views
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, MapPin, Eye, Heart, Share2, Navigation, Crown, Zap, PaintBucket,
  ExternalLink, Calendar, Palette, Copy, Check
} from 'lucide-react';
import { formatAddress } from '../services/Web3Service';
import { supabase } from '../lib/supabase';
import type { Graffiti } from './GlobalGallery';

interface GraffitiDetailModalProps {
  graffiti: Graffiti | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToStreetView: (graffiti: Graffiti) => void;
}

export default function GraffitiDetailModal({
  graffiti,
  isOpen,
  onClose,
  onNavigateToStreetView,
}: GraffitiDetailModalProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [viewCount, setViewCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [animatingHeart, setAnimatingHeart] = useState(false);

  // Incrementar views ao abrir
  useEffect(() => {
    if (!isOpen || !graffiti) return;
    setImageLoaded(false);

    // Buscar contadores atuais
    const fetchCounts = async () => {
      const { data } = await supabase
        .from('graffitis')
        .select('likes, views')
        .eq('id', graffiti.id)
        .single();

      if (data) {
        setLikeCount((data as any).likes || 0);
        setViewCount(((data as any).views || 0) + 1);
      }

      // Incrementar view
      try {
        await supabase.rpc('increment_graffiti_views', { graffiti_id: graffiti.id });
      } catch {
        // Se a RPC não existir ainda, incrementar manualmente
        await supabase
          .from('graffitis')
          .update({ views: ((data as any)?.views || 0) + 1 } as any)
          .eq('id', graffiti.id);
      }
    };

    fetchCounts();
    setIsLiked(false);
  }, [isOpen, graffiti]);

  const handleLike = useCallback(async () => {
    if (!graffiti || isLiked) return;

    setIsLiked(true);
    setLikeCount(prev => prev + 1);
    setAnimatingHeart(true);
    setTimeout(() => setAnimatingHeart(false), 600);

    // Incrementar like no banco
    try {
      await supabase
        .from('graffitis')
        .update({ likes: likeCount + 1 } as any)
        .eq('id', graffiti.id);
    } catch (err) {
      console.error(err);
    }
  }, [graffiti, isLiked, likeCount]);

  const handleShare = useCallback(async () => {
    if (!graffiti) return;

    const url = `${window.location.origin}/art/${graffiti.id}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback para navegadores sem clipboard API
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [graffiti]);

  const getTierInfo = (tier?: string | null) => {
    switch (tier) {
      case 'legendary':
        return { icon: <Crown className="w-4 h-4" />, label: 'Legendary', color: 'text-purple-400', bg: 'bg-purple-500/20 border-purple-500/30' };
      case 'gold':
        return { icon: <Crown className="w-4 h-4" />, label: 'Gold', color: 'text-yellow-400', bg: 'bg-yellow-500/20 border-yellow-500/30' };
      case 'silver':
        return { icon: <Zap className="w-4 h-4" />, label: 'Silver', color: 'text-gray-300', bg: 'bg-gray-500/20 border-gray-500/30' };
      default:
        return { icon: <PaintBucket className="w-4 h-4" />, label: 'Bronze', color: 'text-neon-orange', bg: 'bg-orange-500/20 border-orange-500/30' };
    }
  };

  if (!isOpen || !graffiti) return null;

  const tierInfo = getTierInfo(graffiti.tier);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/85 backdrop-blur-xl" />

        {/* Modal Content */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-[95vw] max-w-5xl max-h-[90vh] bg-[#0A0A0A]/95 border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(255,99,33,0.1)] flex flex-col lg:flex-row"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-3 bg-black/60 hover:bg-black/80 rounded-full transition-colors backdrop-blur-sm border border-white/10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Left: Image */}
          <div className="relative lg:w-3/5 flex-shrink-0 bg-black flex items-center justify-center overflow-hidden">
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-neon-orange border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <img
              src={graffiti.image_url}
              alt={graffiti.title || 'Graffiti'}
              onLoad={() => setImageLoaded(true)}
              className={`w-full h-full object-contain max-h-[50vh] lg:max-h-[90vh] transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            />

            {/* Gradient overlay bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0A0A0A] to-transparent lg:hidden" />
          </div>

          {/* Right: Info Panel */}
          <div className="lg:w-2/5 p-6 lg:p-8 flex flex-col gap-5 overflow-y-auto">
            {/* Title & Tier */}
            <div className="space-y-3">
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold uppercase tracking-widest ${tierInfo.bg} ${tierInfo.color}`}>
                {tierInfo.icon}
                {tierInfo.label}
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-white">
                {graffiti.title || 'Untitled Masterpiece'}
              </h2>
            </div>

            {/* Artist */}
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-orange to-purple-600 flex items-center justify-center text-xs font-bold">
                {graffiti.artist_address ? graffiti.artist_address.slice(2, 4).toUpperCase() : '??'}
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-widest">Artist</p>
                <p className="text-sm font-mono text-white">
                  {graffiti.artist_address ? formatAddress(graffiti.artist_address) : 'Anonymous'}
                </p>
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                <div className="flex items-center gap-2 text-gray-400 mb-1">
                  <MapPin className="w-3.5 h-3.5 text-neon-blue" />
                  <span className="text-[10px] uppercase tracking-widest">Location</span>
                </div>
                <p className="text-xs text-white line-clamp-2">{graffiti.address || 'Unknown'}</p>
              </div>

              <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                <div className="flex items-center gap-2 text-gray-400 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-neon-green" />
                  <span className="text-[10px] uppercase tracking-widest">Created</span>
                </div>
                <p className="text-xs text-white">
                  {new Date(graffiti.created_at).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'short', day: 'numeric'
                  })}
                </p>
              </div>

              {graffiti.style && (
                <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2 text-gray-400 mb-1">
                    <Palette className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-[10px] uppercase tracking-widest">Style</span>
                  </div>
                  <p className="text-xs text-white capitalize">{graffiti.style}</p>
                </div>
              )}

              <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                <div className="flex items-center gap-2 text-gray-400 mb-1">
                  <Navigation className="w-3.5 h-3.5 text-neon-orange" />
                  <span className="text-[10px] uppercase tracking-widest">Coords</span>
                </div>
                <p className="text-xs text-white font-mono">
                  {graffiti.lat.toFixed(4)}, {graffiti.lng.toFixed(4)}
                </p>
              </div>
            </div>

            {/* Social Counters */}
            <div className="flex items-center gap-6 py-3 border-t border-b border-white/5">
              <button
                onClick={handleLike}
                disabled={isLiked}
                className={`flex items-center gap-2 transition-all ${isLiked ? 'text-red-400' : 'text-gray-400 hover:text-red-400'}`}
              >
                <Heart
                  className={`w-5 h-5 ${isLiked ? 'fill-red-400' : ''} ${animatingHeart ? 'animate-heart-burst' : ''}`}
                />
                <span className="text-sm font-bold">{likeCount}</span>
              </button>

              <div className="flex items-center gap-2 text-gray-400">
                <Eye className="w-5 h-5" />
                <span className="text-sm font-bold">{viewCount}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 mt-auto">
              <button
                onClick={() => onNavigateToStreetView(graffiti)}
                className="w-full px-6 py-4 bg-neon-orange text-black rounded-2xl font-bold text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(255,99,33,0.3)]"
              >
                <Navigation className="w-5 h-5" />
                View in Street View
              </button>

              <button
                onClick={handleShare}
                className="w-full px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-sm font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-3"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-neon-green" />
                    <span className="text-neon-green">Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    Share
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
