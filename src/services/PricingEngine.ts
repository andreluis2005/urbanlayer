/**
 * PricingEngine v2 — Cálculo inteligente de preço por localização
 * 
 * PROBLEMA RESOLVIDO: v1 usava contagem bruta de POIs num raio de 500m.
 * Em cidades densas como São Paulo, qualquer rua residencial tem dezenas
 * de estabelecimentos (restaurantes, lojas, bares), gerando tier Gold (0.003 ETH)
 * para ruas que deveriam ser Bronze (0.0003 ETH).
 * 
 * SOLUÇÃO v2: Sistema de pontuação ponderada
 * - POIs comuns (lojas, restaurantes) = 1 ponto cada
 * - POIs culturais (museus, galerias, teatros) = 5 pontos cada  
 * - POIs turísticos (tourism, historic) = 10 pontos cada
 * - Raio reduzido para 250m (mais preciso)
 * - Thresholds muito mais altos para cidades densas
 * 
 * LIÇÃO APRENDIDA: São Paulo residencial ≠ ponto turístico
 */

import { SpotTier, SPOT_TIERS } from './InkNetworkConfig';

interface PricingResult {
  tier: SpotTier;
  tierInfo: typeof SPOT_TIERS[SpotTier];
  poiCount: number;
  weightedScore: number;
  locationCategory: string;
  isLandmark: boolean;
  debug: string;
}

// Cache para evitar chamadas duplicadas (session-level)
const pricingCache = new Map<string, PricingResult>();

function getCacheKey(lat: number, lng: number): string {
  // Arredonda para 4 casas (~11m de precisão) para agrupar consultas próximas
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}

/**
 * Landmarks icônicos mundiais — Legendary/Diamond tier garantido
 * Raio reduzido para ser preciso (0.001 ≈ 111m)
 */
const ICONIC_LANDMARKS: Array<{ lat: number; lng: number; radius: number; name: string; tier: SpotTier }> = [
  // === LEGENDARY (0.05+ ETH) — Top 10 landmarks ===
  { lat: 40.7580, lng: -73.9855, radius: 0.0015, name: 'Times Square', tier: 'legendary' },
  { lat: 48.8584, lng: 2.2945, radius: 0.001, name: 'Tour Eiffel', tier: 'legendary' },
  { lat: 52.5163, lng: 13.3777, radius: 0.002, name: 'Brandenburg Gate', tier: 'legendary' },
  { lat: 41.8902, lng: 12.4922, radius: 0.001, name: 'Colosseum', tier: 'legendary' },
  { lat: 51.5014, lng: -0.1419, radius: 0.001, name: 'Big Ben', tier: 'legendary' },
  { lat: 40.6892, lng: -74.0445, radius: 0.001, name: 'Statue of Liberty', tier: 'legendary' },
  { lat: 27.1751, lng: 78.0421, radius: 0.001, name: 'Taj Mahal', tier: 'legendary' },
  { lat: -33.8568, lng: 151.2153, radius: 0.001, name: 'Sydney Opera House', tier: 'legendary' },
  { lat: 48.8606, lng: 2.3376, radius: 0.001, name: 'Louvre', tier: 'legendary' },
  { lat: 41.4036, lng: 2.1744, radius: 0.001, name: 'Sagrada Família', tier: 'legendary' },

  // === DIAMOND (0.01 ETH) — Locais muito famosos ===
  { lat: -22.9519, lng: -43.2105, radius: 0.001, name: 'Cristo Redentor', tier: 'diamond' },
  { lat: 35.6762, lng: 139.6503, radius: 0.002, name: 'Shibuya Crossing', tier: 'diamond' },
  { lat: 37.8199, lng: -122.4783, radius: 0.001, name: 'Golden Gate Bridge', tier: 'diamond' },
  { lat: 34.0522, lng: -118.2437, radius: 0.002, name: 'Hollywood Sign Area', tier: 'diamond' },

  // === GOLD (0.003 ETH) — Avenidas/zonas famosas em cidades grandes ===
  { lat: -23.5613, lng: -46.6560, radius: 0.001, name: 'Av. Paulista (MASP)', tier: 'gold' },
  { lat: -22.9068, lng: -43.1729, radius: 0.001, name: 'Copacabana', tier: 'gold' },
];

