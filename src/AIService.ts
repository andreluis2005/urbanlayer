import Replicate from "replicate";
import { GraffitiStyle } from "./types";
import { AdvancedParams } from "./components/GraffitiCreator";
import { supabase } from "./lib/supabase";

// Auth vazio — o token é injetado server-side pelo proxy
// Local dev: Vite proxy (vite.config.ts) adiciona Authorization header
// Produção: Vercel serverless function (api/replicate/) adiciona Authorization header
const replicate = new Replicate({
  auth: "", // NÃO colocar token aqui — vai para o bundle público!
  baseUrl: `${window.location.origin}/api/replicate/v1`,
});

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

// API Key configurada (log removido por segurança)

/**
 * Retorna a URL da imagem real do local via Google Street View Static API
 */
export const getStreetViewUrl = (lat: number, lng: number, heading: number = 0, pitch: number = 0): string => {
  const size = '1280x800';
  const fov = '90'; 
  
  // Coordenadas formatadas para o padrão esperado pelo Google
  const url = `https://maps.googleapis.com/maps/api/streetview?size=${size}&location=${lat.toFixed(6)},${lng.toFixed(6)}&fov=${fov}&heading=${Math.round(heading)}&pitch=${Math.round(pitch)}&key=${GOOGLE_API_KEY}`;
  
  console.log("📍 Street View URL:", url);
  return url;
};

/**
 * Verifica se o Google possui cobertura de fotos para as coordenadas fornecidas
 */
export async function checkStreetViewCoverage(lat: number, lng: number): Promise<boolean> {
  try {
    const url = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat.toFixed(6)},${lng.toFixed(6)}&key=${GOOGLE_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    
    console.log("📊 Google API Response Status:", data.status);
    
    if (data.status === 'OK') {
      return true;
    } else if (data.status === 'ZERO_RESULTS') {
      console.warn("ℹ️ Sem cobertura de Street View para estas coordenadas.");
      return false;
    } else {
      // Registrar erro específico (ex: REQUEST_DENIED, OVER_QUERY_LIMIT)
      console.error("❌ Erro na Google Street View Metadata API:", data.status, data.error_message || "");
      return false;
    }
  } catch (error) {
    console.error("❌ Erro técnico ao contactar Google Metadata API:", error);
    return false;
  }
}

/**
 * Verifica se já existe um grafite salvo nestas coordenadas no Supabase
 */
export async function checkExistingGraffiti(lat: number, lng: number) {
  try {
    const { data, error } = await supabase
      .from('graffitis')
      .select('*')
      .eq('lat', lat)
      .eq('lng', lng)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error("Erro ao buscar grafite existente:", error);
    }
    
    return data;
  } catch (error) {
    console.error("Exceção ao buscar grafite:", error);
    return null;
  }
}

/**
 * Faz upload de um arquivo ou blob para o Supabase Storage e retorna a URL pública.
 * Isso é essencial para que a IA (Replicate) receba um link limpo e não um Base64 corrompido.
 */
