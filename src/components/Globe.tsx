import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Loader2, Globe as GlobeIcon } from 'lucide-react';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

interface GlobeProps {
  onSelectLocation: (lat: number, lng: number, name: string) => void;
}

const Globe: React.FC<GlobeProps> = ({ onSelectLocation }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isRotating, setIsRotating] = useState(true);
  
  // Transition States
  const [transitionText, setTransitionText] = useState('');
  const isFlying = useRef(false);

  const stepZoom = useCallback((lat: number, lng: number, message: string, targetZoom: number, triggerExplorer: boolean, fullLocationName: string) => {
    const map = mapRef.current;
    if (!map) return;
    
    setIsRotating(false);
    isFlying.current = true;
    setTransitionText(message);

    map.flyTo({
      center: [lng, lat],
      zoom: targetZoom, 
      pitch: triggerExplorer ? 60 : (targetZoom > 10 ? 45 : 0),
      bearing: triggerExplorer ? Math.random() * 90 - 45 : 0,
      speed: 1.2, 
      curve: 1.2,
      essential: true
    });
    
    const onMoveEnd = () => {
      map.off('moveend', onMoveEnd);
      isFlying.current = false;
      
      if (triggerExplorer) {
        setTimeout(() => {
          onSelectLocation(lat, lng, fullLocationName);
        }, 800);
      } else {
         setTransitionText(""); // Apaga o overlay após aterrarem e deixa explorar
      }
    };
    map.once('moveend', onMoveEnd);
  }, [onSelectLocation]);
  
  useEffect(() => {
    if (!mapContainer.current) return;
    if (mapRef.current) return; // Previne múltiplas inicializações no Strict Mode
    
    mapboxgl.accessToken = MAPBOX_TOKEN;
    
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-46.6333, -23.5505], // Start at some point
      zoom: 1.5,
      pitch: 0,
      projection: 'globe', // This is what gives us the 3D globe!
      interactive: true,
    });
    
    mapRef.current = map;
    
    map.on('style.load', () => {
      // Add atmosphere and stars for a true "out in space" effect
      map.setFog({
        color: 'rgb(24, 24, 27)', // Lower atmosphere
        'high-color': 'rgb(10, 10, 10)', // Upper atmosphere
        'horizon-blend': 0.1, // Atmosphere thickness
        'space-color': 'rgb(0, 0, 0)', // Background color
        'star-intensity': 0.5 // Background star brightness
      });
    });

    // Rotation logic
    let animationId: number;
    const spinGlobe = () => {
      // Se o componente foi desmontado ou não está rotacionando, para a animação imediatamente
      if (!isRotating || !mapRef.current) return;
      
      try {
        const currentCenter = map.getCenter();
        currentCenter.lng -= 0.1; // Single degree per frame approx
        if (currentCenter.lng < -180) currentCenter.lng += 360;
        
        map.easeTo({ center: currentCenter, duration: 20, easing: (n) => n });
        animationId = requestAnimationFrame(spinGlobe);
      } catch (e) {
        // Ignora erros se o mapa for removido durante a animação
      }
    };
    
    // Enable rotation when map is idle a bit, start with spinning
    map.on('load', () => {
      spinGlobe();
    });
    
    const stopSpinning = () => {
      setIsRotating(false);
      if (animationId) cancelAnimationFrame(animationId);
    };

    map.on('mousedown', stopSpinning);
    map.on('dragstart', stopSpinning);
    map.on('touchstart', stopSpinning);
    
    // Allow clicking map directly to zoom to that country/location
    map.on('click', async (e) => {
      if (isFlying.current) return; // Previne clique durante voo
      stopSpinning();
      
      const { lat, lng } = e.lngLat;
      const currentZ = map.getZoom();
      
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`);
        const data = await response.json();
        
        let targetName = "Lugar Desconhecido";
        let nextZoom = 18;
        let actionMsg = "Aterrissando...";
        let willInvokeExplorer = false;

        const addr = data?.address || {};

        if (currentZ < 4) {
             nextZoom = 5;
             targetName = addr.country || data?.display_name || "País";
             actionMsg = `Mapeando ${targetName}...`;
        } else if (currentZ < 8) {
             nextZoom = 9;
             targetName = addr.state || addr.county || "Estado";
             actionMsg = `Sobrevoando ${targetName}...`;
        } else if (currentZ < 12) {
             nextZoom = 13;
             targetName = addr.city || addr.town || addr.municipality || "Cidade";
             actionMsg = `Aproximando de ${targetName}...`;
        } else if (currentZ < 15) {
             nextZoom = 16;
             targetName = addr.suburb || addr.neighbourhood || addr.village || "Bairro";
             actionMsg = `Analisando ${targetName}...`;
        } else {
             nextZoom = 18;
             targetName = addr.road || addr.pedestrian || "Rua";
             actionMsg = `Aterrissando em ${targetName}...`;
             willInvokeExplorer = true; // The final step!
        }
        
        stepZoom(lat, lng, actionMsg, nextZoom, willInvokeExplorer, data?.display_name || targetName);
      } catch (err) {
        console.error(err);
        stepZoom(lat, lng, "Mapeando Local...", 18, true, "Localização Selecionada");
      }
    });

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {}
        mapRef.current = null;
      }
    };
  }, [stepZoom, isRotating]);
  
  // Re-start or stop spinning when state changes manually
  useEffect(() => {
    let animationId: number;
    const map = mapRef.current;
    if (!map) return;
    
    const spinGlobe = () => {
      if (!isRotating || !mapRef.current) return;
      try {
        const currentCenter = map.getCenter();
        currentCenter.lng -= 0.1; 
        if (currentCenter.lng < -180) currentCenter.lng += 360;
        map.easeTo({ center: currentCenter, duration: 20, easing: (n) => n });
        animationId = requestAnimationFrame(spinGlobe);
      } catch (e) {}
    };
    
    if (isRotating) {
      spinGlobe();
    } else {
      if (animationId) cancelAnimationFrame(animationId);
    }
    
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [isRotating]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lon);
        // O search leva direto para o Street!
        stepZoom(latitude, longitude, `Aterrissando no Destino...`, 18, true, display_name);
      }
    } catch (error) {
      console.error('Error searching location:', error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      <div 
        ref={mapContainer} 
        className={`absolute inset-0 w-full h-full ${transitionText === '' ? 'cursor-crosshair' : 'cursor-wait'} pointer-events-auto`} 
      />
      {/* Overlays to make it blend with the dark background */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.9)]" />
      
      {/* UI Elements */}
      <AnimatePresence>
        {transitionText === '' && (
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="absolute top-10 left-10 z-10 space-y-6 pointer-events-auto"
          >
            <div>
              <h1 className="text-6xl font-bold graffiti-text text-neon-orange tracking-tighter drop-shadow-md">
                UrbanLayer
              </h1>
              <p className="text-gray-500 mt-2 max-w-xs font-mono text-xs uppercase tracking-widest bg-black/40 p-2 rounded-lg backdrop-blur-md">
                Desça em camadas: País → Estado → Cidade → Rua
              </p>
            </div>

            <form onSubmit={handleSearch} className="relative w-80 group">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ir direto a um endereço..."
                className="w-full bg-white/10 border border-white/20 rounded-full px-6 py-4 pl-12 text-sm focus:outline-none focus:border-neon-orange focus:bg-white/20 transition-all backdrop-blur-md text-white shadow-xl"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-neon-orange transition-colors" />
              {isSearching && (
                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neon-orange animate-spin" />
              )}
            </form>
            
            <div className="flex gap-4 pt-4">
              <button 
                onClick={() => setIsRotating(!isRotating)}
                type="button"
                className="px-4 py-2 border border-white/20 rounded-full text-[10px] uppercase tracking-widest hover:bg-white hover:text-black transition-colors backdrop-blur-md text-white/70"
              >
                {isRotating ? 'Stop Rotation' : 'Start Rotation'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cinematic Transition Overlay */}
      <AnimatePresence>
        {transitionText !== '' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-50 bg-black/60 backdrop-blur-[4px]"
          >
            <div className="relative">
              <motion.div 
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -inset-20 bg-neon-orange/20 blur-[100px] rounded-full"
              />
              <div className="flex flex-col items-center gap-8">
                <GlobeIcon className="w-16 h-16 text-neon-orange animate-pulse" />
                <div className="flex flex-col items-center gap-2">
                  <motion.h3 
                    key={transitionText}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    className="graffiti-text text-4xl text-white tracking-[0.2em] text-center drop-shadow-[0_0_15px_rgba(0,0,0,1)]"
                  >
                    {transitionText}
                  </motion.h3>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Globe;
