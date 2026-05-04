/**
 * GraffitiOverlay — Renderiza grafites como overlays espaciais sobre o Street View
 *
 * Posiciona cada grafite com base no heading/pitch original vs. câmera atual.
 * Usa transform (não left/top) para evitar jitter e aplica lerp para suavização.
 * Apenas grafites no mesmo pano_id e dentro do FOV são renderizados.
 *
 * Melhorias v4:
 * 1. Overlays interativos — clicáveis com mini-card flutuante
 * 2. Efeito "Spray Reveal" — animação de descoberta ao ver pela primeira vez
 * 3. Badge "Art Discovered!" ao entrar no viewport pela primeira vez
 * 4. SessionStorage para não repetir animações
 */
import React, { useMemo, useRef, useCallback, useEffect, useState } from 'react';
import type { Graffiti } from './GlobalGallery';
import { formatAddress } from '../services/Web3Service';
import { X, Eye, ExternalLink } from 'lucide-react';

interface GraffitiOverlayProps {
  graffitis: Graffiti[];
  currentHeading: number;
  currentPitch: number;
  currentLat: number;
  currentLng: number;
  streetViewZoom: number;
  currentPanoId?: string;
  onGraffitiClick?: (graffiti: Graffiti) => void;
}

/** Normaliza ângulo para [-180, 180] */
function normalizeAngle(angle: number): number {
  let a = angle % 360;
  if (a > 180) a -= 360;
  if (a < -180) a += 360;
  return a;
}

/** Haversine simplificado — distância em metros */
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Dados computados para cada grafite visível */
interface ComputedOverlay {
  id: string;
  graffiti: Graffiti;
  graffitiUrl: string;
  screenX: number;
  screenY: number;
  scale: number;
  opacity: number;
  skewY: number;
}

/**
 * Hook de lerp para suavizar valores numéricos.
 */
