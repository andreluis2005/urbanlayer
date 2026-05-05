import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Loader2, Globe as GlobeIcon } from 'lucide-react';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

interface GlobeProps {
  onSelectLocation: (lat: number, lng: number, name: string, graffitiId?: string) => void;
}

/**
 * Converte dados de grafites do Supabase para GeoJSON FeatureCollection.
 */
function toGeoJSON(items: any[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: items.map(item => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [item.lng, item.lat],
      },
      properties: {
        id: item.id,
        title: item.title || 'Untitled',
        tier: item.tier || 'bronze',
        image_url: item.image_url || '',
        address: item.address || '',
      },
    })),
  };
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
  const realtimeChannelRef = useRef<any>(null);
  const isRotatingRef = useRef(isRotating);
  isRotatingRef.current = isRotating;

  const stepZoom = useCallback((lat: number, lng: number, message: string, targetZoom: number, triggerExplorer: boolean, fullLocationName: string, graffitiId?: string) => {
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
          onSelectLocation(lat, lng, fullLocationName, graffitiId);
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
      center: [-46.6333, -23.5505],
      zoom: 1.5,
      pitch: 0,
      projection: 'globe',
      interactive: true,
    });
    
    mapRef.current = map;
    
    map.on('style.load', () => {
      // Add atmosphere and stars for a true "out in space" effect
      map.setFog({
        color: 'rgb(24, 24, 27)',
        'high-color': 'rgb(10, 10, 10)',
        'horizon-blend': 0.1,
        'space-color': 'rgb(0, 0, 0)',
        'star-intensity': 0.5
      });
    });

    // Rotation logic
    let animationId: number;
    const spinGlobe = () => {
      if (!isRotatingRef.current || !mapRef.current) return;
      
      try {
        const currentCenter = map.getCenter();
        currentCenter.lng -= 0.1;
        if (currentCenter.lng < -180) currentCenter.lng += 360;
        
        map.easeTo({ center: currentCenter, duration: 20, easing: (n) => n });
        animationId = requestAnimationFrame(spinGlobe);
      } catch (e) {
        // Ignora erros se o mapa for removido durante a animação
      }
    };
    
    const stopSpinning = () => {
      setIsRotating(false);
      if (animationId) cancelAnimationFrame(animationId);
    };

    map.on('load', () => {
      spinGlobe();
      console.log('🗺️ Globe: Map loaded, setting up GeoJSON clusters...');

      // === GRAFFITI CLUSTERS (GeoJSON Source nativo do Mapbox) ===
      const loadGraffitiClusters = async () => {
        try {
          const { data, error } = await supabase
            .from('graffitis')
            .select('id, lat, lng, title, tier, image_url, address');
          if (error) { console.error('🗺️ Globe: Fetch error:', error); return; }
          if (!data || data.length === 0) { console.log('🗺️ Globe: Nenhum grafite encontrado'); return; }

          console.log(`🗺️ Globe: ${data.length} grafites encontrados, criando clusters...`);

          const geojson = toGeoJSON(data);

          // Se source já existe, atualiza os dados
          if (map.getSource('graffitis')) {
            (map.getSource('graffitis') as mapboxgl.GeoJSONSource).setData(geojson);
            return;
          }

          // Adicionar source com clustering nativo
          map.addSource('graffitis', {
            type: 'geojson',
            data: geojson,
            cluster: true,
            clusterMaxZoom: 14,
            clusterRadius: 50,
          });

          // --- Layer 1: Clusters (círculos com tamanho proporcional) ---
          map.addLayer({
            id: 'clusters',
            type: 'circle',
            source: 'graffitis',
            filter: ['has', 'point_count'],
            paint: {
              // Tamanho proporcional ao número de pontos
              'circle-radius': [
                'step',
                ['get', 'point_count'],
                18,   // base: até 10 pontos
                10, 24,  // 10-49 pontos
                50, 32,  // 50-99 pontos
                100, 42  // 100+ pontos
              ],
              // Gradiente de cor: azul → laranja → vermelho → roxo
              'circle-color': [
                'step',
                ['get', 'point_count'],
                '#FF6321',  // base: laranja (poucos)
                10, '#FF4500',  // médio: laranja intenso
                50, '#FF2200',  // muitos: vermelho
                100, '#A855F7'  // massivo: roxo legendary
              ],
              'circle-opacity': 0.85,
              'circle-stroke-width': 2,
              'circle-stroke-color': 'rgba(255, 255, 255, 0.6)',
              // Glow: sombra grande para efeito neon
              'circle-blur': 0.15,
            },
          });

          // --- Layer 2: Contador de grafites no cluster ---
          map.addLayer({
            id: 'cluster-count',
            type: 'symbol',
            source: 'graffitis',
            filter: ['has', 'point_count'],
            layout: {
              'text-field': ['get', 'point_count_abbreviated'],
              'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
              'text-size': 13,
              'text-allow-overlap': true,
            },
            paint: {
              'text-color': '#FFFFFF',
            },
          });

          // --- Layer 3: Pontos individuais (unclustered) ---
          map.addLayer({
            id: 'unclustered-point',
            type: 'circle',
            source: 'graffitis',
            filter: ['!', ['has', 'point_count']],
            paint: {
              // Cor baseada no tier
              'circle-color': [
                'match',
                ['get', 'tier'],
                'legendary', '#A855F7',
                'gold', '#EAB308',
                'silver', '#94A3B8',
                '#FF6321' // default: bronze/orange
              ],
              'circle-radius': 8,
              'circle-stroke-width': 3,
              'circle-stroke-color': '#FFFFFF',
              'circle-opacity': 0.95,
            },
          });

          // --- Interações ---

          // Click num cluster → expand (zoom ao nível de expansão)
          map.on('click', 'clusters', (e) => {
            const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
            if (!features.length) return;
            const clusterId = features[0].properties!.cluster_id;
            const source = map.getSource('graffitis') as mapboxgl.GeoJSONSource;

            source.getClusterExpansionZoom(clusterId, (err, zoom) => {
              if (err) return;
              const geom = features[0].geometry as GeoJSON.Point;
              stopSpinning();
              map.flyTo({
                center: geom.coordinates as [number, number],
                zoom: zoom!,
                speed: 1.5,
                essential: true,
              });
            });
          });

          // Click num ponto individual → navegar pro StreetExplorer
          map.on('click', 'unclustered-point', (e) => {
            if (!e.features || e.features.length === 0) return;
            const feature = e.features[0];
            const geom = feature.geometry as GeoJSON.Point;
            const props = feature.properties!;
            stopSpinning();
            stepZoom(
              geom.coordinates[1],
              geom.coordinates[0],
              `Aterrissando em ${props.title || 'Grafite'}...`,
              18,
              true,
              props.address || 'Street View',
              props.id
            );
          });

          // Hover: cursor pointer nos clusters e pontos
          map.on('mouseenter', 'clusters', () => {
            map.getCanvas().style.cursor = 'pointer';
          });
          map.on('mouseleave', 'clusters', () => {
            map.getCanvas().style.cursor = '';
          });
          map.on('mouseenter', 'unclustered-point', () => {
            map.getCanvas().style.cursor = 'pointer';
          });
          map.on('mouseleave', 'unclustered-point', () => {
            map.getCanvas().style.cursor = '';
          });

          // Tooltip: hover num cluster
          const popup = new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: false,
            className: 'graffiti-popup',
            maxWidth: '200px',
          });

          map.on('mouseenter', 'clusters', (e) => {
            if (!e.features || e.features.length === 0) return;
            const feature = e.features[0];
            const geom = feature.geometry as GeoJSON.Point;
            const count = feature.properties!.point_count;

            popup
              .setLngLat(geom.coordinates as [number, number])
              .setHTML(`
                <div style="background:#111;color:white;padding:8px 12px;border-radius:8px;font-size:12px;font-family:monospace;border:1px solid rgba(255,99,33,0.3);">
                  <strong style="color:#FF6321;">${count}</strong> grafites nesta região
                </div>
              `)
              .addTo(map);
          });

          map.on('mouseleave', 'clusters', () => {
            popup.remove();
          });

          // Tooltip: hover num ponto individual
          map.on('mouseenter', 'unclustered-point', (e) => {
            if (!e.features || e.features.length === 0) return;
            const feature = e.features[0];
            const geom = feature.geometry as GeoJSON.Point;
            const props = feature.properties!;

            const tierColors: Record<string, string> = {
              legendary: '#A855F7',
              gold: '#EAB308',
              silver: '#94A3B8',
              bronze: '#FF6321',
            };
            const tierColor = tierColors[props.tier] || tierColors.bronze;

            popup
              .setLngLat(geom.coordinates as [number, number])
              .setHTML(`
                <div style="background:#111;color:white;padding:8px 12px;border-radius:8px;font-size:12px;font-family:monospace;border:1px solid ${tierColor}40;max-width:200px;">
                  <div style="font-weight:bold;margin-bottom:4px;color:${tierColor};">${props.title}</div>
                  <div style="color:#888;font-size:10px;text-transform:uppercase;">${props.tier || 'bronze'} tier</div>
                </div>
              `)
              .addTo(map);
          });

          map.on('mouseleave', 'unclustered-point', () => {
            popup.remove();
          });

          console.log(`🗺️ Globe: Cluster layers criados com sucesso`);
        } catch (err) {
          console.error('🗺️ Globe: Error:', err);
        }
      };

      loadGraffitiClusters();

      // Realtime sync
      realtimeChannelRef.current = supabase
        .channel('globe-graffiti-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'graffitis' }, () => {
          loadGraffitiClusters();
        })
        .subscribe();
    });

    map.on('mousedown', stopSpinning);
    map.on('dragstart', stopSpinning);
    map.on('touchstart', stopSpinning);
    
    // Allow clicking map directly to zoom to that country/location
    map.on('click', async (e) => {
      if (isFlying.current) return;

      // Ignorar clicks que já foram tratados por layers
      const clusterFeatures = map.queryRenderedFeatures(e.point, { layers: ['clusters', 'unclustered-point'] });
      if (clusterFeatures.length > 0) return;

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
             willInvokeExplorer = true;
        }
        
        stepZoom(lat, lng, actionMsg, nextZoom, willInvokeExplorer, data?.display_name || targetName);
      } catch (err) {
        console.error(err);
        stepZoom(lat, lng, "Mapeando Local...", 18, true, "Localização Selecionada");
      }
    });

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {}
        mapRef.current = null;
      }
    };
  }, [stepZoom]);
  
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
      if (animationId!) cancelAnimationFrame(animationId!);
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
