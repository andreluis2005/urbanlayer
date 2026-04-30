/**
 * GraffitiOverlay — Renderiza grafites como overlays espaciais sobre o Street View
 *
 * Posiciona cada grafite com base no heading/pitch original vs. câmera atual.
 * Usa transform (não left/top) para evitar jitter e aplica lerp para suavização.
 * Apenas grafites no mesmo pano_id e dentro do FOV são renderizados.
 *
 * Melhorias v3:
 * 1. pano_id matching — só renderiza se o panorama atual bater
 * 2. Angular distance (heading/pitch delta) — sem Haversine
 * 3. Zoom-aware scale: 1 / 2^(zoom-1)
 * 4. Transform-based positioning (zero jitter)
 * 5. Lerp smoothing para movimento suave
 */
import React, { useMemo, useRef, useCallback, useEffect, useState } from 'react';
import type { Graffiti } from './GlobalGallery';

interface GraffitiOverlayProps {
  graffitis: Graffiti[];
  currentHeading: number;
  currentPitch: number;
  currentLat: number;
  currentLng: number;
  streetViewZoom: number;
  currentPanoId?: string;
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
  graffitiUrl: string;
  screenX: number; // % do centro (50 = centro)
  screenY: number;
  scale: number;
  opacity: number;
  skewY: number; // perspectiva em graus
}

/**
 * Hook de lerp (linear interpolation) para suavizar valores numéricos.
 * Reduz jitter de posicionamento ao amortecer mudanças rápidas do POV.
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
        // Se a diferença é insignificante, snap direto
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

const GraffitiOverlayItem = React.memo(function GraffitiOverlayItem({
  overlay
}: {
  overlay: ComputedOverlay;
}) {
  // Lerp smoothing para posição — reduz jitter drasticamente
  const smoothX = useLerp(overlay.screenX, 0.3);
  const smoothY = useLerp(overlay.screenY, 0.3);
  const smoothScale = useLerp(overlay.scale, 0.2);
  const smoothSkew = useLerp(overlay.skewY, 0.25);

  return (
    <img
      key={overlay.id}
      src={overlay.graffitiUrl}
      alt="Street Graffiti"
      draggable={false}
      style={{
        position: 'absolute',
        // Posicionar no centro e mover com transform (sem left/top transitions = zero jitter)
        left: '50%',
        top: '50%',
        transform: `translate(-50%, -50%) translate(${(smoothX - 50) * window.innerWidth / 100}px, ${(smoothY - 50) * window.innerHeight / 100}px) scale(${smoothScale}) perspective(800px) rotateY(${smoothSkew}deg)`,
        opacity: overlay.opacity,
        filter: 'saturate(0.85) contrast(1.05) brightness(0.92)',
        maxWidth: '55%',
        maxHeight: '50%',
        pointerEvents: 'none',
        willChange: 'transform, opacity',
        // Sem transition em transform — o lerp cuida da suavização
        transition: 'opacity 0.2s ease-out',
      }}
    />
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
}) {
  // FOV dinâmico baseado no zoom do Street View
  // Google Street View: FOV ≈ 180 / 2^zoom
  const fov = 180 / Math.pow(2, streetViewZoom);
  const halfFov = fov / 2;

  // Zoom scale factor: normaliza a escala dos overlays com base no zoom
  const zoomScaleFactor = 1 / Math.pow(2, streetViewZoom - 1);

  // Computar overlays visíveis
  const visibleOverlays = useMemo<ComputedOverlay[]>(() => {
    const results: ComputedOverlay[] = [];

    for (const g of graffitis) {
      // ---- FILTROS RÁPIDOS (skip antes de qualquer cálculo pesado) ----

      // Sem graffiti_url transparente? Skip.
      if (!g.graffiti_url) continue;

      // Sem dados espaciais? Skip (será exibido no fallback HUD).
      if (g.heading == null || g.pitch == null) continue;

      // pano_id matching: se o grafite tem pano_id, só renderizar se estiver no mesmo panorama.
      // Se não tem pano_id (grafite antigo que ganhou heading/pitch de outra forma), usar proximidade.
      if (g.pano_id && currentPanoId && g.pano_id !== currentPanoId) {
        // Diferente panorama — verificar se pelo menos está muito perto (< 15m)
        const dist = haversineMeters(currentLat, currentLng, g.lat, g.lng);
        if (dist > 15) continue;
      }

      // ---- ANGULAR DISTANCE (heading/pitch delta) ----
      const deltaHeading = normalizeAngle(g.heading - currentHeading);
      const deltaPitch = (g.pitch) - currentPitch;

      // Fora do cone de visão? Skip total (com margem de 15° para não "popar")
      if (Math.abs(deltaHeading) > halfFov + 15) continue;

      // ---- SCREEN POSITION ----
      // Mapear delta angular para posição na tela (0-100%)
      const screenX = 50 + (deltaHeading / halfFov) * 50;
      const screenY = 50 - (deltaPitch / halfFov) * 50;

      // ---- SCALE ----
      // Base scale do artista * zoom factor
      const artistScale = g.scale || 1.0;
      const renderScale = artistScale * zoomScaleFactor * 0.6;

      // ---- OPACITY & DISTANCE FADE ----
      // Fade suave nas bordas do FOV
      const edgeFactor = 1 - Math.max(0, (Math.abs(deltaHeading) - halfFov * 0.6) / (halfFov * 0.4));
      const renderOpacity = Math.min(0.95, Math.max(0.1, edgeFactor));

      // Fora da tela? Skip (otimização — nenhum DOM node gerado)
      if (renderOpacity <= 0.05) continue;

      // ---- PERSPECTIVE ----
      // Leve rotação 3D baseada na posição horizontal
      const skewY = deltaHeading * 0.12;

      results.push({
        id: g.id,
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
      className="absolute inset-0 z-[5] pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      {visibleOverlays.map(overlay => (
        <GraffitiOverlayItem key={overlay.id} overlay={overlay} />
      ))}
    </div>
  );
});

export default GraffitiOverlay;
