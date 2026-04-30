import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, MapPin, ArrowLeft, Loader2, Sparkles, Upload, Type, Check, RefreshCw, Send, Zap, Shield } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { GraffitiStyle } from '../types';
import { generateGraffitiImage, saveGraffitiToWorld, processGraffitiMask, removeImageBackground, uploadToSupabase } from '../AIService';
import { useWeb3 } from '../contexts/Web3Context';
import { useAuth } from '../contexts/AuthContext';
import { checkSpotOwnership, formatAddress, type MintResult } from '../services/Web3Service';
import SpotPurchaseModal from './SpotPurchaseModal';
import ViralExporterModal from './ViralExporterModal';
import confetti from 'canvas-confetti';
import { compositeWithCanvas } from './creator/compositeWithCanvas';
import { type AdvancedParams, DEFAULT_ADV_PARAMS, STYLES, PORTRAIT_MODELS, EXPRESS_FONTS } from './creator/constants';
import ParamSelect from './creator/ParamSelect';

// Re-export AdvancedParams for backward compatibility (AIService imports it)
export type { AdvancedParams } from './creator/constants';

interface GraffitiCreatorProps {
  wallImage: string;
  location: { lat: number; lng: number; name: string; heading?: number; pitch?: number; panoId?: string };
  onBack: () => void;
}