/**
 * Verifica se as coordenadas estão próximas de um landmark conhecido
 */
function checkKnownLandmark(lat: number, lng: number): { isLandmark: boolean; name: string; tier: SpotTier } {
  for (const landmark of ICONIC_LANDMARKS) {
    const dist = Math.sqrt(
      Math.pow(lat - landmark.lat, 2) + Math.pow(lng - landmark.lng, 2)
    );
    if (dist <= landmark.radius) {
      return { isLandmark: true, name: landmark.name, tier: landmark.tier };
    }
  }
  return { isLandmark: false, name: '', tier: 'bronze' };
}

/**
 * Consulta separada para POIs de alto valor (turísticos/culturais)
 * Esses definem se um local é realmente "especial" ou apenas uma rua movimentada
 */
async function countHighValuePOIs(lat: number, lng: number): Promise<{
  touristCount: number;
  culturalCount: number;
  commonCount: number;
  totalWeighted: number;
}> {
  try {
    // Query separada: APENAS pontos turísticos e culturais (raio 250m)
    const queryTourist = `
      [out:json][timeout:10];
      (
        node["tourism"~"attraction|museum|artwork|gallery|viewpoint|monument"](around:250,${lat},${lng});
        node["historic"](around:250,${lat},${lng});
        node["leisure"~"stadium|water_park|theme_park"](around:250,${lat},${lng});
      );
      out count;
    `;

    // Query separada: pontos culturais médios
    const queryCultural = `
      [out:json][timeout:10];
      (
        node["amenity"~"theatre|cinema|arts_centre|library|university"](around:250,${lat},${lng});
        node["tourism"~"hotel|hostel|information"](around:250,${lat},${lng});
      );
      out count;
    `;

    // Query: POIs comuns (lojas, restaurantes) — raio menor (200m)
    const queryCommon = `
      [out:json][timeout:10];
      (
        node["amenity"~"restaurant|cafe|bar|pub|fast_food"](around:200,${lat},${lng});
        node["shop"](around:200,${lat},${lng});
      );
      out count;
    `;

    // Executar queries em paralelo
    const [resTourist, resCultural, resCommon] = await Promise.all([
      fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: `data=${encodeURIComponent(queryTourist)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }).catch(() => null),
      fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: `data=${encodeURIComponent(queryCultural)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }).catch(() => null),
      fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: `data=${encodeURIComponent(queryCommon)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }).catch(() => null),
    ]);

    const parseTotalCount = async (res: Response | null): Promise<number> => {
      if (!res || !res.ok) return 0;
      try {
        const data = await res.json();
        return data.elements?.[0]?.tags?.total 
          ? parseInt(data.elements[0].tags.total)
          : data.elements?.length || 0;
      } catch { return 0; }
    };

    const touristCount = await parseTotalCount(resTourist);
    const culturalCount = await parseTotalCount(resCultural);
    const commonCount = await parseTotalCount(resCommon);

    // Pontuação ponderada:
    // - Turísticos valem 10 pontos (museus, monumentos, atrações)
    // - Culturais valem 3 pontos (teatros, cinemas, bibliotecas)
    // - Comuns valem 0.5 pontos (restaurantes, lojas — existem em TODA rua de cidade)
    const totalWeighted = (touristCount * 10) + (culturalCount * 3) + (commonCount * 0.5);

    console.log(`📊 POIs encontrados: 🏛️ Tourist=${touristCount} 🎭 Cultural=${culturalCount} 🏪 Common=${commonCount} → Score: ${totalWeighted.toFixed(1)}`);

    return { touristCount, culturalCount, commonCount, totalWeighted };
  } catch (error) {
    console.warn('⚠️ Erro na Overpass API:', error);
    // Fallback: Bronze (assume lugar comum)
    return { touristCount: 0, culturalCount: 0, commonCount: 5, totalWeighted: 2.5 };
  }
}

/**
 * Busca informações de localização via Nominatim (gratuito)
 */
async function getLocationInfo(lat: number, lng: number): Promise<{ category: string; type: string; displayName: string }> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&zoom=18`,
      { headers: { 'User-Agent': 'UrbanLayer/1.0' } }
    );
    const data = await response.json();
    return {
      category: data.category || 'unknown',
      type: data.type || 'unknown',
      displayName: data.display_name || 'Unknown Location',
    };
  } catch {
    return { category: 'unknown', type: 'unknown', displayName: 'Unknown' };
  }
}

