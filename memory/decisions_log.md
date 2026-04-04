# 📝 UrbanLayer — Log de Decisões

## Formato
- **Data**: quando
- **Decisão**: o que foi decidido
- **Razão**: por que
- **Alternativas rejeitadas**: o que NÃO fizemos
- **Status**: pendente / aprovado / implementado

---

## 2026-04-04: Evolução incremental, não reescrita
- **Decisão**: Evoluir o código existente em 5 fases, nunca reescrever do zero
- **Razão**: Projeto funcional com ~3,450 LOC. Reescrever é desperdício e risco
- **Alternativas rejeitadas**: Rewrite em Next.js, migrar para framework diferente
- **Status**: ✅ Aprovado

## 2026-04-04: Backend proxy para Replicate (Fase 1)
- **Decisão**: Criar servidor Express mínimo para proxiar chamadas ao Replicate
- **Razão**: Token Replicate está exposto no frontend como VITE_REPLICATE_API_TOKEN
- **Alternativas rejeitadas**: Supabase Edge Functions (complexidade desnecessária)
- **Status**: 🔲 Pendente aprovação

## 2026-04-04: Decomposição do GraffitiCreator (Fase 2)
- **Decisão**: Dividir 1078 LOC em ~12 sub-componentes + 2 hooks custom
- **Razão**: Arquivo monolítico impossível de manter e testar
- **Alternativas rejeitadas**: Manter monolítico (insustentável)
- **Status**: 🔲 Pendente aprovação

## 2026-04-04: Multi-chain Ink + Base (Fase 3)
- **Decisão**: Deploy do mesmo contrato em Ink e Base, com ERC-8021 na Base
- **Razão**: Maximiza chances nos dois hackathons simultaneamente
- **Alternativas rejeitadas**: Ink-only (perde oportunidade Base)
- **Status**: 🔲 Pendente aprovação do usuário

## 2026-04-04: Overpass API para pricing (já implementado)
- **Decisão**: Usar OpenStreetMap Overpass API ao invés de Google Places
- **Razão**: Google Places custa $32/1000 requests. Overpass é gratuito
- **Status**: ✅ Implementado

## 2026-04-04: Canvas 2D para composição (já implementado)
- **Decisão**: Pré-composição via Canvas 2D, nunca CSS blend modes
- **Razão**: CSS blend + WebGL do Google Maps causa glitches
- **Status**: ✅ Implementado

## 2026-04-01: Dual Engine (Express + PRO)
- **Decisão**: Dois modos de geração — Canvas local (Express) e IA (PRO)
- **Razão**: Express é instantâneo e gratuito. PRO é lento e custa ~$0.025/run
- **Status**: ✅ Implementado
