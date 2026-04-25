/**
 * Tests para constants.ts — dados do Creator
 */
import { describe, it, expect } from 'vitest';

import { 
  STYLES, 
  PORTRAIT_MODELS, 
  EXPRESS_FONTS, 
  DEFAULT_ADV_PARAMS,
  type AdvancedParams 
} from '../components/creator/constants';

describe('Creator Constants', () => {
  describe('STYLES', () => {
    it('tem 8 estilos definidos', () => {
      expect(STYLES).toHaveLength(8);
    });

    it('cada estilo tem id, label, description e color', () => {
      for (const style of STYLES) {
        expect(style.id).toBeDefined();
        expect(style.label).toBeDefined();
        expect(style.description).toBeDefined();
        expect(style.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    });

    it('não tem IDs duplicados', () => {
      const ids = STYLES.map(s => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('PORTRAIT_MODELS', () => {
    it('tem pelo menos 3 modelos', () => {
      expect(PORTRAIT_MODELS.length).toBeGreaterThanOrEqual(3);
    });

    it('cada modelo tem id com formato replicate', () => {
      for (const model of PORTRAIT_MODELS) {
        expect(model.id).toContain('/');
        expect(model.id).toContain(':');
        expect(model.label).toBeDefined();
      }
    });
  });

  describe('EXPRESS_FONTS', () => {
    it('tem pelo menos 10 fontes', () => {
      expect(EXPRESS_FONTS.length).toBeGreaterThanOrEqual(10);
    });

    it('a primeira fonte é Sedgwick Ave Display (fonte padrão)', () => {
      expect(EXPRESS_FONTS[0]).toBe('Sedgwick Ave Display');
    });
  });

  describe('DEFAULT_ADV_PARAMS', () => {
    it('tem todas as propriedades definidas', () => {
      const keys: (keyof AdvancedParams)[] = [
        'fill', 'outline', 'shadow', 'depth', 'lighting',
        'dripping', 'sprayFx', 'details', 'integration', 'colors', 'imperfections'
      ];
      for (const key of keys) {
        expect(DEFAULT_ADV_PARAMS[key]).toBeDefined();
      }
    });

    it('imperfections é true por padrão (grafite autêntico)', () => {
      expect(DEFAULT_ADV_PARAMS.imperfections).toBe(true);
    });
  });
});