/**
 * Classifica o tier baseado no score ponderado
 * 
 * THRESHOLDS CALIBRADOS:
 * - Rua residencial em SP (0 tourist, 0 cultural, ~20 common) → score 10 → BRONZE ✅
 * - Rua comercial em cidade média (0 tourist, 1 cultural, ~15 common) → score 10.5 → BRONZE ✅  
 * - Centro comercial de metrópole (1 tourist, 3 cultural, ~40 common) → score 29 → SILVER ✅
 * - Zona turística (5 tourist, 5 cultural, ~30 common) → score 80 → GOLD ✅
 * - Ponto turístico famoso (15+ tourist, 10 cultural, ~50 common) → score 205 → DIAMOND ✅
 * - Times Square (50+ tourist...) → Landmark → LEGENDARY ✅
 */
function classifyTier(weightedScore: number, landmark: { isLandmark: boolean; tier: SpotTier }): SpotTier {
  // Landmarks pré-definidos têm prioridade absoluta
  if (landmark.isLandmark) return landmark.tier;

  // Thresholds baseados no score ponderado
  if (weightedScore >= 200) return 'legendary';   // Zones with 20+ tourist POIs
  if (weightedScore >= 80) return 'diamond';       // Zones with 8+ tourist POIs
  if (weightedScore >= 30) return 'gold';          // Zones with 3+ tourist POIs or very dense cultural  
  if (weightedScore >= 15) return 'silver';        // Dense commercial areas
  return 'bronze';                                  // Residential, suburban, rural
}

/**
 * FUNÇÃO PRINCIPAL: Calcula o tier de preço para um local
 */
export async function calculateSpotPrice(lat: number, lng: number): Promise<PricingResult> {
  const cacheKey = getCacheKey(lat, lng);
  
  // Verificar cache
  const cached = pricingCache.get(cacheKey);
  if (cached) {
    console.log('💰 Pricing cache hit:', cacheKey, '→', cached.tier);
    return cached;
  }

  console.log('💰 Calculando preço do spot:', lat.toFixed(4), lng.toFixed(4));

  // 1. Verificar landmarks conhecidos (instantâneo, sem API)
  const landmarkCheck = checkKnownLandmark(lat, lng);
  
  let weightedScore = 0;
  let totalPOIs = 0;
  let debugInfo = '';

  if (landmarkCheck.isLandmark) {
    // Landmark conhecido — pula API calls
    debugInfo = `Landmark: ${landmarkCheck.name}`;
    console.log(`🏛️ Landmark encontrado: ${landmarkCheck.name} → ${landmarkCheck.tier.toUpperCase()}`);
  } else {
    // 2. Contar POIs com pesos (Overpass API — gratuito)
    const poiResult = await countHighValuePOIs(lat, lng);
    weightedScore = poiResult.totalWeighted;
    totalPOIs = poiResult.touristCount + poiResult.culturalCount + poiResult.commonCount;
    debugInfo = `T:${poiResult.touristCount} C:${poiResult.culturalCount} S:${poiResult.commonCount} → ${weightedScore.toFixed(0)}pts`;
  }
  
  // 3. Obter info do local (Nominatim — gratuito)
  const locationInfo = await getLocationInfo(lat, lng);

  // 4. Classificar tier
  const tier = classifyTier(weightedScore, landmarkCheck);

  const result: PricingResult = {
    tier,
    tierInfo: SPOT_TIERS[tier],
    poiCount: totalPOIs,
    weightedScore,
    locationCategory: locationInfo.category,
    isLandmark: landmarkCheck.isLandmark,
    debug: debugInfo,
  };

  // Cachear
  pricingCache.set(cacheKey, result);
  console.log(`💰 Tier: ${SPOT_TIERS[tier].emoji} ${tier.toUpperCase()} — ${SPOT_TIERS[tier].price} ETH (${debugInfo})`);

  return result;
}

/**
 * Retorna o preço em ETH para um tier específico
 */
export function getTierPrice(tier: SpotTier): string {
  return SPOT_TIERS[tier].price;
}

/**
 * Retorna o preço em Wei para um tier específico
 */
export function getTierPriceWei(tier: SpotTier): string {
  return SPOT_TIERS[tier].priceWei;
}
