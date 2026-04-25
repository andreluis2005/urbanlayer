/**
 * PricingEngine v3 — Preço Adaptativo com Multiplicador Dinâmico
 * 
 * MODELO B: "Spray Can Economics"
 * preço_final = preço_base_tier × multiplicador_local × fator_escassez
 * 
 * O multiplicador_local é calculado a partir do weightedScore dos POIs:
 * - Dentro do range [min, max] de cada tier
 * - Quanto mais turístico/cultural o local, maior o multiplicador
 * 
 * ESTRATÉGIA:
 * - Bronze barato (~$0.90) para atrair massa de usuários
 * - A receita da geração IA subsidia o preço baixo do Bronze
 * - Tiers superiores refletem valor real de marketing dos locais
 * 
 * THRESHOLDS CALIBRADOS POR DADOS REAIS (Overpass API):
 * - Rua residencial SP: score ~10 → BRONZE (0.0005 ETH × 1x = $0.90)
 * - Centro comercial metrópole: score ~29 → SILVER (0.05 ETH × 1x = $90)
 * - Zona turística: score ~80 → GOLD (0.5 ETH × 1x = $900)
 * - Ponto turístico famoso: score ~205 → DIAMOND (5.0 ETH × 1x = $9K)
 * - Times Square (landmark): → LEGENDARY (50.0 ETH × max = $9M)
 */

import { SpotTier, SPOT_TIERS } from './InkNetworkConfig';
import { parseEther } from 'ethers';

