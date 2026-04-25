/**
 * Tests para PricingEngine — funções puras de classificação e cache
 */
import { describe, it, expect } from 'vitest';

// Importar as funções exportadas do PricingEngine
import { getTierPrice, getTierPriceWei } from '../services/PricingEngine';

// Importar constantes de tiers
import { SPOT_TIERS, type SpotTier } from '../services/InkNetworkConfig';

describe('PricingEngine', () => {
  describe('getTierPrice', () => {
    it('retorna preço correto para Bronze', () => {
      expect(getTierPrice('bronze')).toBe(SPOT_TIERS.bronze.price);
    });

    it('retorna preço correto para Silver', () => {
      expect(getTierPrice('silver')).toBe(SPOT_TIERS.silver.price);
    });

    it('retorna preço correto para Gold', () => {
      expect(getTierPrice('gold')).toBe(SPOT_TIERS.gold.price);
    });

    it('retorna preço correto para Diamond', () => {
      expect(getTierPrice('diamond')).toBe(SPOT_TIERS.diamond.price);
    });

    it('retorna preço correto para Legendary', () => {
      expect(getTierPrice('legendary')).toBe(SPOT_TIERS.legendary.price);
    });

    it('tiers têm preços crescentes', () => {
      const tiers: SpotTier[] = ['bronze', 'silver', 'gold', 'diamond', 'legendary'];
      for (let i = 0; i < tiers.length - 1; i++) {
        const currentPrice = parseFloat(getTierPrice(tiers[i]));
        const nextPrice = parseFloat(getTierPrice(tiers[i + 1]));
        expect(nextPrice).toBeGreaterThan(currentPrice);
      }
    });
  });

  describe('getTierPriceWei', () => {
    it('retorna Wei como string para todos os tiers', () => {
      const tiers: SpotTier[] = ['bronze', 'silver', 'gold', 'diamond', 'legendary'];
      for (const tier of tiers) {
        const wei = getTierPriceWei(tier);
        expect(typeof wei).toBe('string');
        expect(wei.length).toBeGreaterThan(0);
        // Wei deve ser um número grande (sem ponto decimal)
        expect(wei).toMatch(/^\d+$/);
      }
    });
  });

  describe('SPOT_TIERS config', () => {
    it('todos os tiers têm propriedades obrigatórias', () => {
      const tiers: SpotTier[] = ['bronze', 'silver', 'gold', 'diamond', 'legendary'];
      for (const tier of tiers) {
        const info = SPOT_TIERS[tier];
        expect(info).toBeDefined();
        expect(info.price).toBeDefined();
        expect(info.priceWei).toBeDefined();
        expect(info.emoji).toBeDefined();
      }
    });
  });
});
