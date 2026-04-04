# 🏗️ UrbanLayer: Architecture Design

## Visão Geral

**UrbanLayer** é uma plataforma web que permite usuários criarem grafites em locais reais ao redor do mundo usando IA, e mintar esses spots como NFTs na blockchain **INK (Kraken L2)**.

## Stack

| Camada | Tecnologia | Versão |
|---|---|---|
| Frontend | React | 19.x |
| Build | Vite | 6.x |
| Styling | TailwindCSS | 4.x |
| Animations | Motion (Framer) | 12.x |
| Mapa 3D | Mapbox GL | 3.x |
| Street View | Google Maps JS API | latest |
| IA Graffiti | Replicate (SDXL / Flux) | 1.x |
| Backend/DB | Supabase | 2.x |
| Blockchain | INK (Kraken L2 - OP Stack) | - |
| Smart Contract | Solidity (ERC-721) | 0.8.20+ |
| Web3 | ethers.js | 6.x |
| Deploy | Vercel | - |
| VCS | GitHub | - |

## Fluxo do Usuário

```
1. Globo 3D (Mapbox)
   └─> Click progressivo: País → Estado → Cidade → Rua
       └─> 2. Street Explorer (Google Street View interativo)
           ├─> Navegar pelas ruas em 3D
           ├─> Ver spots NFT de outros usuários (bloqueados)
           └─> "Target Surface" (selecionar parede)
               └─> 3. Spot Purchase (Web3)
                   ├─> Calcular tier do local (PricingEngine)
                   ├─> Conectar wallet (MetaMask/Kraken Wallet)
                   ├─> Pagar ETH na rede INK
                   ├─> Mint NFT ERC-721
                   └─> 4. Graffiti Creator
                       ├─> Express Mode (Canvas local, instantâneo)
                       ├─> PRO Mode (Replicate AI, alta qualidade)
                       ├─> Posicionar adesivo na parede (drag & drop)
                       └─> Finalize & Publish
                           ├─> Pagar fee de grafite
                           ├─> Salvar no Supabase
                           └─> Atualizar metadata do NFT
```

## Estrutura de Arquivos

```
src/
├── App.tsx                      # Root (com WalletProvider)
├── AIService.ts                 # Replicate / Canvas generation
├── main.tsx                     # Entry point
├── types.ts                     # TypeScript types
├── index.css                    # TailwindCSS styles
├── vite-env.d.ts
├── components/
│   ├── Globe.tsx                # Globo 3D (Mapbox)
│   ├── StreetExplorer.tsx       # Google Street View interativo
│   ├── GraffitiCreator.tsx      # Editor de grafite
│   ├── WalletButton.tsx         # [NEW] Conexão de wallet
│   └── SpotPurchaseModal.tsx    # [NEW] Modal de compra NFT
├── services/
│   ├── Web3Service.ts           # [NEW] Interação blockchain
│   ├── PricingEngine.ts         # [NEW] Cálculo de tier/preço
│   └── InkNetworkConfig.ts     # [NEW] Config da rede INK
├── contexts/
│   └── Web3Context.tsx          # [NEW] Estado global da wallet
└── lib/
    ├── supabase.ts              # Cliente Supabase
    └── utils.ts                 # Utilitários
```

## Configuração de Rede INK

| | Testnet (Sepolia) | Mainnet |
|---|---|---|
| Chain ID | 763373 | 57073 |
| RPC | https://rpc-gel-sepolia.inkonchain.com/ | https://rpc-gel.inkonchain.com |
| Explorer | https://explorer-sepolia.inkonchain.com | https://explorer.inkonchain.com |
| Currency | ETH | ETH |

## Variáveis de Ambiente

```env
# Blockchain
VITE_INK_CONTRACT_ADDRESS=       # Endereço do contrato deployado
VITE_INK_CHAIN_ID=763373         # 763373 (testnet) ou 57073 (mainnet)
VITE_USE_TESTNET=true            # Toggle testnet/mainnet

# Existentes (não alterar)
VITE_REPLICATE_API_TOKEN=
VITE_GOOGLE_MAPS_API_KEY=
VITE_MAPBOX_TOKEN=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Supabase (Projeto: cgogdddxzscmfajeplti)

Região: us-west-2 | Status: ACTIVE_HEALTHY | Postgres 17

### Tabelas Existentes (NÃO ALTERAR ESTRUTURA)
- `profiles` — Perfis FotoFome
- `generations` — Histórico IA FotoFome
- `credit_transactions` — Créditos FotoFome

### Tabelas do Graffiti
- `graffitis` — Grafites publicados (expandida com colunas blockchain)
- `spot_claims` — [NEW] Registro de ownership de spots
- `graffiti_payments` — [NEW] Log de pagamentos

## Smart Contract (INK L2)

- Padrão: ERC-721 + ERC-2981 (royalties)
- Biblioteca: OpenZeppelin
- Deploy: Remix IDE (manual pelo desenvolvedor)
- Royalties: 5% para a plataforma