export async function uploadToSupabase(file: Blob, bucketName: string = 'graffitis'): Promise<string> {
  // Detectar tipo: PNG (transparente) ou JPEG
  const isPng = file.type === 'image/png';
  const ext = isPng ? 'png' : 'jpg';
  const contentType = isPng ? 'image/png' : 'image/jpeg';
  const fileName = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
  
  const { error } = await supabase.storage
    .from(bucketName)
    .upload(fileName, file, {
      contentType,
      upsert: true
    });

  if (error) {
    console.error("Error uploading to Supabase Storage:", error);
    throw new Error(`Falha no upload para o Storage: ${error.message}. Certifique-se de que o bucket '${bucketName}' existe e é público.`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from(bucketName)
    .getPublicUrl(fileName);

  return publicUrl;
}

/**
 * Salva a obra final no banco de dados para que outros vejam
 */
export async function saveGraffitiToWorld(data: {
  lat: number;
  lng: number;
  address: string;
  imageUrl: string;
  graffitiUrl?: string;
  artistUserId?: string;
  heading?: number;
  pitch?: number;
}) {
  try {
    const insertData: Record<string, any> = {
      lat: data.lat,
      lng: data.lng,
      address: data.address,
      image_url: data.imageUrl,
    };

    if (data.graffitiUrl) {
      insertData.graffiti_url = data.graffitiUrl;
    }

    if (data.artistUserId) {
      insertData.artist_user_id = data.artistUserId;
    }

    if (data.heading !== undefined && data.heading !== null) {
      insertData.heading = data.heading;
    }

    if (data.pitch !== undefined && data.pitch !== null) {
      insertData.pitch = data.pitch;
    }

    const { error } = await supabase
      .from('graffitis')
      .insert([insertData]);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Erro ao salvar grafite no mundo:", error);
    return false;
  }
}

/**
 * Gera a imagem do grafite isolada usando Replicate SDXL.
 */
export async function generateGraffitiImage(
  prompt: string, 
  style: GraffitiStyle,
  advParams: AdvancedParams,
  signature: string = "",
  imageInput: string | Blob | null = null,
  portraitModel: string = "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b"
): Promise<string> {
  try {
    const styleDescriptions: Record<GraffitiStyle, string> = {
      wildstyle: "complex and interlocking letters, wildstyle graffiti technique, sharp edges",
      bubble: "rounded, inflated bubble-style letters, soft highlights, 3D effect",
      block: "straight, heavy, blocky, bold highly legible letters",
      stencil: "sharp stencil-cut style, high contrast, clean urban edges",
      mural: "artistic mural typography, creative integration of shapes",
      throwie: "quick throw-up style, simple bubble shapes, two-color fill",
      tag: "fast calligraphic handstyle, street tagging style, marker strokes",
      "3d": "3D letters with intense depth, perspective and shiny highlights",
      calligraffiti: "mix of traditional calligraphy and urban graffiti strokes"
    };

    let basePrompt = "";
    
    if (prompt) {
      basePrompt = `Professional urban graffiti art on a PURE WHITE background. 
The graffiti text spells the word EXACTLY "${prompt}". 
Style: ${styleDescriptions[style]}. 
Colors: ${advParams.colors}.
Fill and Outline: ${advParams.fill !== 'Solid Color' ? advParams.fill + ' fill' : 'solid color fill'}, ${advParams.outline !== 'Simple' ? advParams.outline + ' outline' : 'simple outline'}.
3D Effects & Depth: ${advParams.depth !== 'None' ? advParams.depth + ' effect' : 'flat 2D'}.
Lighting & Shadows: ${advParams.lighting !== 'None' ? advParams.lighting : 'neutral lighting'}, ${advParams.shadow !== 'None' ? advParams.shadow : 'no shadow'}.
Spray Details: ${advParams.sprayFx !== 'None' ? advParams.sprayFx : 'clean spray'}, ${advParams.dripping !== 'None' ? advParams.dripping + ' dripping' : 'no drips'}, ${advParams.details !== 'None' ? advParams.details : 'clean artwork'}.
Realistic spray paint texture, authentic street art feel.
ONLY the graffiti artwork on the white background. No other words, no background wall, no ground, no frame.`;
    } else if (imageInput) {
      let stylePrefix = "Ultra-realistic urban graffiti mural";
      if (portraitModel.includes('clonesy')) stylePrefix = "Banksy-style stencil street art with sharp spray cutouts";
      else if (portraitModel.includes('murals')) stylePrefix = "Large-scale artistic urban mural with weathered textures";
      else if (portraitModel.includes('basquiat')) stylePrefix = "Jean-Michel Basquiat expressive street art style, raw and colorful strokes";

      basePrompt = `${stylePrefix} on a PURE WHITE background, featuring a spray-painted portrait based on the provided reference image.

The portrait must maintain strong facial resemblance while being adapted into authentic street art style, with expressive spray paint techniques and artistic interpretation.

No text, no words, no letters, no typography anywhere in the image.

Highly detailed graffiti portrait with:
- realistic spray paint texture
- soft and hard edges created by spray
- color blending and layered paint
- highlights and shadows for depth
- subtle artistic exaggeration while preserving identity

Spray paint effects:
- overspray (paint mist around edges)
- paint splatter and droplets
- dripping paint (natural gravity effect)
- uneven fill and realistic imperfections

Lighting and composition:
- natural lighting
- realistic shadows on the person (none on background)
- shallow depth of field

Ultra-detailed, photorealistic, 8k, high texture fidelity, cinematic realism`;
    }

    const input: any = {
      prompt: basePrompt,
      num_inference_steps: 4, 
      disable_safety_checker: true 
    };

    let model: any = "black-forest-labs/flux-schnell";

    if (imageInput && !prompt) {
       model = portraitModel;
       
       // Preparar a imagem de entrada
       let imageValue: string = "";
       if (typeof imageInput === 'string') {
         imageValue = imageInput; // URL ou data URI — SDK lida automaticamente
       } else if (imageInput instanceof Blob) {
         // Converter Blob para data URI
         imageValue = await new Promise<string>((resolve, reject) => {
           const reader = new FileReader();
           reader.onloadend = () => resolve(reader.result as string);
           reader.onerror = reject;
           reader.readAsDataURL(imageInput);
         });
       } else {
         throw new Error("Formato de imagem não suportado.");
       }
       
       console.log("📤 Enviando imagem para SDXL img2img...");
       console.log("📐 Tamanho do data URI:", Math.round(imageValue.length / 1024), "KB");

       input.image = imageValue;
       // Forçar resolução alta (SDXL nativo)
       input.width = 1024;
       input.height = 1024;
       // Voltando para parâmetros de transformação autêntica (Street Art)
       input.prompt_strength = 0.75; 
       input.num_inference_steps = 35;
       input.guidance_scale = 9.0; 
       input.negative_prompt = "text, words, letters, signature, logo, watermark, typography, cartoon, clean digital art, artificial face, blurred face, blurry, messy colors, naked, nudity";
       input.disable_safety_checker = true;
       
       console.log("⚙️ Replicate SDXL Params:", { ...input, image: "(data URI " + Math.round(imageValue.length / 1024) + "KB)" });
    }

    console.log(`🎨 Creating prediction with ${model}...`);
    
    const prediction = await replicate.predictions.create({
      version: model.includes(':') ? model.split(':')[1] : undefined,
      model: !model.includes(':') ? model : undefined,
      input: input
    });

    console.log(`⏳ Waiting for prediction ${prediction.id} to finish...`);
    
    let result = await replicate.predictions.get(prediction.id);
    let attempts = 0;
    const maxAttempts = 60; 

    while (result.status !== "succeeded" && result.status !== "failed" && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      result = await replicate.predictions.get(prediction.id);
      attempts++;
    }

    if (result.status === "succeeded") {
      const output = result.output;
      const resultUrl = Array.isArray(output) ? output[0] : output;
      console.log("✅ Generation Succeeded!");
      console.log("🖼️ RAW AI Output URL (abra no navegador para verificar):", resultUrl);
      return resultUrl;
    } else {
      console.error("❌ Generation failed:", result.error || "Unknown error");
      throw new Error(String(result.error || "AI generation failed after timeout."));
    }
  } catch (error: any) {
    console.error("Error generating graffiti:", error);
    throw new Error(error.response?.data?.detail || error.message || "Failed to generate graffiti.");
  }
}

/**
 * Remove o fundo da imagem do usuário e coloca sobre um fundo branco sólido.
 * Utiliza o modelo recraft-ai/recraft-remove-background.
 */
export async function removeImageBackground(imageInput: string | Blob): Promise<string> {
  try {
    console.log("✂️ Iniciando remoção de fundo...");

    let imageValue: string = "";
    if (typeof imageInput === 'string') {
      imageValue = imageInput;
    } else if (imageInput instanceof Blob) {
      imageValue = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(imageInput);
      });
    }

    const model = "recraft-ai/recraft-remove-background";
    
    const prediction = await replicate.predictions.create({
      model: model,
      input: { image: imageValue }
    });

    console.log(`⏳ Aguardando remoção de fundo ${prediction.id}...`);
    
    let result = await replicate.predictions.get(prediction.id);
    let attempts = 0;
    while (result.status !== "succeeded" && result.status !== "failed" && attempts < 60) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      result = await replicate.predictions.get(prediction.id);
      attempts++;
    }

    if (result.status === "succeeded") {
      const transparentImageUrl = Array.isArray(result.output) ? result.output[0] : result.output;
      console.log("✅ Fundo removido! Aplicando fundo branco sólido...");
      
      // Processa para garantir fundo branco (melhor para o modelo de grafite)
      return await processCleanImage(transparentImageUrl);
    } else {
      throw new Error("Falha ao remover fundo da imagem.");
    }
  } catch (error: any) {
    console.error("Erro ao remover fundo:", error);
    throw new Error(error.message || "Falha na remoção de fundo.");
  }
}

