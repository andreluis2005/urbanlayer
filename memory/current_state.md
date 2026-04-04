# 🔍 UrbanLayer — Estado Atual (2026-04-04)

## Resumo
Aplicação React + Vite funcional que permite criar grafites com IA em locais reais (Google Street View) e mintá-los como NFTs na rede Ink (Kraken L2).

## Status Geral: 🟡 MVP Funcional — Precisa de Refatoração

---

## Estrutura Real do Projeto

```
urbanlayer/
├── .env                         # Chaves de API (NÃO commitar)
├── .env.example                 # Template (incompleto)
├── package.json                 # React 19, Vite 6, ethers 6
├── vite.config.ts               # Proxy Replicate, TailwindCSS v4
├── index.html                   # SPA entry
├── tsconfig.json                # TypeScript config
├── README.md                    # Documentação básica
├── metadata.json                # Metadata do projeto
│
├── contracts/
│   └── GraffitiSpot.sol         # ERC-721 + ERC-2981 (deployado Ink Sepolia)
│
├── docs/
│   ├── ARCHITECTURE.md          # Arquitetura documentada
│   ├── CHANGELOG.md             # Histórico de mudanças
│   ├── LESSONS_LEARNED.md       # Lições técnicas
│   └── SMART_CONTRACT.md        # Guia de deploy do contrato
│
├── src/
│   ├── App.tsx                  # Root: Web3Provider + state machine (globe/explorer/creator)
│   ├── main.tsx                 # Entry: StrictMode + CSS import
│   ├── AIService.ts             # Replicate SDK + Google Street View + Supabase Storage
│   ├── types.ts                 # GraffitiStyle, GraffitiSpot, UserState
│   ├── index.css                # TailwindCSS v4 + Google Fonts + design tokens
│   ├── vite-env.d.ts            # Vite type declarations
│   │
│   ├── components/
│   │   ├── Globe.tsx            # Globo 3D Mapbox com zoom progressivo
│   │   ├── Globe.d3.backup.tsx  # ❌ BACKUP — deve ser arquivado
│   │   ├── StreetExplorer.tsx   # Google Street View panorama interativo
│   │   ├── GraffitiCreator.tsx  # ⚠️ MONOLÍTICO (53KB, 1078 linhas)
│   │   ├── SpotPurchaseModal.tsx# Modal de compra NFT
│   │   └── WalletButton.tsx     # Botão de conexão de wallet
│   │
│   ├── services/
│   │   ├── Web3Service.ts       # ethers.js — wallet, mint, ownership
│   │   ├── PricingEngine.ts     # Overpass API — tier dinâmico por POIs
│   │   └── InkNetworkConfig.ts  # Ink Sepolia + Mainnet configs + tiers de preço
│   │
│   ├── contexts/
│   │   └── Web3Context.tsx      # Estado global da wallet (React Context)
│   │
│   └── lib/
│       ├── supabase.ts          # Cliente Supabase
│       └── utils.ts             # cn() — clsx + tailwind-merge
```

## Fluxo Principal (Funcional)
1. **Globe** → Globo 3D Mapbox. Click progressivo: País → Estado → Cidade → Rua
2. **StreetExplorer** → Google Street View interativo. Caminhar e mira crosshair
3. **GraffitiCreator** → Dual engine:
   - Express: Canvas local, instantâneo (tipografia)
   - PRO: Replicate AI (SDXL/Flux), alta qualidade
4. **SpotPurchaseModal** → Calcular tier → Conectar wallet → Mint NFT
5. **Finalize** → Composição canvas → Salvar Supabase

## Dependências Externas
| Serviço | Uso | Status |
|---|---|---|
| Mapbox GL | Globo 3D | ✅ Funcional |
| Google Maps/SV API | Street View + metadata | ✅ Funcional |
| Replicate | SDXL + Flux (geração IA) | ✅ Funcional |
| Supabase | Storage + Database | ✅ Configurado |
| Ink Sepolia | Smart Contract ERC-721 | ✅ Deployado |
| Nominatim/Overpass | Geocoding + POIs (gratuito) | ✅ Funcional |

## Riscos Críticos
1. 🔴 **API Key Replicate no frontend** — qualquer usuário pode extrair
2. 🔴 **GraffitiCreator monolítico** — 1078 linhas, impossível manter
3. 🟡 **Sem roteamento** — SPA sem deep links
4. 🟡 **Sem autenticação** — qualquer um pode publicar
5. 🟡 **Sem testes** — qualquer mudança pode quebrar
6. 🟡 **Smart contract com nome antigo** — "Graffiti The World" / "GTW"

## Performance do Bundle
- **Total LOC (src/)**: ~3,450 linhas
- **Maior arquivo**: GraffitiCreator.tsx (53KB, 1078 linhas)
- **Dependências pesadas**: mapbox-gl, d3, ethers, replicate, motion
