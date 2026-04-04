# 🏗️ UrbanLayer — Arquitetura Alvo v2

## Visão
Plataforma escalável e modular de cultura urbana onchain, multi-chain (Ink + Base).

## Arquitetura Atual vs Alvo

```
ATUAL (Monolítico)                      ALVO (Modular)
─────────────────                       ──────────────
App.tsx                                 App.tsx (Router)
├── Globe.tsx                           ├── pages/
├── StreetExplorer.tsx                  │   ├── GlobePage.tsx
├── GraffitiCreator.tsx (1078 LOC!)     │   ├── ExplorerPage.tsx
├── SpotPurchaseModal.tsx               │   ├── CreatorPage.tsx
├── WalletButton.tsx                    │   ├── GalleryPage.tsx
│                                       │   └── ProfilePage.tsx
├── services/ (3 files)                 │
│   ├── Web3Service.ts                  ├── components/
│   ├── PricingEngine.ts                │   ├── globe/Globe.tsx
│   └── InkNetworkConfig.ts            │   ├── explorer/StreetExplorer.tsx
│                                       │   ├── creator/ (12 sub-componentes)
├── AIService.ts                        │   ├── wallet/WalletButton.tsx
├── contexts/Web3Context.tsx            │   ├── nft/SpotPurchaseModal.tsx
└── lib/ (2 files)                      │   └── shared/ (UI components)
                                        │
                                        ├── services/
                                        │   ├── ai/
                                        │   │   ├── AIRouter.ts
                                        │   │   ├── ReplicateProvider.ts
                                        │   │   ├── GeminiProvider.ts
                                        │   │   └── PromptTemplates.ts
                                        │   ├── web3/
                                        │   │   ├── Web3Service.ts
                                        │   │   ├── ERC8021Service.ts
                                        │   │   └── NetworkConfig.ts
                                        │   ├── pricing/PricingEngine.ts
                                        │   └── social/SocialService.ts
                                        │
                                        ├── hooks/
                                        │   ├── useGraffitiGenerator.ts
                                        │   ├── useSpotOwnership.ts
                                        │   └── useGeolocation.ts
                                        │
                                        ├── contexts/
                                        │   └── Web3Context.tsx
                                        │
                                        └── lib/ (utils, supabase)

BACKEND (NOVO)
──────────────
server/
├── index.ts              # Express server
├── routes/
│   ├── replicate.ts      # Proxy para Replicate API
│   └── health.ts         # Health check
└── middleware/
    └── rateLimit.ts      # Rate limiting
```

## Princípios Arquiteturais
1. **Nenhum componente > 300 LOC** — decompor em sub-componentes
2. **Lógica de negócio em hooks/services** — componentes são apenas UI
3. **API keys NUNCA no frontend** — tudo via backend proxy
4. **Multi-chain por abstração** — NetworkConfig seleciona chain
5. **IA via router** — provedor é detalhe de implementação
6. **Feature flags** — novas features podem ser desativadas

## Stack Alvo
| Camada | Atual | Alvo |
|---|---|---|
| Frontend | React 19 + Vite 6 | ✅ Manter |
| Styling | TailwindCSS v4 | ✅ Manter |
| Routing | Nenhum | React Router v7 |
| State | useState/Context | ✅ Manter (simples) |
| Backend | Nenhum | Express (proxy only) |
| AI | Replicate direto | AIRouter (Replicate + Gemini) |
| Blockchain | Ink only | Multi-chain (Ink + Base) |
| Auth | Nenhum | Wallet-based (futuro) |
