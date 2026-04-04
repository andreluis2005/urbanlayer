# 📋 Changelog — Graffiti The World

## [Unreleased] — 2026-04-02

### Added
- Documentação persistente em `docs/` (ARCHITECTURE, LESSONS_LEARNED, CHANGELOG, DATABASE_SCHEMA, SMART_CONTRACT, PRICING_ENGINE)
- Schema Supabase expandido: colunas blockchain na tabela `graffitis`
- Nova tabela `spot_claims` para registro de ownership NFT
- Nova tabela `graffiti_payments` para log de pagamentos
- Smart Contract ERC-721 `GraffitiSpot.sol` para INK L2
- Web3Service.ts para integração blockchain
- PricingEngine.ts para cálculo dinâmico de tiers
- WalletButton.tsx para conexão de wallet
- SpotPurchaseModal.tsx para compra de spots

### Changed
- StreetExplorer.tsx — visualização de spots NFT de outros usuários
- GraffitiCreator.tsx — fluxo de pagamento obrigatório antes de publicar
- App.tsx — WalletProvider context global

### Dependencies
- ethers.js ^6.x (NEW)

---

## [1.0.0] — 2026-03-31 to 2026-04-01

### Core Features
- Globo 3D interativo (Mapbox GL) com zoom progressivo
- Street View interativo (Google Maps API) com navegação real
- Graffiti Creator dual-engine: Express (Canvas) + PRO (Replicate AI)
- Sticker mode (drag & drop) para posicionamento de grafite
- Canvas composite com multiply blend mode
- Salvamento no Supabase (banco + storage)