/**
 * Garante que a imagem extraída esteja em um canvas limpo e exportada como PNG transparente.
 */
async function processCleanImage(imageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject("Não foi possível criar contexto do canvas.");
      
      // Mantemos o tamanho original para não perder qualidade prematuramente
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Fundo Branco Sólido
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Desenha a imagem extraída
      ctx.drawImage(img, 0, 0);
      
      // Exporta como JPEG (o fundo branco é embutido no arquivo)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      resolve(dataUrl);
    };
    img.onerror = () => reject("Erro ao processar imagem transparente.");
    img.src = imageUrl;
  });
}

/**
 * Processa a imagem da IA localmente (Canvas) para criar uma versão local segura.
 * Para modo 'image' (retrato), converte a imagem cross-origin para um Blob URL local
 * para evitar problemas de CORS ao exibir no overlay arrastável.
 */
export async function processGraffitiMask(imageUrl: string, mode: 'text' | 'image', signature?: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(imageUrl);
      
      canvas.width = img.width;
      canvas.height = img.height;
      
      ctx.drawImage(img, 0, 0);
      
      // Remover o fundo branco criado pela IA.
      if (mode === 'text' || mode === 'image') {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        let maxX = 0;
        let maxY = 0;
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i+1];
          const b = data[i+2];
          
          // Verifica o quão branco o pixel é
          const brightness = (r + g + b) / 3;
          
          if (brightness > 230) {
            // Fade suave anti-aliasing para pixels quase brancos nas bordas
            let alpha = 255;
            if (brightness > 250) {
               alpha = 0; // Branco puro: totalmente transparente
            } else {
               // pixels entre 230 e 250 recebem transparência proporcional
               alpha = Math.floor((250 - brightness) * (255 / 20)); 
            }
            data[i+3] = alpha;
          }
          
          // Registrar limites da imagem (Bounding Box do grafite)
          // usando os pixels que sobraram opacos/semi-opacos
          if (data[i+3] > 10) {
            const pixelIndex = i / 4;
            const x = pixelIndex % canvas.width;
            const y = Math.floor(pixelIndex / canvas.width);
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
        
        ctx.putImageData(imageData, 0, 0);

        // Renderizar Assinatura pós-keying mais próxima à arte (apenas se existir)
        if (signature && signature.trim()) {
          ctx.font = `50px "Sedgwick Ave Display", cursive, sans-serif`;
          ctx.textAlign = 'right';
          
          // Posicionar colado no limite direito e inferior que o desenho toca, com uma folga mínima/sobreposição
          if (maxX === 0) maxX = canvas.width - 40;
          if (maxY === 0) maxY = canvas.height - 80;
          
          ctx.textBaseline = 'bottom';
          let sigX = maxX - 10; // Entra 10px em cima do contorno da direita
          let sigY = maxY + 5;  // Fica quase alinhado com a base máxima, subindo a partir daqui
          
          // Garantir que a assinatura não saia para fora do Canvas
          sigX = Math.min(sigX, canvas.width - 15);
          sigY = Math.min(sigY, canvas.height - 15);
          
          const sprayColor = '#000000';
          
          // Overspray halo (Soft & misty)
          ctx.shadowColor = sprayColor;
          ctx.shadowBlur = 15;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          ctx.fillStyle = sprayColor;
          ctx.globalAlpha = 0.4;
          ctx.fillText(signature, sigX, sigY); 
          ctx.fillText(signature, sigX, sigY); // Double pass for deeper mist
          
          // Core line (Thin & sharper)
          ctx.globalAlpha = 1.0;
          ctx.shadowBlur = 4;
          ctx.fillText(signature, sigX, sigY);
          
          // Reset properties
          ctx.globalAlpha = 1.0;
          ctx.shadowBlur = 0;
        }
      } 
      
      canvas.toBlob((blob) => {
        if (blob) {
          console.log(`✅ Background removed (${mode})! Imagem convertida para blob local:`, blob.size, "bytes");
          resolve(URL.createObjectURL(blob));
        } else {
          console.warn("⚠️ Falha ao converter para blob, usando URL original");
          resolve(imageUrl);
        }
      }, 'image/png');
    };
    img.onerror = () => {
      console.warn("⚠️ Falha ao carregar imagem cross-origin, usando URL original:", imageUrl);
      resolve(imageUrl);
    };
    img.src = imageUrl;
  });
}
