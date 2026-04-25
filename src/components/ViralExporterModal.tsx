import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Loader2, Instagram, Facebook, Send, Share2 } from 'lucide-react';
import { formatAddress } from '../services/Web3Service';

interface ViralExporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  beforeImage: string;
  afterImage: string;
  lat: number;
  lng: number;
  locationName: string;
}

export default function ViralExporterModal({
  isOpen,
  onClose,
  beforeImage,
  afterImage,
  lat,
  lng,
  locationName
}: ViralExporterModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportedUrl, setExportedUrl] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isOpen) {
      setExportedUrl(null);
      generateViralImage();
    }
  }, [isOpen, beforeImage, afterImage]);

  const generateViralImage = async () => {
    setIsGenerating(true);
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Instagram Reels / Stories format (1080x1920)
      const CANVAS_W = 1080;
      const CANVAS_H = 1920;
      canvas.width = CANVAS_W;
      canvas.height = CANVAS_H;

      // Preencher fundo com preto
      ctx.fillStyle = '#0A0A0A';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Função auxiliar para carregar imagem
      const loadImage = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'Anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('Falha ao carregar imagem para exportação'));
          img.src = src;
        });
      };

      const [imgBefore, imgAfter] = await Promise.all([
        loadImage(beforeImage),
        loadImage(afterImage)
      ]);

      // Calculando alturas (dividindo a tela, deixando espaço para o rodapé)
      // Rodapé: 220px, Resto: 1700px. Dividido por 2 = 850px para cada foto.
      const HEADER_H = 100;
      const PHOTO_H = 800;
      const DIVIDER = 20;

      // Função auxiliar para desenhar imagem com "cover"
      const drawImageCover = (img: HTMLImageElement, x: number, y: number, w: number, h: number) => {
        const aspectCanvas = w / h;
        const aspectImg = img.width / img.height;
        let sWidth = img.width;
        let sHeight = img.height;
        let sx = 0;
        let sy = 0;

        if (aspectImg > aspectCanvas) {
          // Imagem mais larga que o canvas
          sWidth = img.height * aspectCanvas;
          sx = (img.width - sWidth) / 2;
        } else {
          // Imagem mais alta que o canvas
          sHeight = img.width / aspectCanvas;
          sy = (img.height - sHeight) / 2;
        }

        ctx.drawImage(img, sx, sy, sWidth, sHeight, x, y, w, h);
      };

      // Header Text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 50px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('URBAN LAYER', CANVAS_W / 2, HEADER_H / 2);

      // Foto ANTES (Before)
      const topY = HEADER_H;
      drawImageCover(imgBefore, 0, topY, CANVAS_W, PHOTO_H);
      
      // Tag ANTES
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(40, topY + 40, 220, 70);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 36px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BEFORE', 150, topY + 75);

      // Foto DEPOIS (After)
      const bottomY = HEADER_H + PHOTO_H + DIVIDER;
      drawImageCover(imgAfter, 0, bottomY, CANVAS_W, PHOTO_H);

      // Tag DEPOIS
      ctx.fillStyle = 'rgba(255, 99, 33, 0.9)'; // Neon orange
      ctx.fillRect(40, bottomY + 40, 200, 70);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 36px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('AFTER', 140, bottomY + 75);

      // Rodapé (Footer)
      const footerY = bottomY + PHOTO_H;
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, footerY, CANVAS_W, CANVAS_H - footerY);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 45px "Inter", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(locationName.toUpperCase(), 50, footerY + 60);

      ctx.fillStyle = '#888888';
      ctx.font = '35px "Inter", sans-serif';
      ctx.fillText(`LAT: ${lat.toFixed(6)} | LNG: ${lng.toFixed(6)}`, 50, footerY + 120);

      // Convert to Image
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      setExportedUrl(dataUrl);

    } catch (error) {
      console.error('Error generating viral image:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!exportedUrl) return;
    const link = document.createElement('a');
    link.href = exportedUrl;
    link.download = `urbanlayer_viral_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSocialShare = async (platform: string) => {
    if (!exportedUrl) return;

    try {
      // Tentar usar a Web Share API nativa (funciona bem em Mobile)
      if (navigator.share) {
        // Converter Base64 para Blob para compartilhar o arquivo
        const res = await fetch(exportedUrl);
        const blob = await res.blob();
        const file = new File([blob], 'urbanlayer_graffiti.jpg', { type: 'image/jpeg' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'UrbanLayer Graffiti',
            text: `Acabei de dominar um espaço em ${locationName}! Veja meu antes e depois na UrbanLayer.`,
            files: [file]
          });
          return; // Se funcionou, paramos por aqui
        }
      }

      // Fallback para Desktop: Baixa a imagem e avisa o usuário
      handleDownload();
      setShareMessage(`Imagem baixada! Abra o ${platform} para postar.`);
      setTimeout(() => setShareMessage(null), 4000);

    } catch (error) {
      console.log('Compartilhamento cancelado ou falhou', error);
      // Fallback silencioso baixando a imagem
      handleDownload();
      setShareMessage(`Imagem salva. Pronta para postar no ${platform}!`);
      setTimeout(() => setShareMessage(null), 4000);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-[#0A0A0A] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-white/5">
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-neon-orange to-purple-500 bg-clip-text text-transparent uppercase tracking-wider">
                Export & Share
              </h2>
              <p className="text-xs text-gray-400 mt-1">Ready for Stories & Reels</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center gap-6">
            
            {/* Hidden Canvas used for rendering */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Preview Area */}
            <div className="w-full max-w-[250px] aspect-[9/16] rounded-xl overflow-hidden bg-black border border-white/10 relative shadow-[0_0_30px_rgba(255,99,33,0.15)]">
              {isGenerating ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
                  <Loader2 className="w-8 h-8 text-neon-orange animate-spin mb-4" />
                  <p className="text-xs text-gray-400 uppercase tracking-widest font-mono">Rendering Engine...</p>
                </div>
              ) : exportedUrl ? (
                <img src={exportedUrl} alt="Viral Preview" className="w-full h-full object-contain" />
              ) : null}
            </div>

            {/* Social Proof & Share Buttons */}
            <div className="text-center space-y-3 w-full">
              <p className="text-sm font-medium">Download the image and share on your socials to claim your territory globally!</p>
              
              <div className="flex justify-center gap-6 pt-2">
                <button 
                  onClick={() => handleSocialShare('Instagram')}
                  className="flex flex-col items-center gap-1 text-gray-500 hover:text-pink-500 transition-colors group"
                >
                  <div className="p-3 bg-white/5 rounded-full group-hover:bg-pink-500/10 transition-colors border border-transparent group-hover:border-pink-500/30">
                    <Instagram className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider">Insta</span>
                </button>

                <button 
                  onClick={() => handleSocialShare('Facebook')}
                  className="flex flex-col items-center gap-1 text-gray-500 hover:text-blue-500 transition-colors group"
                >
                  <div className="p-3 bg-white/5 rounded-full group-hover:bg-blue-500/10 transition-colors border border-transparent group-hover:border-blue-500/30">
                    <Facebook className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider">Face</span>
                </button>

                <button 
                  onClick={() => handleSocialShare('Farcaster')}
                  className="flex flex-col items-center gap-1 text-gray-500 hover:text-purple-500 transition-colors group"
                >
                  <div className="p-3 bg-white/5 rounded-full group-hover:bg-purple-500/10 transition-colors border border-transparent group-hover:border-purple-500/30">
                    <Send className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider">Farcaster</span>
                </button>

                <button 
                  onClick={() => handleSocialShare('TikTok')}
                  className="flex flex-col items-center gap-1 text-gray-500 hover:text-cyan-500 transition-colors group"
                >
                  <div className="p-3 bg-white/5 rounded-full group-hover:bg-cyan-500/10 transition-colors border border-transparent group-hover:border-cyan-500/30">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider">TikTok</span>
                </button>
              </div>

              {/* Share Toast Message */}
              <AnimatePresence>
                {shareMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-xs text-neon-green font-bold bg-neon-green/10 py-2 px-4 rounded-full border border-neon-green/20 inline-block mt-2"
                  >
                    {shareMessage}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-white/5 bg-white/5">
            <button
              onClick={handleDownload}
              disabled={isGenerating || !exportedUrl}
              className="w-full py-4 bg-neon-orange text-black rounded-xl font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(255,99,33,0.2)]"
            >
              <Download className="w-5 h-5" />
              Download Full Image
            </button>
            <p className="text-[10px] text-gray-500 text-center mt-3 font-mono">
              High resolution 1080x1920 JPG (9:16)
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
