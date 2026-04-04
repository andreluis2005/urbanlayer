# 🔧 UrbanLayer — Tech Stack

## Frontend
| Tecnologia | Versão | Uso |
|---|---|---|
| React | 19.x | UI framework |
| Vite | 6.x | Build tool + dev server |
| TypeScript | 5.8.x | Type safety |
| TailwindCSS | 4.x (via @tailwindcss/vite) | Styling |
| Motion (Framer) | 12.x | Animações |
| Lucide React | 0.546.x | Ícones |
| clsx + tailwind-merge | latest | Class utilities |
| react-dropzone | 15.x | Upload de imagens |
| canvas-confetti | 1.9.x | Efeitos celebração |
| D3.js | 7.x | (importado mas não usado ativamente) |

## Mapas & Geolocalização
| Tecnologia | Uso |
|---|---|
| Mapbox GL JS | Globo 3D interativo (projection: 'globe') |
| Google Maps JS API | Street View Panorama interativo |
| Google Street View Static API | Captura de imagem da parede |
| Nominatim (OSM) | Geocoding reverso (gratuito) |
| Overpass API (OSM) | Contagem de POIs para pricing (gratuito) |

## IA / Machine Learning
| Tecnologia | Modelo | Uso |
|---|---|---|
| Replicate SDK | black-forest-labs/flux-schnell | Geração de grafite texto |
| Replicate SDK | stability-ai/sdxl (vários fine-tunes) | Retratos grafite (img2img) |
| Replicate SDK | recraft-ai/recraft-remove-background | Remoção de fundo |
| Canvas 2D API | — | Composição local, Express mode, keying |
| Gemini (Google) | @google/genai | Instalado mas NÃO usado atualmente |

## Blockchain / Web3
| Tecnologia | Versão | Uso |
|---|---|---|
| ethers.js | 6.x | Interação com contratos |
| Solidity | 0.8.20 | Smart contract ERC-721 |
| OpenZeppelin | latest | ERC721, ERC2981, Ownable |
| MetaMask | — | Wallet provider |
| Ink Network (Kraken L2) | — | Chain principal |

## Backend / Infra
| Tecnologia | Uso |
|---|---|
| Supabase | Database (Postgres 17) + Storage |
| Express | Instalado mas sem servidor dedicado |
| Vite Proxy | Proxy dev para Replicate API (bypass CORS) |

## Variáveis de Ambiente Necessárias
```env
# AI
VITE_REPLICATE_API_TOKEN=        # Token Replicate (⚠️ MOVER PARA BACKEND)
GEMINI_API_KEY=                  # Chave Gemini (não usado ainda)

# Maps
VITE_GOOGLE_MAPS_API_KEY=        # Google Maps + Street View
VITE_MAPBOX_TOKEN=               # Mapbox GL Globe

# Database
VITE_SUPABASE_URL=               # URL do projeto Supabase
VITE_SUPABASE_ANON_KEY=          # Chave anônima Supabase

# Blockchain
VITE_INK_CONTRACT_ADDRESS=       # Endereço do contrato deployado
VITE_USE_TESTNET=true            # Toggle testnet/mainnet
```
