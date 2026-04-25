/**
 * compositeWithCanvas — Composição de grafite sobre parede via Canvas 2D
 * Extraído do GraffitiCreator.tsx — sem mudança funcional
 */

export const compositeWithCanvas = (
  wallSrc: string, 
  graffitiSrc: string,
  gPos: { x: number, y: number, scale: number },
  blendMode: 'multiply' | 'source-over' = 'multiply',
  applyMask: boolean = false
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const wallImg = new Image();
    wallImg.crossOrigin = "Anonymous";

    wallImg.onload = () => {
      const graffitiImg = new Image();
      graffitiImg.crossOrigin = "Anonymous";

      graffitiImg.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("No canvas context"));

        // Utilizamos o tamanho real da imagem de fundo base
        canvas.width = wallImg.width;
        canvas.height = wallImg.height;

        // Base
        ctx.globalCompositeOperation = "source-over";
        ctx.drawImage(wallImg, 0, 0, canvas.width, canvas.height);

        // Adesivo (Multiply remove fundo branco, source-over respeita o PNG)
        ctx.globalCompositeOperation = blendMode;

        // Ajuste de Perspectiva: O Adesivo gerado é desenhado no Canvas
        // A escala base (1.0) equivale a 80% da tela. Aumentado ou reduzido pelo scale.
        const baseGWidth = canvas.width * 0.8;
        const gAspect = graffitiImg.width / graffitiImg.height;
        const baseGHeight = baseGWidth / gAspect;
        
        const gWidth = baseGWidth * gPos.scale;
        const gHeight = baseGHeight * gPos.scale;

        // gPos.x e gPos.y capturados do Framer Motion precisam ser mapeados 
        // proporcionalmente para a resolução nativa da imagem de fundo
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const motionScaleFactor = (canvas.width / 800); 

        const finalX = centerX + (gPos.x * motionScaleFactor) - (gWidth / 2);
        const finalY = centerY + (gPos.y * motionScaleFactor) - (gHeight / 2);

        if (applyMask) {
          // Offscreen canvas com feather sutil nas bordas (5%)
          // Construímos a máscara em canvases separados para evitar o bug
          // de destination-in sequencial (que destrói pixels progressivamente)
          const feather = Math.min(gWidth, gHeight) * 0.05;
          
          // 1. Máscara vertical (top/bottom feather) — canvas separado, source-over
          const vMask = document.createElement("canvas");
          vMask.width = gWidth;
          vMask.height = gHeight;
          const vctx = vMask.getContext("2d");
          if (vctx) {
            // Top fade
            const topG = vctx.createLinearGradient(0, 0, 0, feather);
            topG.addColorStop(0, "rgba(0,0,0,0)");
            topG.addColorStop(1, "rgba(0,0,0,1)");
            vctx.fillStyle = topG;
            vctx.fillRect(0, 0, gWidth, feather);
            // Centro opaco
            vctx.fillStyle = "rgba(0,0,0,1)";
            vctx.fillRect(0, feather, gWidth, gHeight - feather * 2);
            // Bottom fade
            const botG = vctx.createLinearGradient(0, gHeight - feather, 0, gHeight);
            botG.addColorStop(0, "rgba(0,0,0,1)");
            botG.addColorStop(1, "rgba(0,0,0,0)");
            vctx.fillStyle = botG;
            vctx.fillRect(0, gHeight - feather, gWidth, feather);
            
            // 2. Máscara horizontal (left/right feather) — outro canvas separado
            const hMask = document.createElement("canvas");
            hMask.width = gWidth;
            hMask.height = gHeight;
            const hctx = hMask.getContext("2d");
            if (hctx) {
              const leftG = hctx.createLinearGradient(0, 0, feather, 0);
              leftG.addColorStop(0, "rgba(0,0,0,0)");
              leftG.addColorStop(1, "rgba(0,0,0,1)");
              hctx.fillStyle = leftG;
              hctx.fillRect(0, 0, feather, gHeight);
              hctx.fillStyle = "rgba(0,0,0,1)";
              hctx.fillRect(feather, 0, gWidth - feather * 2, gHeight);
              const rightG = hctx.createLinearGradient(gWidth - feather, 0, gWidth, 0);
              rightG.addColorStop(0, "rgba(0,0,0,1)");
              rightG.addColorStop(1, "rgba(0,0,0,0)");
              hctx.fillStyle = rightG;
              hctx.fillRect(gWidth - feather, 0, feather, gHeight);
              
              // 3. Combinar V + H — multiplicar as duas máscaras com destination-in
              vctx.globalCompositeOperation = "destination-in";
              vctx.drawImage(hMask, 0, 0);
            }
            
            // 4. Aplicar a máscara combinada ao grafite
            const masked = document.createElement("canvas");
            masked.width = gWidth;
            masked.height = gHeight;
            const maskedCtx = masked.getContext("2d");
            if (maskedCtx) {
              maskedCtx.drawImage(graffitiImg, 0, 0, gWidth, gHeight);
              maskedCtx.globalCompositeOperation = "destination-in";
              maskedCtx.drawImage(vMask, 0, 0);
              ctx.drawImage(masked, finalX, finalY, gWidth, gHeight);
            } else {
              ctx.drawImage(graffitiImg, finalX, finalY, gWidth, gHeight);
            }
          } else {
            ctx.drawImage(graffitiImg, finalX, finalY, gWidth, gHeight);
          }
        } else {
          ctx.drawImage(graffitiImg, finalX, finalY, gWidth, gHeight);
        }

        resolve(canvas.toDataURL("image/jpeg", 0.9));
      };
      
      graffitiImg.onerror = () => reject(new Error("Failed to load Graphic from AI"));
      graffitiImg.src = graffitiSrc;
    };

    wallImg.onerror = () => reject(new Error("Failed to load Background Wall"));
    wallImg.src = wallSrc;
  });
};