export interface PricingResult {
  tier: SpotTier;
  tierInfo: typeof SPOT_TIERS[SpotTier];
  poiCount: number;
  weightedScore: number;
  locationCategory: string;
  isLandmark: boolean;
  debug: string;
  /** Multiplicador dinâmico aplicado (1x–Nx baseado no score dentro do tier) */
  multiplier: number;
  /** Preço final calculado em ETH (base × multiplicador) */
  calculatedPriceEth: string;
  /** Preço final calculado em Wei (para smart contract) */
  calculatedPriceWei: string;
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
 * 
 * PREÇOS (Modelo B):
 * - Legendary: 50.0 ETH base (~$90K) × multiplicador até 100x = até $9M
 * - Diamond: 5.0 ETH base (~$9K) × multiplicador até 20x = até $180K
 * - Gold: 0.5 ETH base (~$900) × multiplicador até 10x = até $9K
 */
const ICONIC_LANDMARKS: Array<{ lat: number; lng: number; radius: number; name: string; tier: SpotTier; fameMultiplier: number }> = [
  // === LEGENDARY (50+ ETH) — Top 10 landmarks, multiplicador alto ===
  { lat: 40.7580, lng: -73.9855, radius: 0.0015, name: 'Times Square', tier: 'legendary', fameMultiplier: 80 },
  { lat: 48.8584, lng: 2.2945, radius: 0.001, name: 'Tour Eiffel', tier: 'legendary', fameMultiplier: 90 },
  { lat: 52.5163, lng: 13.3777, radius: 0.002, name: 'Brandenburg Gate', tier: 'legendary', fameMultiplier: 40 },
  { lat: 41.8902, lng: 12.4922, radius: 0.001, name: 'Colosseum', tier: 'legendary', fameMultiplier: 70 },
  { lat: 51.5014, lng: -0.1419, radius: 0.001, name: 'Big Ben', tier: 'legendary', fameMultiplier: 60 },
  { lat: 40.6892, lng: -74.0445, radius: 0.001, name: 'Statue of Liberty', tier: 'legendary', fameMultiplier: 75 },
  { lat: 27.1751, lng: 78.0421, radius: 0.001, name: 'Taj Mahal', tier: 'legendary', fameMultiplier: 85 },
  { lat: -33.8568, lng: 151.2153, radius: 0.001, name: 'Sydney Opera House', tier: 'legendary', fameMultiplier: 50 },
  { lat: 48.8606, lng: 2.3376, radius: 0.001, name: 'Louvre', tier: 'legendary', fameMultiplier: 65 },
  { lat: 41.4036, lng: 2.1744, radius: 0.001, name: 'Sagrada Família', tier: 'legendary', fameMultiplier: 55 },

  // === DIAMOND (5+ ETH) — Locais muito famosos ===
  { lat: -22.9519, lng: -43.2105, radius: 0.001, name: 'Cristo Redentor', tier: 'diamond', fameMultiplier: 15 },
  { lat: 35.6762, lng: 139.6503, radius: 0.002, name: 'Shibuya Crossing', tier: 'diamond', fameMultiplier: 12 },
  { lat: 37.8199, lng: -122.4783, radius: 0.001, name: 'Golden Gate Bridge', tier: 'diamond', fameMultiplier: 14 },
  { lat: 34.0522, lng: -118.2437, radius: 0.002, name: 'Hollywood Sign Area', tier: 'diamond', fameMultiplier: 10 },

  // === GOLD (0.5+ ETH) — Avenidas/zonas famosas em cidades grandes ===
  { lat: -23.5613, lng: -46.6560, radius: 0.001, name: 'Av. Paulista (MASP)', tier: 'gold', fameMultiplier: 5 },
  { lat: -22.9068, lng: -43.1729, radius: 0.001, name: 'Copacabana', tier: 'gold', fameMultiplier: 7 },
];

/**
 * Verifica se as coordenadas estão próximas de um landmark conhecido
 */
function checkKnownLandmark(lat: number, lng: number): { isLandmark: boolean; name: string; tier: SpotTier; fameMultiplier: number } {
  for (const landmark of ICONIC_LANDMARKS) {
    const dist = Math.sqrt(
      Math.pow(lat - landmark.lat, 2) + Math.pow(lng - landmark.lng, 2)
    );
    if (dist <= landmark.radius) {
      return { isLandmark: true, name: landmark.name, tier: landmark.tier, fameMultiplier: landmark.fameMultiplier };
    }
  }
  return { isLandmark: false, name: '', tier: 'bronze', fameMultiplier: 1 };
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
 * THRESHOLDS CALIBRADOS (v3 — Modelo B):
 * - Rua residencial em SP (score ~10) → BRONZE: 0.0005 ETH (~$0.90)
 * - Centro comercial metrópole (score ~29) → SILVER: 0.05 ETH (~$90)
 * - Zona turística (score ~80) → GOLD: 0.5 ETH (~$900)
 * - Ponto turístico famoso (score ~205) → DIAMOND: 5.0 ETH (~$9K)
 * - Landmark (fora da escala) → LEGENDARY: 50.0 ETH (~$90K)
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
 * Calcula o multiplicador dinâmico dentro do range do tier.
 * 
 * O weightedScore determina "quão bom" é o spot DENTRO do seu tier.
 * Um Bronze numa rua movimentada de Manhattan será mais caro que
 * um Bronze num beco rural, mesmo ambos sendo tier Bronze.
 * 
 * FÓRMULA: multiplier = min + (score_normalized × (max - min))
 * - score_normalized = posição do score dentro dos thresholds do tier (0.0 → 1.0)
 */
function calculateMultiplier(tier: SpotTier, weightedScore: number, landmark: { isLandmark: boolean; fameMultiplier: number }): number {
  const tierInfo = SPOT_TIERS[tier];

  // Landmarks usam seu fameMultiplier pré-definido
  if (landmark.isLandmark) {
    // Garante que está dentro do range do tier
    return Math.max(tierInfo.multiplierMin, Math.min(landmark.fameMultiplier, tierInfo.multiplierMax));
  }

  // Ranges de score para cada tier (baseados nos thresholds de classifyTier)
  const tierScoreRanges: Record<SpotTier, { low: number; high: number }> = {
    bronze:    { low: 0, high: 15 },
    silver:    { low: 15, high: 30 },
    gold:      { low: 30, high: 80 },
    diamond:   { low: 80, high: 200 },
    legendary: { low: 200, high: 500 },
  };

  const range = tierScoreRanges[tier];
  // Normaliza o score dentro do range do tier (0.0 → 1.0)
  const normalized = Math.max(0, Math.min(1, (weightedScore - range.low) / (range.high - range.low)));

  // Interpola o multiplicador entre min e max do tier
  const multiplier = tierInfo.multiplierMin + (normalized * (tierInfo.multiplierMax - tierInfo.multiplierMin));

  // Arredonda para 1 casa decimal para clareza
  return Math.round(multiplier * 10) / 10;
}

/**
 * Calcula o preço final em ETH e Wei com base no tier e multiplicador
 */
function calculateFinalPrice(tier: SpotTier, multiplier: number): { priceEth: string; priceWei: string } {
  const basePrice = parseFloat(SPOT_TIERS[tier].price);
  const finalPrice = basePrice * multiplier;

  // Formatar ETH com precisão suficiente (evitar arredondamento destrutivo)
  const priceEth = finalPrice.toFixed(finalPrice < 0.01 ? 6 : finalPrice < 1 ? 4 : 2);

  // Converter para Wei usando parseEther do ethers.js
  const priceWei = parseEther(priceEth).toString();

  return { priceEth, priceWei };
}

/**
 * FUNÇÃO PRINCIPAL: Calcula o tier e preço adaptativo para um local
 */
export async function calculateSpotPrice(lat: number, lng: number): Promise<PricingResult> {
  const cacheKey = getCacheKey(lat, lng);
  
  // Verificar cache
  const cached = pricingCache.get(cacheKey);
  if (cached) {
    console.log('💰 Pricing cache hit:', cacheKey, '→', cached.tier, `${cached.multiplier}x`);
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

  // 5. Calcular multiplicador dinâmico
  const multiplier = calculateMultiplier(tier, weightedScore, landmarkCheck);

  // 6. Calcular preço final
  const { priceEth, priceWei } = calculateFinalPrice(tier, multiplier);

  const result: PricingResult = {
    tier,
    tierInfo: SPOT_TIERS[tier],
    poiCount: totalPOIs,
    weightedScore,
    locationCategory: locationInfo.category,
    isLandmark: landmarkCheck.isLandmark,
    debug: debugInfo,
    multiplier,
    calculatedPriceEth: priceEth,
    calculatedPriceWei: priceWei,
  };

  // Cachear
  pricingCache.set(cacheKey, result);
  console.log(`💰 Tier: ${SPOT_TIERS[tier].emoji} ${tier.toUpperCase()} — ${priceEth} ETH (${multiplier}x) (${debugInfo})`);

  return result;
}

/**
 * Retorna o preço BASE em ETH para um tier específico (sem multiplicador)
 */
export function getTierPrice(tier: SpotTier): string {
  return SPOT_TIERS[tier].price;
}

/**
 * Retorna o preço BASE em Wei para um tier específico (sem multiplicador)
 */
export function getTierPriceWei(tier: SpotTier): string {
  return SPOT_TIERS[tier].priceWei;
}

