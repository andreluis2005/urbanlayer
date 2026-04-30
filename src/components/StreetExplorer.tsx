/// <reference types="@types/google.maps" />
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, ArrowRight, Loader2, Sparkles, Search, Ban, Map as MapIcon, AlertTriangle, RefreshCcw, Crosshair, ChevronLeft, ChevronRight, X, Eye } from 'lucide-react';
import { getStreetViewUrl, checkExistingGraffiti, checkStreetViewCoverage } from '../AIService';
import { supabase } from '../lib/supabase';
import { formatAddress } from '../services/Web3Service';
import type { Graffiti } from './GlobalGallery';
import GraffitiOverlay from './GraffitiOverlay';


interface StreetExplorerProps {
  location: { lat: number; lng: number; name: string };
  onSelectSpot: (wallImage: string, exactLat: number, exactLng: number, heading: number, pitch: number, panoId?: string) => void;
  onBack: () => void;
  discoveredGraffiti?: Graffiti | null;
}

const StreetExplorer: React.FC<StreetExplorerProps> = ({ location, onSelectSpot, onBack, discoveredGraffiti }) => {
  const [isSearching, setIsSearching] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoWall, setDemoWall] = useState<string | null>(null);

  // Radar AR State
  const [nearbyArts, setNearbyArts] = useState<Graffiti[]>([]);
  const [activeArtIndex, setActiveArtIndex] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [hudVisible, setHudVisible] = useState(true);
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Interactive Panorama State
  const mapRef = useRef<HTMLDivElement>(null);
  const panoramaRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const [currentHeading, setCurrentHeading] = useState(0);
  const [currentPitch, setCurrentPitch] = useState(0);
  const [currentLat, setCurrentLat] = useState(location.lat);
  const [currentLng, setCurrentLng] = useState(location.lng);
  const [streetViewZoom, setStreetViewZoom] = useState(1);
  const [currentPanoId, setCurrentPanoId] = useState<string | undefined>(undefined);

  const initInteractiveStreetView = async (forceReal = false) => {
    setIsSearching(true);
    setIsDemoMode(false);
    setDemoWall(null);
    
    try {
      // 1. Verificar se já existe grafite neste local (Ainda podemos sugerir, mas por ora vamos direto para a rua)
      // Omitindo checkExistingGraffiti para focar na experiência de caminhar

      // 2. Verificar cobertura do Street View (Metadata API)
      const hasCoverage = forceReal ? true : await checkStreetViewCoverage(location.lat, location.lng);
      
      if (!hasCoverage && !forceReal) {
        throw new Error("No Coverage");
      }

      // 3. Carregar Google Maps JS API de forma moderna e resiliente
      const loadMapsApi = () => {
        return new Promise<void>((resolve, reject) => {
          // Se já carregou via HMR ou navegação anterior
          if (window.google && window.google.maps) {
            resolve();
            return;
          }
          
          const scriptId = 'google-maps-script';
          if (document.getElementById(scriptId)) {
            // Script já está no head, aguardar carregar se necessário
            const existingScript = document.getElementById(scriptId) as HTMLScriptElement;
            if (window.google && window.google.maps) {
              resolve();
            } else {
              existingScript.addEventListener('load', () => resolve());
              existingScript.addEventListener('error', (e) => reject(e));
            }
            return;
          }

          const script = document.createElement('script');
          script.id = scriptId;
          // Padrão moderno: Injeta o global mas usamos importLibrary para os módulos
          script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&v=beta`; 
          script.async = true;
          script.defer = true;
          script.onload = () => resolve();
          script.onerror = (e) => reject(e);
          document.head.appendChild(script);
        });
      };

      await loadMapsApi();
      
      // Novo padrão Google Maps: importar bibliotecas sob demanda
      // Isso evita o erro "is not a constructor" em produção
      const { StreetViewPanorama } = await google.maps.importLibrary("streetView") as google.maps.StreetViewLibrary;

      if (mapRef.current) {
        // Limpeza de segurança: evitar duplicidade de elementos no DOM do React
        mapRef.current.innerHTML = '';
        
        const panorama = new StreetViewPanorama(mapRef.current, {
          position: { lat: location.lat, lng: location.lng },
          pov: { heading: 0, pitch: 0 },
          zoom: 1,
          showRoadLabels: false,
          disableDefaultUI: true,
          clickToGo: true,
          panControl: true,
          linksControl: true,
          enableCloseButton: false,
        });

        panoramaRef.current = panorama;

        // Listener: Atualizar posição ao caminhar
        panorama.addListener("position_changed", () => {
          const pos = panorama.getPosition();
          if (pos) {
            setCurrentLat(pos.lat());
            setCurrentLng(pos.lng());
          }
        });

        // Listener: Atualizar POV ao olhar em volta
        panorama.addListener("pov_changed", () => {
          const pov = panorama.getPov();
          setCurrentHeading(pov.heading);
          setCurrentPitch(pov.pitch);
        });

        // Listener: Capturar zoom
        panorama.addListener("zoom_changed", () => {
          setStreetViewZoom(panorama.getZoom() || 1);
        });

        // Listener: Capturar pano_id
        panorama.addListener("pano_changed", () => {
          const panoId = panorama.getPano();
          if (panoId) setCurrentPanoId(panoId);
        });
      }

    } catch (error) {
      console.error("Erro ao buscar local real:", error);
      // FALLBACK: Muro de tijolos industrial real para teste se a API falhar
      console.log("ℹ️ Fallback Ativado: Usando Muro Industrial de Tijolos.");
      setIsDemoMode(true);
      setDemoWall("https://images.unsplash.com/photo-1555580168-a9decaf4244a?auto=format&fit=crop&q=80&w=1200");
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    initInteractiveStreetView();
  }, [location]);

  // --- RADAR AR: Escaneamento Automático ---
  const scanNearby = useCallback(async (lat: number, lng: number) => {
    console.log(`🔍 Radar AR: Escaneando lat=${lat.toFixed(6)}, lng=${lng.toFixed(6)}...`);
    setIsScanning(true);
    try {
      const { data, error } = await supabase.rpc('find_nearby_graffitis', {
        center_lat: lat,
        center_lng: lng,
        radius_m: 200
      });

      if (error) {
        console.error('❌ Radar AR RPC error:', error);
        throw error;
      }
      console.log(`🎯 Radar AR: Encontrados ${data?.length || 0} grafites próximos`, data);
      if (data && data.length > 0) {
        setNearbyArts(data as Graffiti[]);
        setActiveArtIndex(0);
        setHudVisible(true);
      } else {
        setNearbyArts([]);
      }
    } catch (err) {
      console.error('❌ Radar AR scan error:', err);
    } finally {
      setIsScanning(false);
    }
  }, []);

  // Se veio da Galeria com arte pré-selecionada, exibir direto
  useEffect(() => {
    if (discoveredGraffiti) {
      setNearbyArts([discoveredGraffiti]);
      setActiveArtIndex(0);
      setHudVisible(true);
    } else {
      // Scan automático ao carregar pela primeira vez (via Globo/Busca)
      scanNearby(location.lat, location.lng);
    }
  }, [discoveredGraffiti, location.lat, location.lng, scanNearby]);

  // Debounce: Escanear quando o usuário para de andar (1.5s)
  useEffect(() => {
    if (discoveredGraffiti) return; // Não re-escanear se veio da galeria

    if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    scanTimerRef.current = setTimeout(() => {
      scanNearby(currentLat, currentLng);
    }, 1500);

    return () => {
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    };
  }, [currentLat, currentLng, discoveredGraffiti, scanNearby]);

  const activeArt = nearbyArts[activeArtIndex] || null;

  // --- Geo-Projeção: Calcular posição real do grafite na tela ---

  // Distância em metros (Haversine)
  const getDistanceMeters = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // Bearing (ângulo geográfico) do usuário até o grafite (0°=Norte, 90°=Leste...)
  const getBearing = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    const y = Math.sin(dLng) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  };

  const artDistance = activeArt ? getDistanceMeters(currentLat, currentLng, activeArt.lat, activeArt.lng) : 999;
  const MAX_VISIBLE_DISTANCE = 50;
  const isArtVisible = artDistance <= MAX_VISIBLE_DISTANCE;

  // Calcular posição horizontal na tela baseado no FOV da câmera
  const FOV = 90; // Campo de visão do Street View em graus
  const halfFov = FOV / 2;

  let artScreenX = 50; // centro (%)
  let artScreenY = 50; // centro (%)
  let isInFieldOfView = false;

  if (activeArt && isArtVisible) {
    if (artDistance < 10) {
      // Muito perto → bearing é impreciso, mostrar no centro da tela
      isInFieldOfView = true;
      artScreenX = 50;
      artScreenY = 50;
    } else {
      // Longe o suficiente → usar bearing para projetar na tela
      const bearing = getBearing(currentLat, currentLng, activeArt.lat, activeArt.lng);
      let deltaHeading = bearing - currentHeading;
      if (deltaHeading > 180) deltaHeading -= 360;
      if (deltaHeading < -180) deltaHeading += 360;

      isInFieldOfView = Math.abs(deltaHeading) < halfFov;

      artScreenX = 50 + (deltaHeading / halfFov) * 50;
      artScreenX = Math.max(-20, Math.min(120, artScreenX));

      artScreenY = 50 - (currentPitch / halfFov) * 30;
      artScreenY = Math.max(10, Math.min(90, artScreenY));
    }
  }

  // Escala baseada na distância
  const artScale = isArtVisible ? Math.max(0.2, 1 - (artDistance / MAX_VISIBLE_DISTANCE) * 0.8) : 0;
  const artOpacity = isArtVisible ? Math.max(0.1, 0.95 - (artDistance / MAX_VISIBLE_DISTANCE) * 0.85) : 0;

  const handleSprayHere = () => {
    if (isDemoMode && demoWall) {
      onSelectSpot(demoWall, currentLat, currentLng, 0, 0, undefined);
    } else {
      // Capturar o quadro estático *exato* de onde a câmera está olhando agora
      const wallUrl = getStreetViewUrl(currentLat, currentLng, currentHeading, currentPitch);
      onSelectSpot(wallUrl, currentLat, currentLng, currentHeading, currentPitch, currentPanoId);
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-black flex flex-col">
      {/* Header */}
      <div className="p-8 flex items-center justify-between border-b border-white/10 bg-black/50 backdrop-blur-xl absolute top-0 left-0 right-0 z-50">
        <div className="flex items-center gap-6">
          <button 
            onClick={onBack}
            className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 hover:text-white transition-colors bg-black/50 px-4 py-2 rounded-full"
          >
            ← Back to Globe
          </button>
          <div className="h-4 w-[1px] bg-white/10" />
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-neon-orange drop-shadow-lg" />
            <h2 className="text-2xl font-bold tracking-tight uppercase truncate max-w-md drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{location.name}</h2>
          </div>
        </div>
        
        {isDemoMode && (
           <button 
             onClick={() => initInteractiveStreetView(true)}
             className="flex items-center gap-2 px-6 py-3 bg-neon-orange text-black rounded-lg text-xs font-bold uppercase tracking-tighter hover:scale-105 transition-all shadow-[0_0_15px_rgba(255,99,33,0.5)]"
           >
             <RefreshCcw className="w-3 h-3" />
             Force Real Map
           </button>
        )}
      </div>

      {/* Main Interactive Editor */}
      <div className="flex-1 relative bg-black w-full h-full">
        {isSearching && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-40">
            <Loader2 className="w-12 h-12 text-neon-orange animate-spin mb-6" />
            <p className="graffiti-text text-3xl tracking-[0.2em] animate-pulse">Dropping into the streets...</p>
          </div>
        )}

        {isDemoMode && demoWall ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <img src={demoWall} alt="Fallback Wall" className="w-full h-full object-cover" />
            <div className="absolute top-32 left-8 right-8 max-w-2xl bg-black/60 backdrop-blur-md p-6 border border-neon-orange/20 rounded-2xl flex flex-col gap-4 text-neon-orange">
              <div className="flex items-center gap-4">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <h4 className="font-bold uppercase tracking-widest text-sm">Interactive Street View Unavailable</h4>
              </div>
              <p className="text-sm opacity-90 leading-relaxed text-white">
                Google says this area has no 3D street coverage, or your API key lacks permissions. 
                You are currently facing a concrete test facade.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Google Street View Container */}
            <div ref={mapRef} className="absolute inset-0 w-full h-full" />

            {/* Spatial Graffiti Overlays */}
            <GraffitiOverlay
              graffitis={nearbyArts}
              currentHeading={currentHeading}
              currentPitch={currentPitch}
              currentLat={currentLat}
              currentLng={currentLng}
              streetViewZoom={streetViewZoom}
              currentPanoId={currentPanoId}
            />
            
            {/* Crosshair Overlay to aim Graffiti */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-10">
              <div className="relative flex items-center justify-center">
                <Crosshair className="w-16 h-16 text-neon-orange/80 mix-blend-difference" strokeWidth={1} />
                <div className="absolute w-[300px] h-[200px] border border-dashed border-white/30 rounded-lg flex items-center justify-center">
                   <span className="text-white/30 font-mono text-[10px] uppercase tracking-widest bg-black/20 px-2 py-1 absolute -top-3">Spray Area</span>
                </div>
              </div>
            </div>
            
            {/* HUD Instructions */}
            <div className="absolute bottom-32 left-1/2 -translate-x-1/2 pointer-events-none z-10 text-center bg-black/40 backdrop-blur-md px-6 py-3 rounded-full border border-white/10">
               <p className="text-white font-mono text-xs uppercase tracking-[0.2em]">
                 Use Arrows to Walk. Drag to Look Around. Aim the crosshair at a wall.
               </p>
            </div>
          </>
        )}
      </div>

      {/* ====== HUD AR: Camada Transparente de Grafite ====== */}
      <AnimatePresence>
        {activeArt && hudVisible && !isSearching && (
          <>
            {/* MODO AR: Grafite fixo na coordenada real */}
            {activeArt.graffiti_url && isArtVisible && isInFieldOfView ? (
              <motion.div
                key={`ar-${activeArt.id}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: artOpacity }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 z-40 pointer-events-none overflow-hidden"
              >
                {/* O Grafite — posicionado com base no bearing real */}
                <img
                  src={activeArt.graffiti_url}
                  alt={activeArt.title || 'Graffiti AR'}
                  className="absolute object-contain drop-shadow-[0_0_40px_rgba(255,99,33,0.5)]"
                  style={{
                    left: `${artScreenX}%`,
                    top: `${artScreenY}%`,
                    transform: `translate(-50%, -50%) scale(${artScale})`,
                    maxWidth: '50%',
                    maxHeight: '45%',
                    mixBlendMode: 'screen',
                    transition: 'left 0.08s linear, top 0.08s linear, transform 0.2s ease-out',
                  }}
                />

                {/* Badge "AR Layer" + distância */}
                <div className="absolute top-28 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-neon-green/30 pointer-events-auto">
                  <Eye className="w-3.5 h-3.5 text-neon-green animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-neon-green">AR Layer</span>
                  <span className="text-[10px] text-gray-400 font-mono">{Math.round(artDistance)}m</span>
                  {nearbyArts.length > 1 && (
                    <span className="text-[10px] text-gray-500 font-mono ml-1">
                      {activeArtIndex + 1}/{nearbyArts.length}
                    </span>
                  )}
                </div>

                {/* Info Bar na parte inferior */}
                <div className="absolute bottom-32 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/50 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 pointer-events-auto">
                  <div className="text-left">
                    <p className="text-xs font-bold text-white truncate max-w-[200px]">
                      {activeArt.title || 'Untitled Masterpiece'}
                    </p>
                    <p className="text-[10px] text-gray-400 font-mono">
                      <span className="text-neon-orange">BY</span> {activeArt.artist_address ? formatAddress(activeArt.artist_address) : 'Anon'}
                    </p>
                  </div>
                  {nearbyArts.length > 1 && (
                    <>
                      <button
                        onClick={() => setActiveArtIndex(i => (i - 1 + nearbyArts.length) % nearbyArts.length)}
                        className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setActiveArtIndex(i => (i + 1) % nearbyArts.length)}
                        className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setHudVisible(false)}
                    className="p-2 bg-white/10 rounded-full hover:bg-red-500/20 transition-colors ml-2"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </motion.div>
            ) : activeArt.graffiti_url && (!isArtVisible || !isInFieldOfView) ? (
              /* Indicador quando o grafite existe mas está fora do campo de visão ou longe */
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute top-28 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-yellow-500/30"
              >
                <MapPin className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-400">
                  {!isArtVisible ? `Art nearby — ${Math.round(artDistance)}m away` : 'Look around ↔ to find art'}
                </span>
                {nearbyArts.length > 1 && (
                  <>
                    <button
                      onClick={() => setActiveArtIndex(i => (i - 1 + nearbyArts.length) % nearbyArts.length)}
                      className="p-1 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setActiveArtIndex(i => (i + 1) % nearbyArts.length)}
                      className="p-1 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => setHudVisible(false)}
                  className="p-1 bg-white/10 rounded-full hover:bg-red-500/20 transition-colors ml-1"
                >
                  <X className="w-3 h-3 text-gray-400" />
                </button>
              </motion.div>
            ) : (
              /* FALLBACK: Painel lateral para grafites antigos (sem graffiti_url) */
              <motion.div
                initial={{ opacity: 0, x: 300 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 300 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="absolute top-28 right-6 z-50 w-[340px] max-h-[calc(100vh-200px)] bg-black/40 backdrop-blur-xl border border-white/15 rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(255,99,33,0.15)]"
              >
                {/* HUD Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-neon-green animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-neon-green">Art Detected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {nearbyArts.length > 1 && (
                      <span className="text-[10px] text-gray-500 font-mono">
                        {activeArtIndex + 1} / {nearbyArts.length}
                      </span>
                    )}
                    <button
                      onClick={() => setHudVisible(false)}
                      className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                    >
                      <X className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  </div>
                </div>

                {/* Art Image */}
                <div className="relative">
                  <img
                    src={activeArt.image_url}
                    alt={activeArt.title || 'Graffiti'}
                    className="w-full aspect-[4/3] object-cover"
                  />
                  {nearbyArts.length > 1 && (
                    <>
                      <button
                        onClick={() => setActiveArtIndex(i => (i - 1 + nearbyArts.length) % nearbyArts.length)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/60 backdrop-blur-sm rounded-full hover:bg-black/80 transition-colors border border-white/10"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setActiveArtIndex(i => (i + 1) % nearbyArts.length)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/60 backdrop-blur-sm rounded-full hover:bg-black/80 transition-colors border border-white/10"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>

                {/* Art Info */}
                <div className="p-4 space-y-2">
                  <h4 className="font-bold text-white text-sm truncate">
                    {activeArt.title || 'Untitled Masterpiece'}
                  </h4>
                  <p className="text-[11px] text-gray-400 flex items-center gap-1.5 font-mono">
                    <span className="text-neon-orange font-bold">BY</span>
                    {activeArt.artist_address ? formatAddress(activeArt.artist_address) : 'Anon'}
                  </p>
                  <p className="text-[10px] text-gray-500 flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 text-neon-blue shrink-0" />
                    {activeArt.address || 'Unknown'}
                  </p>
                  <p className="text-[9px] text-gray-600 font-mono">
                    {new Date(activeArt.created_at).toLocaleDateString()}
                  </p>
                </div>
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>

      {/* HUD Minimized — Botão para reabrir */}
      {activeArt && !hudVisible && !isSearching && (
        <button
          onClick={() => setHudVisible(true)}
          className="absolute top-28 right-6 z-50 p-3 bg-neon-orange/20 backdrop-blur-md border border-neon-orange/30 rounded-full hover:bg-neon-orange/30 transition-colors animate-pulse"
        >
          <Eye className="w-5 h-5 text-neon-orange" />
        </button>
      )}

      {/* Footer Action */}
      {!isSearching && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black via-black/80 to-transparent flex items-center justify-center z-50 pointer-events-none"
        >
          <button
            onClick={handleSprayHere}
            className="pointer-events-auto px-16 py-6 bg-neon-orange text-black rounded-full font-bold text-xl uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all flex items-center gap-4 shadow-[0_0_60px_rgba(255,99,33,0.4)]"
          >
            <Sparkles className="w-6 h-6" />
            Target Surface
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default StreetExplorer;
