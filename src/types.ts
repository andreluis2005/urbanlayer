export type GraffitiStyle = 'wildstyle' | 'bubble' | 'block' | 'throwie' | 'tag' | '3d' | 'calligraffiti' | 'stencil' | 'mural';

export interface GraffitiSpot {
  id: string;
  lat: number;
  lng: number;
  locationName: string;
  wallImageUrl: string;
  graffitiImageUrl?: string;
  author?: string;
  timestamp: number;
}

export interface UserState {
  currentLocation: {
    lat: number;
    lng: number;
    name: string;
  } | null;
  zoomLevel: 'world' | 'country' | 'city' | 'street';
}
