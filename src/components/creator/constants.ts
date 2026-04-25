/**
 * Constantes e tipos compartilhados do Creator
 * Extraído do GraffitiCreator.tsx monolítico — sem mudança funcional
 */

import { GraffitiStyle } from '../../types';

export interface AdvancedParams {
  fill: string;
  outline: string;
  shadow: string;
  depth: string;
  lighting: string;
  dripping: string;
  sprayFx: string;
  details: string;
  integration: string;
  colors: string;
  imperfections: boolean;
}

export const DEFAULT_ADV_PARAMS: AdvancedParams = {
  fill: 'Solid Color',
  outline: 'Simple',
  shadow: 'Drop Shadow',
  depth: 'None',
  lighting: 'None',
  dripping: 'None',
  sprayFx: 'Overspray (Mist)',
  details: 'None',
  integration: 'Wall Interaction',
  colors: 'Vibrant (Street)',
  imperfections: true
};

export const STYLES: { id: GraffitiStyle; label: string; description: string; color: string }[] = [
  { id: 'wildstyle', label: 'Wildstyle', description: 'Complex, interlocking, hard to read', color: '#FF6321' },
  { id: 'bubble', label: 'Bubble', description: 'Rounded, inflated, urban cartoon', color: '#00F0FF' },
  { id: 'block', label: 'Block', description: 'Straight, heavy, more legible', color: '#FF00FF' },
  { id: 'throwie', label: 'Throw-up', description: 'Fast, simple, street style', color: '#FFFF00' },
  { id: 'tag', label: 'Tag', description: 'Handwritten, fluid signature', color: '#FFFFFF' },
  { id: '3d', label: '3D Letters', description: 'Depth and perspective', color: '#FF0000' },
  { id: 'calligraffiti', label: 'Calligraffiti', description: 'Mix of calligraphy & graffiti', color: '#00FF00' },
  { id: 'stencil', label: 'Stencil', description: 'Banksy style (with cutouts)', color: '#888888' },
];

export const PORTRAIT_MODELS = [
  { id: 'stability-ai/sdxl:7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc', label: 'Urban Realism (SDXL)', description: 'Classic realistic wall mural' },
  { id: 'hunterkamerman/sdxl-clonesy:fcd19e618b678df9fd535c25df27253ec3dd0576383e155e955021d361a7b49f', label: 'Banksy / Stencil', description: 'Stencil street art with cutouts' },
  { id: 'hunterkamerman/sdxl-murals:6e5a86aa3fd077660633fa2b81ded62ac15784ea05266300f1e7540414c834c7', label: 'Large Scale Murals', description: 'Detailed paint and wall interaction' },
  { id: 'georgedavila/sdxl-basquiat:5b823d78b8646eb5ab9b7ab8317397ccbe409bd70c4f13a8849f9c39b2e8b6d2', label: 'Basquiat Expressionism', description: 'Raw, colorful and chaotic art' },
];

export const EXPRESS_FONTS = [
  'Sedgwick Ave Display',
  'Permanent Marker',
  'Caveat Brush',
  'Rock Salt',
  'Finger Paint',
  'Bangers',
  'Chewy',
  'Mochiy Pop P One',
  'Rampart One',
  'Bungee Shade',
  'Anton',
  'Creepster',
  'Rubik Beastly',
  'Nosifer',
  'Eater',
  'Frijole',
  'Black Ops One',
  'Special Elite',
  'Press Start 2P',
  'Monoton'
];
