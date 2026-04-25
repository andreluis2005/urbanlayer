import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { Sparkles, Swords, Globe2, Crown, PaintBucket } from 'lucide-react';
import { formatAddress } from '../services/Web3Service';

interface FeedEvent {
  id: string;
  artist_address: string | null;
  title: string | null;
  address: string | null;
  created_at: string;
  tier?: string | null;
  action_type?: string;
}

const MOCK_EVENTS: FeedEvent[] = [
  { id: 'm1', action_type: 'mint', artist_address: '0x1A2B3C', title: 'Cyberpunk Neon', address: 'Shinjuku, Tóquio', tier: 'gold', created_at: '' },
  { id: 'm2', action_type: 'sale', artist_address: '0x9F8E7D', title: 'NFT Lendário', address: 'Times Square, NY', tier: 'legendary', created_at: '' },
  { id: 'm3', action_type: 'overwrite', artist_address: '0x5B4A9F', title: 'Domínio de Muro', address: 'Brooklyn, NY', tier: 'silver', created_at: '' },
  { id: 'm4', action_type: 'new_spot', artist_address: '0x7D6C5B', title: 'Novo Spot', address: 'Berlim, Alemanha', tier: 'bronze', created_at: '' },
  { id: 'm5', action_type: 'mint', artist_address: '0x3F5A8B', title: 'Street Soul', address: 'Beco do Batman, SP', tier: 'gold', created_at: '' }
];

export default function SocialFeedTicker() {
  const [eventQueue, setEventQueue] = useState<FeedEvent[]>(MOCK_EVENTS);
  const [currentEvent, setCurrentEvent] = useState<FeedEvent | null>(null);
  const [isPastThreshold, setIsPastThreshold] = useState(false);

  useEffect(() => {
    const checkScroll = () => {
      const scrollableElement = document.scrollingElement || document.body;
      const scrollY = scrollableElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = scrollableElement.scrollHeight;
      
      // Mostra apenas se rolar mais que 50% da página
      if (scrollY > (documentHeight * 0.5) - windowHeight) {
        setIsPastThreshold(true);
      } else {
        setIsPastThreshold(false);
      }
    };

    window.addEventListener('scroll', checkScroll, true);
    checkScroll();

    return () => window.removeEventListener('scroll', checkScroll, true);
  }, []);

  useEffect(() => {
    // 1. Escuta novos eventos do Supabase e coloca no topo da fila
    const channel = supabase
      .channel('public:graffitis')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'graffitis' },
        (payload) => {
          const newEvent = payload.new as FeedEvent;
          newEvent.action_type = 'mint';
          setEventQueue((prev) => [newEvent, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    // 2. Busca histórico real
    const fetchInitial = async () => {
      const { data } = await supabase
        .from('graffitis')
        .select('id, artist_address, title, address, created_at, tier')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (data && data.length > 0) {
        const formattedData = data.map(d => ({ ...d, action_type: 'mint' }));
        setEventQueue([...formattedData, ...MOCK_EVENTS]);
      }
    };
    fetchInitial();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 3. O "Toast Engine": Pega um evento da fila, mostra por 4s, esconde por 3s.
  useEffect(() => {
    let isShowing = false;
    
    const showNextEvent = () => {
      if (eventQueue.length === 0) return;
      
      // Escolhe um evento aleatório da fila (dando preferência aos primeiros/mais novos)
      // Math.random() ao quadrado enviesa para os índices menores (0, 1, 2...)
      const index = Math.floor(Math.pow(Math.random(), 2) * eventQueue.length);
      const nextEvent = eventQueue[index];
      
      setCurrentEvent(nextEvent);
      isShowing = true;

      // Mantém na tela por 4 segundos
      setTimeout(() => {
        setCurrentEvent(null);
        isShowing = false;
      }, 4500);
    };

    // Inicia o ciclo a cada 8 segundos (4.5s mostrando + 3.5s escondido)
    const interval = setInterval(() => {
      if (!isShowing) {
        showNextEvent();
      }
    }, 8000);

    // Mostra o primeiro logo de cara, com um pequeno delay
    const initialTimeout = setTimeout(showNextEvent, 2000);

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimeout);
    };
  }, [eventQueue]);

  if (!currentEvent || !isPastThreshold) return null;

  // Renderiza o conteúdo baseado no tipo de evento
  const renderIcon = () => {
    switch (currentEvent.action_type) {
      case 'sale': return <Crown className="w-5 h-5 text-orange-400" />;
      case 'overwrite': return <Swords className="w-5 h-5 text-green-400" />;
      case 'new_spot': return <Globe2 className="w-5 h-5 text-cyan-400" />;
      default: return <Sparkles className="w-5 h-5 text-purple-400" />;
    }
  };

  const timeAgoString = currentEvent.created_at 
    ? "agora mesmo" 
    : `${Math.floor(Math.random() * 5) + 1} min atrás`; // mock de tempo se não tiver created_at

  return (
    <div className="fixed bottom-6 left-6 z-[200] pointer-events-none">
      <AnimatePresence>
        <motion.div
          key={currentEvent.id}
          initial={{ opacity: 0, y: 50, scale: 0.9, rotateX: -20 }}
          animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="bg-black/60 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] w-80 relative overflow-hidden"
        >
          {/* Shine effect */}
          <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 animate-[shimmer_3s_infinite]" />
          
          <div className="flex gap-4 items-start relative z-10">
            <div className="mt-1 p-2 bg-white/5 rounded-xl border border-white/10 shadow-inner">
              {renderIcon()}
            </div>
            
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                  {currentEvent.action_type === 'mint' ? 'Novo Grafite Mintado' : 'Movimento no Mercado'}
                </span>
                <span className="text-[10px] text-gray-500 font-mono">{timeAgoString}</span>
              </div>
              
              <p className="text-sm text-gray-300 leading-snug">
                <span className="font-bold text-white">
                  {currentEvent.artist_address ? formatAddress(currentEvent.artist_address) : 'Anon'}
                </span>{' '}
                {currentEvent.action_type === 'overwrite' ? 'dominou' : 'conquistou'} o espaço em{' '}
                <span className="text-white font-medium">{currentEvent.address || 'Localização Desconhecida'}</span>
              </p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