function useLerp(target: number, speed: number = 0.25): number {
  const [value, setValue] = useState(target);
  const rafRef = useRef<number>();
  const targetRef = useRef(target);
  targetRef.current = target;

  useEffect(() => {
    let active = true;
    const tick = () => {
      if (!active) return;
      setValue(prev => {
        const diff = targetRef.current - prev;
        if (Math.abs(diff) < 0.01) return targetRef.current;
        return prev + diff * speed;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      active = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [speed]);

  return value;
}

/**
 * Gerenciador de IDs já descobertos (session-scoped)
 */
const DISCOVERED_KEY = 'urbanlayer_discovered_arts';

function getDiscoveredIds(): Set<string> {
  try {
    const stored = sessionStorage.getItem(DISCOVERED_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch { return new Set(); }
}

function markAsDiscovered(id: string) {
  const ids = getDiscoveredIds();
  ids.add(id);
  try {
    sessionStorage.setItem(DISCOVERED_KEY, JSON.stringify([...ids]));
  } catch { /* noop */ }
}

const GraffitiOverlayItem = React.memo(function GraffitiOverlayItem({
  overlay,
  onGraffitiClick,
}: {
  overlay: ComputedOverlay;
  onGraffitiClick?: (graffiti: Graffiti) => void;
}) {
  const smoothX = useLerp(overlay.screenX, 0.3);
  const smoothY = useLerp(overlay.screenY, 0.3);
  const smoothScale = useLerp(overlay.scale, 0.2);
  const smoothSkew = useLerp(overlay.skewY, 0.25);

  const [isFirstSeen, setIsFirstSeen] = useState(false);
  const [showMiniCard, setShowMiniCard] = useState(false);
  const [showDiscoveryBadge, setShowDiscoveryBadge] = useState(false);

  // Spray reveal: Checar se este grafite já foi "descoberto" nesta sessão
  useEffect(() => {
    const discovered = getDiscoveredIds();
    if (!discovered.has(overlay.id)) {
      setIsFirstSeen(true);
      setShowDiscoveryBadge(true);
      markAsDiscovered(overlay.id);

      // Remover badge após 2.5s
      const timer = setTimeout(() => setShowDiscoveryBadge(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [overlay.id]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (showMiniCard) {
      setShowMiniCard(false);
    } else {
      setShowMiniCard(true);
    }
  };

  return (
    <>
      {/* Discovery Badge — "🎨 Art Discovered!" */}
      {showDiscoveryBadge && (
        <div
          className="absolute top-20 left-1/2 z-30 animate-discovery-badge pointer-events-none"
          style={{ transform: 'translateX(-50%)' }}
        >
          <div className="flex items-center gap-2 px-5 py-2.5 bg-neon-green/20 backdrop-blur-md border border-neon-green/40 rounded-full shadow-[0_0_30px_rgba(0,255,0,0.2)]">
            <span className="text-lg">🎨</span>
            <span className="text-sm font-bold uppercase tracking-widest text-neon-green">Art Discovered!</span>
          </div>
        </div>
      )}

      {/* O Grafite overlay */}
      <img
        src={overlay.graffitiUrl}
        alt="Street Graffiti"
        draggable={false}
        onClick={handleClick}
        className={isFirstSeen ? 'animate-spray-reveal' : ''}
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) translate(${(smoothX - 50) * window.innerWidth / 100}px, ${(smoothY - 50) * window.innerHeight / 100}px) scale(${smoothScale}) perspective(800px) rotateY(${smoothSkew}deg)`,
          opacity: overlay.opacity,
          filter: 'saturate(0.85) contrast(1.05) brightness(0.92)',
          maxWidth: '55%',
          maxHeight: '50%',
          pointerEvents: 'auto',
          cursor: 'pointer',
          willChange: 'transform, opacity',
          transition: 'opacity 0.2s ease-out',
        }}
      />

      {/* Mini-card flutuante ao clicar */}
      {showMiniCard && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute z-30 animate-modal-enter"
          style={{
            left: `calc(50% + ${(smoothX - 50) * window.innerWidth / 100}px)`,
            top: `calc(50% + ${(smoothY - 50) * window.innerHeight / 100}px + 40px)`,
            transform: 'translate(-50%, 0)',
          }}
        >
          <div className="bg-black/80 backdrop-blur-xl border border-white/15 rounded-2xl p-4 shadow-[0_0_40px_rgba(0,0,0,0.8)] min-w-[240px] max-w-[300px] pointer-events-auto">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-bold text-white text-sm truncate max-w-[180px]">
                {overlay.graffiti.title || 'Untitled'}
              </h4>
              <button
                onClick={(e) => { e.stopPropagation(); setShowMiniCard(false); }}
                className="p-1 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
            <p className="text-[11px] text-gray-400 font-mono mb-1">
              <span className="text-neon-orange font-bold">BY</span>{' '}
              {overlay.graffiti.artist_address ? formatAddress(overlay.graffiti.artist_address) : 'Anon'}
            </p>
            <p className="text-[10px] text-gray-500 mb-3">
              {new Date(overlay.graffiti.created_at).toLocaleDateString()}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMiniCard(false);
                onGraffitiClick?.(overlay.graffiti);
              }}
              className="w-full px-4 py-2 bg-neon-orange text-black rounded-xl text-xs font-bold uppercase tracking-widest hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
            >
              <Eye className="w-3.5 h-3.5" />
              View Details
            </button>
          </div>
        </div>
      )}
    </>
  );
});

const GraffitiOverlay: React.FC<GraffitiOverlayProps> = React.memo(function GraffitiOverlay({
  graffitis,
  currentHeading,
  currentPitch,
  currentLat,
  currentLng,
  streetViewZoom,
  currentPanoId,
  onGraffitiClick,
}) {
  const fov = 180 / Math.pow(2, streetViewZoom);
  const halfFov = fov / 2;
  const zoomScaleFactor = 1 / Math.pow(2, streetViewZoom - 1);

  const visibleOverlays = useMemo<ComputedOverlay[]>(() => {
    const results: ComputedOverlay[] = [];

    for (const g of graffitis) {
      if (!g.graffiti_url) continue;
      if (g.heading == null || g.pitch == null) continue;

      if (g.pano_id && currentPanoId && g.pano_id !== currentPanoId) {
        const dist = haversineMeters(currentLat, currentLng, g.lat, g.lng);
        if (dist > 15) continue;
      }

      const deltaHeading = normalizeAngle(g.heading - currentHeading);
      const deltaPitch = (g.pitch) - currentPitch;

      if (Math.abs(deltaHeading) > halfFov + 15) continue;

      const screenX = 50 + (deltaHeading / halfFov) * 50;
      const screenY = 50 - (deltaPitch / halfFov) * 50;

      const artistScale = g.scale || 1.0;
      const renderScale = artistScale * zoomScaleFactor * 0.6;

      const edgeFactor = 1 - Math.max(0, (Math.abs(deltaHeading) - halfFov * 0.6) / (halfFov * 0.4));
      const renderOpacity = Math.min(0.95, Math.max(0.1, edgeFactor));

      if (renderOpacity <= 0.05) continue;

      const skewY = deltaHeading * 0.12;

      results.push({
        id: g.id,
        graffiti: g,
        graffitiUrl: g.graffiti_url,
        screenX,
        screenY,
        scale: renderScale,
        opacity: renderOpacity,
        skewY,
      });
    }

    return results;
  }, [graffitis, currentHeading, currentPitch, currentLat, currentLng, currentPanoId, halfFov, zoomScaleFactor]);

  if (visibleOverlays.length === 0) return null;

  return (
    <div
      className="absolute inset-0 z-[5] overflow-hidden"
      aria-hidden="true"
    >
      {visibleOverlays.map(overlay => (
        <GraffitiOverlayItem
          key={overlay.id}
          overlay={overlay}
          onGraffitiClick={onGraffitiClick}
        />
      ))}
    </div>
  );
});

export default GraffitiOverlay;