const GraffitiCreator: React.FC<GraffitiCreatorProps> = ({ wallImage, location, onBack }) => {
  const { wallet } = useWeb3();
  const { user } = useAuth();
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [text, setText] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<GraffitiStyle>('wildstyle');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [step, setStep] = useState<'input' | 'result'>('input');
  const [previewText, setPreviewText] = useState('');
  const [signature, setSignature] = useState('');
  const [advParams, setAdvParams] = useState<AdvancedParams>(DEFAULT_ADV_PARAMS);
  const [selectedPortraitModel, setSelectedPortraitModel] = useState(PORTRAIT_MODELS[0].id);

  // --- Express Mode Engine State ---
  const [engine, setEngine] = useState<'express' | 'pro'>('express');
  const [expressFont, setExpressFont] = useState('Sedgwick Ave Display');
  const [expressFill, setExpressFill] = useState('#00FF00');
  const [expressOutline, setExpressOutline] = useState('#000000');
  const [expressOutlineWidth, setExpressOutlineWidth] = useState(15);
  const [expressShadow, setExpressShadow] = useState<'None' | 'Glow' | 'Drop'>('Drop');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] = useState<'idle' | 'removing_bg' | 'generating'>('idle');

  // States do Adesivo Flutuante (Floating Sticker Mode)
  const containerRef = useRef<HTMLDivElement>(null);
  const [graffitiOverlay, setGraffitiOverlay] = useState<string | null>(null);
  const [overlayType, setOverlayType] = useState<'express' | 'pro' | null>(null);
  const [graffitiScale, setGraffitiScale] = useState(0.5);
  const [graffitiPos, setGraffitiPos] = useState({ x: 0, y: 0 });

  // --- Web3 / NFT States ---
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showViralModal, setShowViralModal] = useState(false);
  const [spotOwnership, setSpotOwnership] = useState<{ isClaimed: boolean; owner: string | null; tokenId: number | null }>({ isClaimed: false, owner: null, tokenId: null });
  const [mintResult, setMintResult] = useState<MintResult | null>(null);
  const [checkingOwnership, setCheckingOwnership] = useState(true);

  // Verificar ownership do spot ao montar
  useEffect(() => {
    const contractAddress = import.meta.env.VITE_INK_CONTRACT_ADDRESS;
    if (!contractAddress) {
      // Contrato não configurado — modo gratuito (backward compatible)
      setCheckingOwnership(false);
      return;
    }
    setCheckingOwnership(true);
    checkSpotOwnership(location.lat, location.lng).then((result) => {
      setSpotOwnership(result);
      setCheckingOwnership(false);
    }).catch(() => setCheckingOwnership(false));
  }, [location.lat, location.lng]);

  // Real-time Text Preview Overlay & Express Generator
  useEffect(() => {
    if (mode !== 'text' || !text.trim()) {
      setPreviewText('');
      setGraffitiOverlay(null);
      setOverlayType(null);
      return;
    }
    const timer = setTimeout(() => {
      setPreviewText(text);
      setResultImage(null); // Limpa imagem anterior ao editar texto
      
      if (engine === 'express') {
        const canvas = document.createElement('canvas');
        canvas.width = 1200;
        canvas.height = 800;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          let fontSize = 250;
          if (text.length > 8) fontSize = 180;
          if (text.length > 15) fontSize = 120;
          
          ctx.font = `${fontSize}px "${expressFont}", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const x = canvas.width / 2;
          const y = canvas.height / 2;

          if (expressShadow === 'Glow') {
            ctx.shadowColor = expressOutline;
            ctx.shadowBlur = 40;
          } else if (expressShadow === 'Drop') {
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetX = 15;
            ctx.shadowOffsetY = 15;
          }

          if (expressOutlineWidth > 0) {
            ctx.lineJoin = 'round';
            ctx.lineWidth = expressOutlineWidth;
            ctx.strokeStyle = expressOutline;
            ctx.strokeText(text, x, y);
          }

          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;

          ctx.fillStyle = expressFill;
          ctx.fillText(text, x, y);

          // Draw signature (Author Tag) if provided
          if (signature.trim()) {
            ctx.font = `50px "Sedgwick Ave Display", cursive, sans-serif`;
            ctx.textAlign = 'right';
            ctx.textBaseline = 'top';
            
            // Calculate a cool offset position (bottom right relative to the main text)
            const mainTextWidth = ctx.measureText(text).width;
            const sigX = Math.min(x + (mainTextWidth / 2) + 60, canvas.width - 20);
            const sigY = y + (fontSize / 2) - 10;

            // Thin Spray Paint Effect (Skinny Cap)
            // It consists of a misty overspray halo and a sharper solid core core
            const sprayColor = '#000000'; // Black spray for the signature
            
            // 1. Overspray halo (Soft & misty)
            ctx.shadowColor = sprayColor;
            ctx.shadowBlur = 15;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            ctx.fillStyle = sprayColor;
            ctx.globalAlpha = 0.4;
            ctx.fillText(signature, sigX, sigY); 
            ctx.fillText(signature, sigX, sigY); // Double pass for deeper mist
            
            // 2. Core line (Thin & sharper)
            ctx.globalAlpha = 1.0;
            ctx.shadowBlur = 4; // slight bleeding
            ctx.fillText(signature, sigX, sigY);
            
            // Reset global alpha and shadow for future frames/draws
            ctx.globalAlpha = 1.0;
            ctx.shadowBlur = 0;
          }

          setGraffitiOverlay(canvas.toDataURL('image/png'));
          setOverlayType('express');
        }
      } else {
        setOverlayType((prev) => {
          if (prev === 'express') setGraffitiOverlay(null);
          return prev === 'express' ? null : prev;
        });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [text, mode, engine, expressFont, expressFill, expressOutline, expressOutlineWidth, expressShadow, signature]);

  const handleGenerateGraffiti = async () => {
    if (text.length < 2) return;
    
    setIsGenerating(true);
    setErrorMsg(null);
    setGraffitiOverlay(null);
    setGraffitiPos({ x: 0, y: 0 }); // Reset position
    try {
      // O Replicate só gera as letras isoladas no fundo branco.
      const rawUrl = await generateGraffitiImage(text, selectedStyle, advParams, signature);
      // Processar via Canvas
      const processedUrl = await processGraffitiMask(rawUrl, 'text', signature);
      setGraffitiOverlay(processedUrl);
      setOverlayType('pro');
    } catch (error: any) {
      console.error("Erro na geração do grafite:", error);
      setErrorMsg(error.message || "Failed to generate graffiti.");
    } finally {
      setIsGenerating(false);
    }
  };

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    
    console.log("📷 Arquivo recebido:", file.name, "Tamanho:", Math.round(file.size / 1024), "KB", "Tipo:", file.type);
    
    // Ler a imagem
    const reader = new FileReader();
    reader.onload = (e) => {
      const rawDataUri = e.target?.result as string;
      console.log("📷 Data URI do FileReader:", Math.round(rawDataUri.length / 1024), "KB");
      
      const img = new Image();
      img.onload = () => {
        console.log("📷 Imagem carregada - Dimensões originais:", img.naturalWidth, "x", img.naturalHeight);
        
        // Redimensionar e converter para JPEG (RGB)
        const canvas = document.createElement('canvas');
        const TARGET_SIZE = 1024;
        canvas.width = TARGET_SIZE;
        canvas.height = TARGET_SIZE;
        console.log("📷 Canvas forçado para SDXL:", TARGET_SIZE, "x", TARGET_SIZE);
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Fundo branco obrigatório
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, TARGET_SIZE, TARGET_SIZE);
          
          // Calcular escala para "contain" a imagem dentro do 1024x1024 sem distorcer
          const scale = Math.min(TARGET_SIZE / img.naturalWidth, TARGET_SIZE / img.naturalHeight);
          const drawWidth = img.naturalWidth * scale;
          const drawHeight = img.naturalHeight * scale;
          const offsetX = (TARGET_SIZE - drawWidth) / 2;
          const offsetY = (TARGET_SIZE - drawHeight) / 2;
          
          ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
          
          // Exportar sempre como JPEG limpo
          const safeJpegBase64 = canvas.toDataURL('image/jpeg', 0.9);
          console.log("📷 JPEG exportado para IA - Data URI final:", Math.round(safeJpegBase64.length / 1024), "KB");
          setUploadedImage(safeJpegBase64);
        }
      };
      img.src = rawDataUri;
    };
    reader.readAsDataURL(file);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false
  } as any);

  const handleFinalize = async () => {
    // Se contrato está configurado E o spot não foi comprado pelo usuário, abrir modal de compra
    const contractAddress = import.meta.env.VITE_INK_CONTRACT_ADDRESS;
    if (contractAddress && !mintResult && !spotOwnership.isClaimed) {
      setShowPurchaseModal(true);
      return;
    }
    // Se o spot é de OUTRO usuário, bloquear
    if (contractAddress && spotOwnership.isClaimed && spotOwnership.owner?.toLowerCase() !== wallet.address?.toLowerCase()) {
      setErrorMsg(`This spot is owned by ${formatAddress(spotOwnership.owner || '')}. You cannot paint here.`);
      return;
    }

    if (graffitiOverlay || resultImage) {
      setIsSaving(true);
      try {
        let savedImageUrl = resultImage;
        let isolatedGraffitiUrl: string | undefined;

        if (graffitiOverlay && !resultImage) {
          // --- NOVO: Upload do grafite isolado (PNG transparente) para o Storage ---
          try {
            const response = await fetch(graffitiOverlay);
            const blob = await response.blob();
            isolatedGraffitiUrl = await uploadToSupabase(blob, 'graffitis');
            console.log('✅ Grafite isolado salvo no Storage:', isolatedGraffitiUrl);
          } catch (uploadErr) {
            console.warn('⚠️ Falha ao salvar grafite isolado, continuando sem ele:', uploadErr);
          }

          // Todas as artes devem ser opacas sobre o muro ('source-over').
          const blendMode: 'multiply' | 'source-over' = 'source-over';
          const applyMask = false;

          const finalCompositedCanvas = await compositeWithCanvas(wallImage, graffitiOverlay, {
            x: graffitiPos.x,
            y: graffitiPos.y,
            scale: graffitiScale
          }, blendMode, applyMask);
          setResultImage(finalCompositedCanvas);
          savedImageUrl = finalCompositedCanvas;
        }

        // Persistir no banco de dados (ambas URLs)
        if (savedImageUrl) {
          await saveGraffitiToWorld({
            lat: location.lat,
            lng: location.lng,
            address: location.name,
            imageUrl: savedImageUrl,
            graffitiUrl: isolatedGraffitiUrl,
            artistUserId: user?.id,
            heading: location.heading,
            pitch: location.pitch,
            scale: graffitiScale,
            panoId: location.panoId,
          });
        }

        setGraffitiOverlay(null); // Desativar modo adesivo flutuante
        setStep('result');
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.6 },
          colors: ['#FF6321', '#00FF00', '#00F0FF']
        });
      } catch (error) {
        console.error("Erro ao finalizar peça:", error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Callback quando o NFT é mintado com sucesso
  const handleMintSuccess = (result: MintResult) => {
    setMintResult(result);
    setSpotOwnership({ isClaimed: true, owner: wallet.address, tokenId: result.tokenId || null });
  };

  const handleManualGenerate = async () => {
    if (mode === 'image' && uploadedImage) {
      setIsGenerating(true);
      setErrorMsg(null);
      setGraffitiPos({ x: 0, y: 0 });
      try {
        // Passo 1: Remover o fundo da foto do usuário e colocar fundo branco
        setGenerationStatus('removing_bg');
        const cleanImageWithWhiteBg = await removeImageBackground(uploadedImage);
        
        // Passo 2: Gerar o grafite a partir da imagem limpa
        setGenerationStatus('generating');
        // O AIService cuidará de fazer o upload para o Supabase Storage automaticamente.
        const rawUrl = await generateGraffitiImage("", selectedStyle, advParams, "", cleanImageWithWhiteBg, selectedPortraitModel);
        
        // Processar a máscara via Canvas para bordas suaves e sem assinatura
        const processedUrl = await processGraffitiMask(rawUrl, 'image', "");
        setGraffitiOverlay(processedUrl);
        setOverlayType('pro'); 
      } catch (error: any) {
        console.error("Erro na geração por imagem:", error);
        setErrorMsg(error.message || "IA transformation failed.");
      } finally {
        setIsGenerating(false);
        setGenerationStatus('idle');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col md:flex-row overflow-hidden">
      {/* Left Side: Preview */}
      <div className="flex-1 relative bg-[#0a0a0a] flex items-center justify-center p-4 md:p-12">
        <div className="absolute top-8 left-8 z-10 flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors backdrop-blur-md border border-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500">Real Location</h2>
            <p className="text-sm font-medium flex items-center gap-2 truncate max-w-xs md:max-w-md">
              <MapPin className="w-3 h-3 text-neon-orange" />
              {location.name}
            </p>
          </div>
        </div>

        <div ref={containerRef} className="relative w-full max-w-5xl aspect-[12.8/8] rounded-3xl overflow-hidden shadow-2xl border border-white/5 bg-black group flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={resultImage ? 'result' : 'wall'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 w-full h-full"
            >
              <img
                src={resultImage || wallImage}
                className="w-full h-full object-cover"
                alt="Wall Preview"
              />
              
              {/* Real-time Text Preview Overlay & Express Generator */}
              {!resultImage && !graffitiOverlay && previewText && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 0.7, scale: 1 }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                  <span 
                    className="text-6xl md:text-9xl font-bold graffiti-text text-center px-10 break-all"
                    style={{ 
                      color: STYLES.find(s => s.id === selectedStyle)?.color || '#fff',
                      textShadow: `
                        ${advParams.depth === '3D Extrusion' ? '5px 5px 0px #222, 10px 10px 0px #111, ' : ''}
                        ${advParams.lighting === 'Neon Glow' ? '0 0 20px currentColor, 0 0 40px currentColor, ' : ''}
                        ${advParams.shadow !== 'None' ? '0 10px 20px rgba(0,0,0,0.8)' : '0 0 10px rgba(0,0,0,0.5)'}
                      `,
                      filter: 'blur(1px)'
                    }}
                  >
                    {previewText}
                  </span>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* O Adesivo Flutuante Arrastável e Redimensionável (Framer Motion) */}
          {graffitiOverlay && !resultImage && (
            <motion.img
              src={graffitiOverlay}
              drag
              dragConstraints={containerRef}
              dragElastic={0}
              dragMomentum={false}
              onDragEnd={(event, info) => {
                setGraffitiPos({ 
                  x: graffitiPos.x + info.offset.x, 
                  y: graffitiPos.y + info.offset.y 
                });
              }}
              className="absolute cursor-grab active:cursor-grabbing object-contain z-10"
              style={{
                width: '80%', // Escala base
                x: graffitiPos.x,
                y: graffitiPos.y,
                scale: graffitiScale,
                // Opostos de 'multiply', usamos 'normal' para garantir que os traços fiquem sólidos, vivos e não transparentes/escuros.
                mixBlendMode: 'normal',
                // A pedido do usuário para testes, deixamos sem máscara para ver o fundo branco real gerado pela IA.
                WebkitMaskImage: 'none',
                maskImage: 'none',
              }}
              alt="Floating Graffiti Sticker"
              initial={{ opacity: 0, scale: 0.2 }}
              animate={{ opacity: 1, scale: graffitiScale }}
            />
          )}
          
          {isGenerating && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center z-50">
              <div className="relative">
                <Loader2 className="w-16 h-16 text-neon-orange animate-spin" />
                <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-white animate-pulse" />
              </div>
              <p className="graffiti-text text-xl tracking-[0.3em] mt-4 text-white drop-shadow-lg text-center">
                {generationStatus === 'removing_bg' ? 'Removing photo background...' : 'Replicate is painting...'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right Side: Controls */}
      <div className="w-full md:w-[450px] bg-black border-l border-white/10 p-8 flex flex-col overflow-y-auto">
        <AnimatePresence mode="wait">
          {step === 'input' ? (
            <motion.div
              key="input-panel"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div>
                <h3 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 mb-6">Choose Mode</h3>
                <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-xl">
                  <button
                    onClick={() => { setMode('text'); setResultImage(null); setUploadedImage(null); }}
                    className={`flex items-center justify-center gap-2 py-3 rounded-lg transition-all ${mode === 'text' ? 'bg-white text-black' : 'hover:bg-white/5'}`}
                  >
                    <Type className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Text</span>
                  </button>
                  <button
                    onClick={() => { setMode('image'); setResultImage(null); }}
                    className={`flex items-center justify-center gap-2 py-3 rounded-lg transition-all ${mode === 'image' ? 'bg-white text-black' : 'hover:bg-white/5'}`}
                  >
                    <Upload className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Image</span>
                  </button>
                </div>
              </div>

              {mode === 'image' && (
                <div className="space-y-4">
                  <h3 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500">Upload Reference</h3>
                  <div 
                    {...getRootProps()} 
                    className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer ${isDragActive ? 'border-neon-orange bg-neon-orange/5' : 'border-white/10 hover:border-white/20'}`}
                  >
                    <input {...getInputProps()} />
                    {uploadedImage ? (
                      <div className="relative w-full">
                        <img src={uploadedImage} className="w-full aspect-square object-cover rounded-lg" alt="Upload" />
                        <button onClick={(e) => { e.stopPropagation(); setUploadedImage(null); }} className="absolute top-2 right-2 p-2 bg-black/50 rounded-full hover:bg-black transition-colors">
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-gray-500 mb-4" />
                        <p className="text-xs text-gray-500 text-center font-mono uppercase tracking-widest">Drag & drop or click to upload</p>
                      </>
                    )}
                  </div>

                  <div className="space-y-3 pt-2">
                    <h3 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 flex items-center gap-2">
                      <Sparkles className="w-3 h-3 text-neon-orange" /> Select Artistic Style
                    </h3>
                    <div className="space-y-2">
                      {PORTRAIT_MODELS.map((model) => (
                        <button
                          key={model.id}
                          onClick={() => setSelectedPortraitModel(model.id)}
                          className={`w-full text-left p-4 rounded-xl border transition-all ${selectedPortraitModel === model.id ? 'border-neon-orange bg-neon-orange/10 shadow-[0_0_15px_rgba(255,99,33,0.1)]' : 'border-white/10 hover:border-white/20 bg-white/5'}`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className={`text-xs font-bold uppercase tracking-wider ${selectedPortraitModel === model.id ? 'text-neon-orange' : 'text-white'}`}>
                              {model.label}
                            </span>
                            {selectedPortraitModel === model.id && <div className="w-2 h-2 bg-neon-orange rounded-full animate-pulse" />}
                          </div>
                          <p className="text-[10px] text-gray-500 font-mono tracking-tight">{model.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {mode === 'text' && (
                <div className="space-y-6">
                  <div className="bg-black/50 border border-white/10 p-1 rounded-xl flex">
                    <button 
                      onClick={() => setEngine('express')}
                      className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 transition-all ${engine === 'express' ? 'bg-neon-green text-black' : 'text-gray-500 hover:text-white'}`}
                    >
                      <Zap className="w-4 h-4" />
                      Express (Fast)
                    </button>
                    <button 
                      onClick={() => setEngine('pro')}
                      className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 transition-all ${engine === 'pro' ? 'bg-neon-orange text-black' : 'text-gray-500 hover:text-white'}`}
                    >
                      <Sparkles className="w-4 h-4" />
                      PRO (Flux AI)
                    </button>
                  </div>

                  <div>
                    <h3 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500 mb-3">Your Message</h3>
                    <input
                      type="text"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="TYPE SOMETHING..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-5 text-xl font-bold tracking-tight focus:outline-none focus:border-white transition-colors placeholder:opacity-20"
                    />
                  </div>
                  
                  <div className="space-y-2 pt-2">
                    <h3 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500">Artist Signature (Optional)</h3>
                    <input
                      type="text"
                      value={signature}
                      onChange={(e) => setSignature(e.target.value)}
                      placeholder="Your Name / Tag"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white transition-colors placeholder:opacity-20"
                    />
                  </div>
                </div>
              )}

              {/* STYLE PROFILE & ADVANCED SETTINGS - SOMENTE PARA TEXTO PRO */}
              {mode === 'text' && engine === 'pro' && (
                <>
                  <div className="space-y-4 pt-2 border-t border-white/5">
                    <h3 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500">Style Profile</h3>
                    <select 
                      value={selectedStyle} 
                      onChange={(e) => setSelectedStyle(e.target.value as GraffitiStyle)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm font-bold focus:outline-none focus:border-neon-orange transition-colors appearance-none cursor-pointer"
                    >
                      {STYLES.map(s => <option key={s.id} value={s.id} className="bg-black text-white">{s.label} - {s.description}</option>)}
                    </select>
                  </div>

                  <div className="space-y-3 pt-4">
                    <h3 className="text-xs font-mono uppercase tracking-[0.3em] text-neon-orange mb-2 flex items-center gap-2">
                      <Sparkles className="w-3 h-3" /> Advanced AI Settings
                    </h3>
                    
                    <details className="group border border-white/10 rounded-xl bg-white/5 overflow-hidden">
                      <summary className="px-4 py-3 cursor-pointer text-xs font-bold uppercase tracking-wider hover:bg-white/5 flex justify-between items-center bg-black/30">
                        Typography & Fill
                        <span className="text-gray-500 group-open:rotate-180 transition-transform">▼</span>
                      </summary>
                      <div className="p-4 grid grid-cols-2 gap-4 border-t border-white/10 bg-black/50">
                         <ParamSelect label="Fill" value={advParams.fill} setter={(v) => setAdvParams({...advParams, fill: v})} options={["Solid Color", "Gradient", "Texture", "Pattern", "Inner Glow", "Uneven Spray", "Chrome Effect"]} />
                         <ParamSelect label="Outline" value={advParams.outline} setter={(v) => setAdvParams({...advParams, outline: v})} options={["Simple", "Double / Triple", "Thick", "Contrasting Color", "Handmade (Shakey)", "Neon Outline"]} />
                         <div className="col-span-2">
                            <ParamSelect label="Colors" value={advParams.colors} setter={(v) => setAdvParams({...advParams, colors: v})} options={["Vibrant (Street)", "High Contrast", "Monochromatic", "Complementary", "Urban Neon", "Gritty / Dirty Tones"]} />
                         </div>
                      </div>
                    </details>

                    <details className="group border border-white/10 rounded-xl bg-white/5 overflow-hidden">
                      <summary className="px-4 py-3 cursor-pointer text-xs font-bold uppercase tracking-wider hover:bg-white/5 flex justify-between items-center bg-black/30">
                        Depth & Lighting
                        <span className="text-gray-500 group-open:rotate-180 transition-transform">▼</span>
                      </summary>
                      <div className="p-4 grid grid-cols-2 gap-4 border-t border-white/10 bg-black/50">
                        <ParamSelect label="Lighting" value={advParams.lighting} setter={(v) => setAdvParams({...advParams, lighting: v})} options={["None", "Hard Highlights", "Soft Ambient", "Neon Glow", "Directional Sun", "Studio Light"]} />
                        <ParamSelect label="Shadow" value={advParams.shadow} setter={(v) => setAdvParams({...advParams, shadow: v})} options={["None", "Sharp Drop", "Soft Cast", "Long Shadow", "Dark Glow"]} />
                        <div className="col-span-2">
                          <ParamSelect label="Depth (3D)" value={advParams.depth} setter={(v) => setAdvParams({...advParams, depth: v})} options={["None", "Extruded Block", "Layered Cutout", "Chiseled", "Puffy Bevel"]} />
                        </div>
                      </div>
                    </details>

                    <details className="group border border-white/10 rounded-xl bg-white/5 overflow-hidden">
                      <summary className="px-4 py-3 cursor-pointer text-xs font-bold uppercase tracking-wider hover:bg-white/5 flex justify-between items-center bg-black/30">
                        Spray FX & Details
                        <span className="text-gray-500 group-open:rotate-180 transition-transform">▼</span>
                      </summary>
                      <div className="p-4 grid grid-cols-2 gap-4 border-t border-white/10 bg-black/50">
                        <ParamSelect label="Spray Style" value={advParams.sprayFx} setter={(v) => setAdvParams({...advParams, sprayFx: v})} options={["None", "Fat Cap", "Skinny Cap", "Mist/Overspray", "Stencil Edge", "Rough Brush"]} />
                        <ParamSelect label="Dripping" value={advParams.dripping} setter={(v) => setAdvParams({...advParams, dripping: v})} options={["None", "Light Drips", "Heavy Bleeding", "Bottom Pool", "Splatter"]} />
                        <div className="col-span-2">
                          <ParamSelect label="Details" value={advParams.details} setter={(v) => setAdvParams({...advParams, details: v})} options={["None", "Cracks", "Halftone Dots", "Highlight Stars", "Bubbles", "Dirty Smudges"]} />
                        </div>
                      </div>
                    </details>
                  </div>
                </>
              )}

              {/* Botão de Geração Dinâmico */}
              {(mode === 'image' || (mode === 'text' && engine === 'pro')) && (
                <button
                  onClick={mode === 'text' ? handleGenerateGraffiti : handleManualGenerate}
                  disabled={isGenerating || (mode === 'text' && text.length < 2) || (mode === 'image' && !uploadedImage)}
                  className="w-full py-4 bg-neon-orange text-black font-bold uppercase tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(255,99,33,0.3)] disabled:opacity-50 disabled:grayscale mt-4"
                >
                  {isGenerating ? (
                    <span className="flex items-center justify-center gap-2">
                       <Loader2 className="w-4 h-4 animate-spin" />
                       <span>Painting...</span>
                    </span>
                  ) : (
                    <span>{mode === 'image' ? "Transform to AI Graffiti (PRO)" : "Generate AI Art"}</span>
                  )}
                </button>
              )}

              {mode === 'text' && engine === 'express' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 pt-4 border-t border-white/10"
                >
                  <h3 className="text-xs font-mono uppercase tracking-[0.3em] text-neon-green mb-2 flex items-center gap-2">
                    <Zap className="w-3 h-3" /> Express Canvas Settings
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-400">Typography Font</h4>
                      <select 
                        value={expressFont} 
                        onChange={(e) => setExpressFont(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-neon-green appearance-none cursor-pointer"
                        style={{ fontFamily: `"${expressFont}", sans-serif` }}
                      >
                        {EXPRESS_FONTS.map(f => (
                          <option key={f} value={f} style={{ fontFamily: `"${f}", sans-serif` }} className="bg-black text-white text-lg py-2">
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-400">Fill Color</h4>
                        <div className="flex bg-white/5 rounded-lg border border-white/10 p-1">
                          <input 
                            type="color" 
                            value={expressFill} 
                            onChange={(e) => setExpressFill(e.target.value)}
                            className="w-full h-8 rounded shrink-0 cursor-pointer bg-transparent border-0"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-400">Outline Color</h4>
                        <div className="flex bg-white/5 rounded-lg border border-white/10 p-1">
                          <input 
                            type="color" 
                            value={expressOutline} 
                            onChange={(e) => setExpressOutline(e.target.value)}
                            className="w-full h-8 rounded shrink-0 cursor-pointer bg-transparent border-0"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-400 flex justify-between">
                          <span>Outline Weight</span>
                          <span className="text-white">{expressOutlineWidth}px</span>
                        </h4>
                        <input
                          type="range"
                          min="0"
                          max="40"
                          value={expressOutlineWidth}
                          onChange={(e) => setExpressOutlineWidth(parseInt(e.target.value))}
                          className="w-full accent-neon-green"
                        />
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-400">Shadow FX</h4>
                        <select 
                          value={expressShadow} 
                          onChange={(e) => setExpressShadow(e.target.value as any)}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-neon-green appearance-none cursor-pointer"
                        >
                          <option value="None" className="bg-black text-white">None</option>
                          <option value="Drop" className="bg-black text-white">Drop Shadow</option>
                          <option value="Glow" className="bg-black text-white">Neon Glow</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-center mt-2 px-4 py-2 bg-neon-green/10 text-neon-green text-[10px] uppercase tracking-widest font-bold rounded-lg border border-neon-green/20">
                    Auto-generating preview on wall...
                  </div>
                </motion.div>
              )}

              {/* Controles Dinâmicos do Adesivo (Apenas visíveis APÓS geração) */}
              {graffitiOverlay && !resultImage && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-4 pt-4 border-t border-white/10"
                >
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-mono uppercase tracking-[0.3em] text-neon-green font-bold">Adjust Sticker</h3>
                    <span className="text-xs text-gray-500">{Math.round(graffitiScale * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.5"
                    step="0.05"
                    value={graffitiScale}
                    onChange={(e) => setGraffitiScale(parseFloat(e.target.value))}
                    className="w-full accent-neon-green hover:accent-neon-orange transition-colors"
                  />
                  <p className="text-[10px] text-gray-500 italic font-mono text-center">Drag image on the wall to position</p>
                </motion.div>
              )}

              {errorMsg && (
                <div className="p-4 border border-red-500/30 bg-red-500/10 rounded-xl text-red-400 text-xs font-mono">
                  <span className="font-bold">Generation Failed: </span> 
                  {errorMsg}
                </div>
              )}

              {/* NFT Ownership Badge */}
              {mintResult && (
                <div className="flex items-center gap-2 p-3 bg-neon-green/10 border border-neon-green/20 rounded-xl">
                  <Shield className="w-4 h-4 text-neon-green" />
                  <span className="text-xs text-neon-green font-bold uppercase tracking-wider">Spot Owned — NFT #{mintResult.tokenId}</span>
                </div>
              )}

              <button
                onClick={handleFinalize}
                disabled={(!resultImage && !graffitiOverlay) || isGenerating || isSaving || checkingOwnership}
                className="w-full py-6 bg-neon-orange text-black rounded-2xl font-bold text-lg uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:grayscale disabled:hover:scale-100 flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(255,99,33,0.2)]"
              >
                {isSaving || checkingOwnership ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                <span>
                  {checkingOwnership ? 'Checking Spot...' : import.meta.env.VITE_INK_CONTRACT_ADDRESS && !mintResult && !spotOwnership.isClaimed ? 'Buy Spot & Publish' : 'Finalize & Publish'}
                </span>
              </button>

              {/* Spot Purchase Modal */}
              <SpotPurchaseModal
                lat={location.lat}
                lng={location.lng}
                locationName={location.name}
                isOpen={showPurchaseModal}
                onClose={() => setShowPurchaseModal(false)}
                onSuccess={handleMintSuccess}
              />
            </motion.div>
          ) : (
            <motion.div
              key="result-panel"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8 h-full flex flex-col"
            >
              <div className="flex-1 space-y-8">
                <div className="p-6 bg-neon-green/10 border border-neon-green/20 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 bg-neon-green rounded-full flex items-center justify-center">
                    <Check className="w-6 h-6 text-black" />
                  </div>
                  <div>
                    <h3 className="text-neon-green font-bold uppercase tracking-wider">Masterpiece Published</h3>
                    <p className="text-xs text-gray-400">Everyone searching this location will now see your work!</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-500">Details</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between py-3 border-b border-white/5">
                      <span className="text-xs text-gray-500 uppercase tracking-widest">Style</span>
                      <span className="text-xs font-bold uppercase">{selectedStyle}</span>
                    </div>
                    <div className="flex justify-between py-3 border-b border-white/5">
                      <span className="text-xs text-gray-500 uppercase tracking-widest">Coordinates</span>
                      <span className="text-[10px] font-mono">{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between py-3 border-b border-white/5">
                      <span className="text-xs text-gray-500 uppercase tracking-widest">Method</span>
                      <span className="text-xs font-bold uppercase">{mode === 'text' ? 'Typography' : 'Visual Reference'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => setShowViralModal(true)}
                  className="w-full py-5 bg-gradient-to-r from-neon-orange to-purple-500 text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(255,99,33,0.3)] flex items-center justify-center gap-3"
                >
                  <Sparkles className="w-5 h-5" />
                  Share Before & After
                </button>
                <button
                  onClick={() => {
                    setStep('input');
                  }}
                  className="w-full py-5 border border-white/20 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-white/5 transition-all"
                >
                  Edit Piece
                </button>
                <button
                  onClick={onBack}
                  className="w-full py-5 bg-white text-black rounded-2xl font-bold text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Find Another Wall
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Viral Exporter Modal */}
      {resultImage && (
        <ViralExporterModal
          isOpen={showViralModal}
          onClose={() => setShowViralModal(false)}
          beforeImage={wallImage}
          afterImage={resultImage}
          lat={location.lat}
          lng={location.lng}
          locationName={location.name}
        />
      )}
    </div>
  );
};

export default GraffitiCreator;
