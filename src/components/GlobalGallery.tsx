import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { X, Loader2, MapPin, PaintBucket, Crown, Zap, Sparkles, Search, Globe2, User } from 'lucide-react';
import { formatAddress } from '../services/Web3Service';
import { useWeb3 } from '../contexts/Web3Context';

export interface Graffiti {
  id: string;
  artist_address: string | null;
  title: string | null;
  address: string | null;
  image_url: string;
  created_at: string;
  tier?: string | null;
  lat: number;
  lng: number;
  graffiti_url?: string | null;
  heading?: number | null;
  pitch?: number | null;
}

interface GlobalGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectGraffiti: (graffiti: Graffiti) => void;
}

type TabType = 'global' | 'personal';
type TierFilter = 'all' | 'legendary' | 'gold' | 'silver' | 'bronze';

export default function GlobalGallery({ isOpen, onClose, onSelectGraffiti }: GlobalGalleryProps) {
  const { wallet } = useWeb3();
  const [items, setItems] = useState<Graffiti[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters State
  const [activeTab, setActiveTab] = useState<TabType>('global');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTier, setActiveTier] = useState<TierFilter>('all');
  
  // Debounce para a busca por texto
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchGraffitis = useCallback(async () => {
    if (!isOpen) return;
    
    setIsLoading(true);
    try {
      let query = supabase
        .from('graffitis')
        .select('*')
        .order('created_at', { ascending: false });

      // Filtro de Aba (Minhas Artes)
      if (activeTab === 'personal') {
        if (!wallet.address) {
          setItems([]);
          setIsLoading(false);
          return;
        }
        // Case-insensitive match ou exato para o endereço da carteira
        query = query.ilike('artist_address', wallet.address);
      }

      // Filtro de Localização (Busca Textual)
      if (debouncedSearch.trim() !== '') {
        query = query.ilike('address', `%${debouncedSearch.trim()}%`);
      }

      // Filtro de Raridade (Tier)
      if (activeTier !== 'all') {
        // Se o tier for 'bronze', podemos assumir null ou 'bronze' dependendo da base.
        // Assumindo que a base tem o campo tier certinho:
        if (activeTier === 'bronze') {
           query = query.is('tier', null); // Default spots são null/bronze
        } else {
           query = query.eq('tier', activeTier);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      if (data) {
        setItems(data as Graffiti[]);
      }
    } catch (err) {
      console.error("Erro ao carregar galeria:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, activeTab, debouncedSearch, activeTier, wallet.address]);

  useEffect(() => {
    fetchGraffitis();
  }, [fetchGraffitis]);

  const getTierIcon = (tier?: string | null) => {
    switch (tier) {
      case 'legendary': return <Crown className="w-4 h-4 text-purple-400" />;
      case 'gold': return <Crown className="w-4 h-4 text-yellow-400" />;
      case 'silver': return <Zap className="w-4 h-4 text-gray-300" />;
      default: return <PaintBucket className="w-4 h-4 text-neon-orange" />;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
        animate={{ opacity: 1, backdropFilter: 'blur(20px)' }}
        exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
        className="fixed inset-0 z-[160] bg-black/80 overflow-y-auto"
      >
        {/* Top Header Fixo */}
        <div className="sticky top-0 z-20 w-full bg-black/80 backdrop-blur-xl border-b border-white/10">
          <div className="px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-neon-green" />
              <div>
                <h2 className="text-xl font-bold uppercase tracking-widest text-white">Marketplace Explorer</h2>
                <p className="text-xs text-gray-400 font-mono">Territories Conquered Worldwide</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sticky Filters Toolbar */}
          <div className="px-6 pb-4 pt-2 flex flex-col md:flex-row gap-4 items-center justify-between border-t border-white/5 bg-black/40">
            
            {/* Tabs */}
            <div className="flex bg-white/5 p-1 rounded-xl w-full md:w-auto shrink-0">
              <button
                onClick={() => setActiveTab('global')}
                className={`flex-1 md:px-6 py-2 rounded-lg flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest transition-all ${
                  activeTab === 'global' ? 'bg-white text-black shadow-md' : 'text-gray-500 hover:text-white hover:bg-white/5'
                }`}
              >
                <Globe2 className="w-4 h-4" /> Global
              </button>
              <button
                onClick={() => setActiveTab('personal')}
                className={`flex-1 md:px-6 py-2 rounded-lg flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest transition-all ${
                  activeTab === 'personal' ? 'bg-neon-orange text-black shadow-md' : 'text-gray-500 hover:text-white hover:bg-white/5'
                }`}
              >
                <User className="w-4 h-4" /> My Territory
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input 
                type="text" 
                placeholder="Search city, neighborhood, or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-neon-green transition-colors text-white placeholder:text-gray-600"
              />
            </div>

            {/* Tier Filter Pills */}
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide shrink-0">
              {(['all', 'legendary', 'gold', 'silver', 'bronze'] as TierFilter[]).map((tier) => (
                <button
                  key={tier}
                  onClick={() => setActiveTier(tier)}
                  className={`px-4 py-2 rounded-full border text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                    activeTier === tier 
                      ? 'bg-neon-green/20 border-neon-green text-neon-green shadow-[0_0_10px_rgba(0,255,0,0.2)]' 
                      : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30 hover:text-white'
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>
            
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <Loader2 className="w-12 h-12 text-neon-orange animate-spin" />
              <p className="text-sm text-gray-500 font-mono uppercase tracking-widest">Searching the streets...</p>
            </div>
          ) : activeTab === 'personal' && !wallet.address ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <User className="w-16 h-16 text-gray-600 mb-2" />
              <p className="text-xl font-bold text-gray-300">Wallet Disconnected</p>
              <p className="text-sm text-gray-500 text-center max-w-md">
                Connect your Web3 Wallet to view the territories you have conquered and the masterpieces you own.
              </p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <PaintBucket className="w-16 h-16 text-gray-600 mb-2" />
              <p className="text-xl font-bold text-gray-300">No graffitis found.</p>
              <p className="text-sm text-gray-500 text-center max-w-md">
                Try adjusting your search or filters. Or better yet, go to the map and mint the first one here!
              </p>
            </div>
          ) : (
            <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
              {items.map((item, i) => (
                <motion.div
                  key={item.id}
                  onClick={() => onSelectGraffiti(item)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="break-inside-avoid relative group rounded-2xl overflow-hidden border border-white/10 bg-[#0A0A0A] shadow-xl cursor-pointer hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] transition-all"
                >
                  <img
                    src={item.image_url}
                    alt={item.title || 'Graffiti'}
                    className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  
                  {/* Gradiente escuro sobre a imagem para o texto ser legível */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  <div className="absolute bottom-0 left-0 right-0 p-5 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg text-white drop-shadow-md truncate max-w-[70%]">
                        {item.title || 'Untitled'}
                      </h3>
                      <div className="p-2 bg-black/50 backdrop-blur-sm rounded-lg border border-white/10">
                        {getTierIcon(item.tier)}
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-xs text-gray-300 flex items-center gap-2 font-mono">
                        <span className="text-neon-orange font-bold">BY</span> 
                        {item.artist_address ? formatAddress(item.artist_address) : 'Anon'}
                      </p>
                      <p className="text-[10px] text-gray-400 flex items-center gap-1.5 line-clamp-2">
                        <MapPin className="w-3 h-3 text-neon-blue shrink-0" />
                        {item.address || 'Unknown Location'}
                      </p>
                      <p className="text-[9px] text-gray-600 font-mono mt-2">
                        {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
