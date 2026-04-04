import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Loader2, MapPin, Globe as GlobeIcon } from 'lucide-react';

interface GlobeProps {
  onSelectLocation: (lat: number, lng: number, name: string) => void;
}

const Globe: React.FC<GlobeProps> = ({ onSelectLocation }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const projectionRef = useRef<any>(null);
  const gRef = useRef<any>(null);
  const [isRotating, setIsRotating] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  // Transition States
  const [zoomLevel, setZoomLevel] = useState<'globe' | 'country' | 'city' | 'street'>('globe');
  const [transitionText, setTransitionText] = useState('');

  const width = window.innerWidth;
  const height = window.innerHeight;
  const sensitivity = 75;

  const runCinematicZoom = useCallback((lat: number, lng: number, locationName: string) => {
    if (!projectionRef.current || !gRef.current || !svgRef.current) return;
    
    setIsRotating(false);
    const projection = projectionRef.current;
    const g = gRef.current;
    const path = d3.geoPath().projection(projection);
    const initialScale = Math.min(width, height) / 2.5;

    const rotate = projection.rotate();
    const targetRotate = [-lng, -lat];
    
    // Parse Address Hierarchy (Nominatim comma-separated)
    const parts = locationName.split(',').map(s => s.trim());
    const country = parts.length > 0 ? parts[parts.length - 1] : "Destination";
    const stateVal = parts.length > 3 ? parts[parts.length - 3] : "";
    const cityVal = parts.length > 4 ? parts[parts.length - 5] : parts[1] || "Urban Area";
    const street = parts[0] !== country ? parts[0] : "";
    
    // Stage 1: Rotate and Start Zoom
    setTransitionText(`Entering ${country}...`);
    setZoomLevel('country');

    d3.transition()
      .duration(4500) // Slightly longer for immersive read
      .ease(d3.easeCubicInOut)
      .tween('cinematic', () => {
        const rInterp = d3.interpolate(rotate, targetRotate);
        const sInterp = d3.interpolate(initialScale, initialScale * 25); // Faster deep zoom
        
        return (t: number) => {
          projection.rotate(rInterp(t));
          projection.scale(sInterp(t));
          
          // Cascading Texts
          if (t > 0.3 && t <= 0.5 && stateVal) {
             setZoomLevel('country'); // Keep indicator
             setTransitionText(`Approaching ${stateVal}...`);
          }
          if (t > 0.5 && t < 0.75) {
            setZoomLevel('city');
            setTransitionText(`Zooming into ${cityVal}...`);
          }
          if (t >= 0.75) {
            setZoomLevel('street');
            setTransitionText(street ? `Locating ${street}...` : 'Descending to street level...');
          }

          g.selectAll('path').attr('d', path as any);
          d3.select(svgRef.current).select('circle').attr('r', projection.scale());
        };
      })
      .on('end', () => {
        setTimeout(() => {
          onSelectLocation(lat, lng, locationName);
        }, 500);
      });
  }, [onSelectLocation, width, height]);

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
        runCinematicZoom(latitude, longitude, display_name);
      }
    } catch (error) {
      console.error('Error searching location:', error);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (!svgRef.current) return;

    const projection = d3.geoOrthographic()
      .scale(Math.min(width, height) / 2.5)
      .center([0, 0])
      .rotate([0, -30])
      .translate([width / 2, height / 2]);

    projectionRef.current = projection;
    const initialScale = projection.scale();
    const path = d3.geoPath().projection(projection);

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    svg.selectAll('*').remove();

    // Globe background (water)
    svg.append('circle')
      .attr('fill', '#050505')
      .attr('stroke', '#1a1a1a')
      .attr('stroke-width', '0.5')
      .attr('cx', width / 2)
      .attr('cy', height / 2)
      .attr('r', initialScale);

    const g = svg.append('g');
    gRef.current = g;

    d3.json('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson').then((data: any) => {
      g.selectAll('path')
        .data(data.features)
        .enter()
        .append('path')
        .attr('d', path as any)
        .attr('fill', '#111')
        .attr('stroke', '#333')
        .attr('stroke-width', '0.5')
        .style('cursor', 'pointer')
        .on('mouseover', function() {
          d3.select(this).attr('fill', '#FF6321');
        })
        .on('mouseout', function() {
          d3.select(this).attr('fill', '#111');
        })
        .on('click', (event, d: any) => {
          const [lng, lat] = d3.geoCentroid(d);
          const name = d.properties.name || "Unknown Land";
          runCinematicZoom(lat, lng, name);
        });

      let timer: d3.Timer;
      const startRotation = () => {
        timer = d3.timer((elapsed) => {
          if (!isRotating) return;
          const rotate = projection.rotate();
          const k = sensitivity / projection.scale();
          projection.rotate([rotate[0] - 0.5 * k, rotate[1]]);
          g.selectAll('path').attr('d', path as any);
        });
      };

      if (isRotating) startRotation();

      svg.call(d3.drag()
        .on('start', () => setIsRotating(false))
        .on('drag', (event) => {
          if (zoomLevel !== 'globe') return; // Disable drag while zooming
          const rotate = projection.rotate();
          const k = sensitivity / projection.scale();
          projection.rotate([
            rotate[0] + event.dx * k,
            rotate[1] - event.dy * k
          ]);
          g.selectAll('path').attr('d', path as any);
        }) as any);

      return () => timer?.stop();
    });
  }, [width, height, isRotating, zoomLevel, runCinematicZoom]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      <svg ref={svgRef} className={zoomLevel === 'globe' ? 'cursor-move' : 'cursor-wait'} />
      
      {/* UI Elements */}
      <AnimatePresence>
        {zoomLevel === 'globe' && (
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="absolute top-10 left-10 z-10 space-y-6"
          >
            <div>
              <h1 className="text-6xl font-bold graffiti-text text-neon-orange tracking-tighter">
                Graffiti<br />The World
              </h1>
              <p className="text-gray-500 mt-2 max-w-xs font-mono text-xs uppercase tracking-widest">
                Explore the globe. Find your spot. Leave your mark.
              </p>
            </div>

            <form onSubmit={handleSearch} className="relative w-80 group">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search address or city..."
                className="w-full bg-white/5 border border-white/10 rounded-full px-6 py-4 pl-12 text-sm focus:outline-none focus:border-neon-orange focus:bg-white/10 transition-all backdrop-blur-md text-white"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-neon-orange transition-colors" />
              {isSearching && (
                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neon-orange animate-spin" />
              )}
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cinematic Transition Overlay */}
      <AnimatePresence>
        {zoomLevel !== 'globe' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-50 bg-black/20 backdrop-blur-[2px]"
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
                    className="graffiti-text text-5xl text-white tracking-[0.2em] text-center"
                  >
                    {transitionText}
                  </motion.h3>
                  <div className="flex gap-2">
                    <span className={`h-1 w-12 rounded-full transition-all duration-500 ${zoomLevel === 'country' ? 'bg-neon-orange shadow-[0_0_10px_#FF6321]' : 'bg-white/10'}`} />
                    <span className={`h-1 w-12 rounded-full transition-all duration-500 ${zoomLevel === 'city' ? 'bg-neon-orange shadow-[0_0_10px_#FF6321]' : 'bg-white/10'}`} />
                    <span className={`h-1 w-12 rounded-full transition-all duration-500 ${zoomLevel === 'street' ? 'bg-neon-orange shadow-[0_0_10px_#FF6321]' : 'bg-white/10'}`} />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-10 right-10 z-10 flex flex-col items-end">
        <div className="flex gap-4 mb-4">
          <button 
            onClick={() => setIsRotating(!isRotating)}
            className="px-4 py-2 border border-white/20 rounded-full text-[10px] uppercase tracking-widest hover:bg-white hover:text-black transition-colors backdrop-blur-md text-white/70"
          >
            {isRotating ? 'Stop Rotation' : 'Start Rotation'}
          </button>
        </div>
        <p className="text-[10px] text-gray-600 uppercase tracking-[0.3em]">
          Drag to rotate • Scroll to zoom • Land on any country
        </p>
      </div>
    </div>
  );
};

export default Globe;
