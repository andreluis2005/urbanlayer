/// <reference types="@types/google.maps" />
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, ArrowRight, Loader2, Sparkles, Search, Ban, Map as MapIcon, AlertTriangle, RefreshCcw, Crosshair } from 'lucide-react';
import { getStreetViewUrl, checkExistingGraffiti, checkStreetViewCoverage } from '../AIService';


interface StreetExplorerProps {
  location: { lat: number; lng: number; name: string };
  onSelectSpot: (wallImage: string, exactLat: number, exactLng: number, heading: number, pitch: number) => void;
  onBack: () => void;
}

const StreetExplorer: React.FC<StreetExplorerProps> = ({ location, onSelectSpot, onBack }) => {
  const [isSearching, setIsSearching] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoWall, setDemoWall] = useState<string | null>(null);
  
  // Interactive Panorama State
  const mapRef = useRef<HTMLDivElement>(null);
  const panoramaRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const [currentHeading, setCurrentHeading] = useState(0);
  const [currentPitch, setCurrentPitch] = useState(0);
  const [currentLat, setCurrentLat] = useState(location.lat);
  const [currentLng, setCurrentLng] = useState(location.lng);

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

      // 3. Carregar Google Maps JS API interativo (Injeção Nativa à prova de cache)
      const loadMapsApi = () => {
        return new Promise<void>((resolve, reject) => {
          // Se já carregou via HMR
          if (window.google && window.google.maps && window.google.maps.StreetViewPanorama) {
            resolve();
            return;
          }
          
          const scriptId = 'google-maps-script';
          let script = document.getElementById(scriptId) as HTMLScriptElement;
          
          if (script) {
            script.addEventListener('load', () => resolve());
            script.addEventListener('error', (e) => reject(e));
            return;
          }

          script = document.createElement('script');
          script.id = scriptId;
          script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&loading=async`;
          script.async = true;
          script.defer = true;
          script.onload = () => resolve();
          script.onerror = (e) => reject(e);
          document.head.appendChild(script);
        });
      };

      await loadMapsApi();
      const StreetViewPanorama = window.google.maps.StreetViewPanorama;

      if (mapRef.current) {
        const panorama = new StreetViewPanorama(mapRef.current, {
          position: { lat: location.lat, lng: location.lng },
          pov: { heading: 0, pitch: 0 },
          zoom: 1,
          showRoadLabels: false,
          disableDefaultUI: true, // Clean interface
          clickToGo: true,
          panControl: true,
          linksControl: true, // Allow walking
          enableCloseButton: false,
        });

        panoramaRef.current = panorama;

        // Listener: Update position when walking
        panorama.addListener("position_changed", () => {
          const pos = panorama.getPosition();
          if (pos) {
            setCurrentLat(pos.lat());
            setCurrentLng(pos.lng());
          }
        });

        // Listener: Update POV when looking around
        panorama.addListener("pov_changed", () => {
          const pov = panorama.getPov();
          setCurrentHeading(pov.heading);
          setCurrentPitch(pov.pitch);
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

  const handleSprayHere = () => {
    if (isDemoMode && demoWall) {
      onSelectSpot(demoWall, currentLat, currentLng, 0, 0);
    } else {
      // Capturar o quadro estático *exato* de onde a câmera está olhando agora
      const wallUrl = getStreetViewUrl(currentLat, currentLng, currentHeading, currentPitch);
      onSelectSpot(wallUrl, currentLat, currentLng, currentHeading, currentPitch);
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
