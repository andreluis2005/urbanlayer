import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import Globe from './components/Globe';
import StreetExplorer from './components/StreetExplorer';
import GraffitiCreator from './components/GraffitiCreator';
import WalletButton from './components/WalletButton';
import GlobalGallery, { type Graffiti } from './components/GlobalGallery';
import LandingPage from './components/LandingPage';
import { Web3Provider } from './contexts/Web3Context';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutGrid } from 'lucide-react';

/**
 * AppContent — Área protegida (após login)
 * Globe → Explorer → Creator com URLs e animações
 */
function AppContent() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number; name: string; heading?: number; pitch?: number; panoId?: string } | null>(null);
  const [selectedWall, setSelectedWall] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'globe' | 'explorer' | 'creator'>('globe');
  const [showGallery, setShowGallery] = useState(false);
  const [discoveredGraffiti, setDiscoveredGraffiti] = useState<Graffiti | null>(null);

  const handleSelectLocation = (lat: number, lng: number, name: string) => {
    setSelectedLocation({ lat, lng, name });
    setCurrentView('explorer');
    navigate(`/explore/${lat.toFixed(6)}/${lng.toFixed(6)}`);
  };

  const handleSelectSpot = (wallImage: string, exactLat: number, exactLng: number, heading?: number, pitch?: number, panoId?: string) => {
    setSelectedLocation(prev => prev ? { 
      ...prev, 
      lat: exactLat, 
      lng: exactLng,
      heading: heading,
      pitch: pitch,
      panoId: panoId
    } : null);
    setSelectedWall(wallImage);
    setCurrentView('creator');
    navigate(`/create/${exactLat.toFixed(6)}/${exactLng.toFixed(6)}`);
  };

  const handleBackToGlobe = () => {
    setCurrentView('globe');
    setSelectedLocation(null);
    setSelectedWall(null);
    setDiscoveredGraffiti(null);
    navigate('/app');
  };

  const handleBackToExplorer = () => {
    setCurrentView('explorer');
    setSelectedWall(null);
    if (selectedLocation) {
      navigate(`/explore/${selectedLocation.lat.toFixed(6)}/${selectedLocation.lng.toFixed(6)}`);
    } else {
      navigate('/app');
    }
  };

  const handleGallerySelect = (graffiti: Graffiti) => {
    setShowGallery(false);
    setDiscoveredGraffiti(graffiti);
    handleSelectLocation(graffiti.lat, graffiti.lng, graffiti.address || 'Street View');
  };

  return (
    <div className="w-full h-screen bg-black text-white overflow-hidden">
      {/* Menu / Ferramentas Flutuantes */}
      <div className="fixed top-4 right-4 z-[150] flex items-center gap-4">
        <button
          onClick={() => setShowGallery(true)}
          className="flex items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl backdrop-blur-md transition-colors"
        >
          <LayoutGrid className="w-5 h-5 text-neon-green" />
          <span className="text-xs font-bold uppercase tracking-widest hidden sm:block">Explorer</span>
        </button>
        <WalletButton />
      </div>

      <AnimatePresence mode="wait">
        {currentView === 'globe' && (
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

        {currentView === 'explorer' && selectedLocation && (
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
              discoveredGraffiti={discoveredGraffiti}
            />
          </motion.div>
        )}

        {currentView === 'creator' && selectedLocation && selectedWall && (
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

      {/* Global Gallery / Marketplace Overlay */}
      <GlobalGallery 
        isOpen={showGallery} 
        onClose={() => setShowGallery(false)} 
        onSelectGraffiti={handleGallerySelect}
      />
    </div>
  );
}

/**
 * AppRouter — Decide entre Landing Page e App baseado no auth
 */
function AppRouter() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleEnterApp = () => {
    navigate('/app');
  };

  /**
   * SEGURANÇA: Redireciona para landing page quando o usuário desconecta.
   * Isso é reativo — espera o estado do React atualizar antes de redirecionar,
   * evitando o race condition do navigate() síncrono no WalletButton.
   */
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Só redireciona se NÃO estiver na landing page já
      if (window.location.pathname !== '/') {
        console.log('🔐 AppRouter: Usuário desautenticado — redirecionando para landing');
        navigate('/', { replace: true });
      }
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Loading state
  if (isLoading) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-400 font-mono">Carregando...</span>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Landing Page — acessível sempre */}
      <Route path="/" element={
        <LandingPage onEnter={handleEnterApp} />
      } />
      
      {/* App protegido — redireciona pra / se não autenticado */}
      <Route path="/app" element={
        isAuthenticated ? <AppContent /> : <LandingPage onEnter={handleEnterApp} />
      } />
      <Route path="/explore/*" element={
        isAuthenticated ? <AppContent /> : <LandingPage onEnter={handleEnterApp} />
      } />
      <Route path="/create/*" element={
        isAuthenticated ? <AppContent /> : <LandingPage onEnter={handleEnterApp} />
      } />
      
      {/* Catch-all */}
      <Route path="*" element={
        isAuthenticated ? <AppContent /> : <LandingPage onEnter={handleEnterApp} />
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Web3Provider>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      </Web3Provider>
    </AuthProvider>
  );
}
