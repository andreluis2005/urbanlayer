# 📝 Lições Aprendidas — UrbanLayer: Lessons Learned

A running list of technical challenges, architectural decisions, and key learnings from the **UrbanLayer** project.

## Formato
Cada lição segue o padrão:
- **Data**: quando ocorreu
- **Problema**: o que deu errado
- **Causa**: por que aconteceu
- **Solução**: como resolvemos
- **Regra**: o que nunca devemos repetir

---

## 2026-04-01: Glitch de renderização de retratos IA
- **Problema**: Imagens geradas pela IA apresentavam artefatos visuais (solarização/inversão de cores) ao serem exibidas no overlay
- **Causa**: CSS `mix-blend-mode` + GPU compositing do navegador causava conflito com o canvas WebGL do Google Maps
- **Solução**: Pré-composição via Canvas 2D offscreen usando `multiply` blend mode
- **Regra**: NUNCA confiar em CSS blend modes para composição de imagens sobre WebGL. Sempre usar Canvas 2D.

## 2026-04-01: Replicate SDXL — base64 vs URL
- **Problema**: Imagens enviadas via base64 para o Replicate SDXL resultavam em qualidade muito baixa
- **Causa**: O corpo do request ficava enorme e o SDK truncava silenciosamente
- **Solução**: Usar Supabase Storage para upload e passar apenas a URL pública para o Replicate
- **Regra**: SEMPRE usar URLs públicas para enviar imagens para APIs de IA, nunca base64 direto.

## 2026-04-02: Preservação de funcionalidade
- **Problema**: Risco de quebrar funcionalidades existentes ao adicionar blockchain
- **Causa**: Acoplamento excessivo entre componentes
- **Solução**: Abordagem aditiva — criar novos serviços/componentes e integrar via composição
- **Regra**: NUNCA alterar assinaturas de funções existentes. Sempre ADICIONAR, nunca SUBSTITUIR.

## 2026-04-02: Google Places API — custo
- **Problema**: Google Places API Nearby Search custa $32 por 1000 requests
- **Causa**: Pricing engine planejado com chamadas frequentes
- **Solução**: Usar OpenStreetMap Overpass API (gratuito) + heurísticas de geocoding
- **Regra**: SEMPRE priorizar APIs gratuitas. Google apenas para o essencial (Street View/Maps).
