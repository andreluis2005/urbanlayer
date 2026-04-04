import React, { useState } from 'react';
import Globe from './components/Globe';
import StreetExplorer from './components/StreetExplorer';
import GraffitiCreator from './components/GraffitiCreator';
import WalletButton from './components/WalletButton';
import { Web3Provider } from './contexts/Web3Context';
import { motion, AnimatePresence } from 'motion/react';

type AppState = 'globe' | 'explorer' | 'creator';

export default function App() {
  const [state, setState] = useState<AppState>('globe');
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [selectedWall, setSelectedWall] = useState<string | null>(null);

  const handleSelectLocation = (lat: number, lng: number, name: string) => {
    setSelectedLocation({ lat, lng, name });
    setState('explorer');
  };

  const handleSelectSpot = (wallImage: string, exactLat: number, exactLng: number, heading?: number, pitch?: number) => {
    setSelectedLocation(prev => prev ? { 
      ...prev, 
      lat: exactLat, 
      lng: exactLng,
      heading: heading,
      pitch: pitch
    } : null);
    setSelectedWall(wallImage);
    setState('creator');
  };

  const handleBackToGlobe = () => {
    setState('globe');
    setSelectedLocation(null);
    setSelectedWall(null);
  };

  const handleBackToExplorer = () => {
    setState('explorer');
    setSelectedWall(null);
  };

  return (
    <Web3Provider>
      <div className="w-full h-screen bg-black text-white overflow-hidden">
        {/* Wallet Button — Flutuante em todas as telas */}
        <div className="fixed top-4 right-4 z-[150]">
          <WalletButton />
        </div>

        <AnimatePresence mode="wait">
          {state === 'globe' && (
            <motion.div
              key="globe"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full"
            >
              <Globe onSelectLocation={handleSelectLocation} />
            </motion.div>
          )}

          {state === 'explorer' && selectedLocation && (
            <motion.div
              key="explorer"
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full h-full"
            >
              <StreetExplorer 
                location={selectedLocation}
                onSelectSpot={handleSelectSpot}
                onBack={handleBackToGlobe}
              />
            </motion.div>
          )}

          {state === 'creator' && selectedLocation && selectedWall && (
            <motion.div
              key="creator"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full h-full"
            >
              <GraffitiCreator 
                wallImage={selectedWall}
                location={selectedLocation}
                onBack={handleBackToExplorer}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Overlay for Atmosphere */}
        <div className="fixed inset-0 pointer-events-none z-[100]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
          <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
        </div>
      </div>
    </Web3Provider>
  );
}
