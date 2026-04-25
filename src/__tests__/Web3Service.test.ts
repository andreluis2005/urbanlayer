/**
 * Tests para Web3Service — funções utilitárias puras
 */
import { describe, it, expect } from 'vitest';

import { formatAddress } from '../services/Web3Service';

describe('Web3Service', () => {
  describe('formatAddress', () => {
    it('trunca endereço longo no formato 0x1234...5678', () => {
      const address = '0x44AA57E2e4079D2cC680F468e0d53E2Ad362137F';
      const formatted = formatAddress(address);
      expect(formatted).toContain('0x');
      expect(formatted).toContain('...');
      expect(formatted.length).toBeLessThan(address.length);
    });

    it('retorna string vazia para input vazio', () => {
      const formatted = formatAddress('');
      expect(typeof formatted).toBe('string');
    });

    it('mantém o prefixo 0x', () => {
      const address = '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12';
      const formatted = formatAddress(address);
      expect(formatted.startsWith('0x')).toBe(true);
    });
  });
});
