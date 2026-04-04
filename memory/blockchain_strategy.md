# ⛓️ UrbanLayer — Estratégia Blockchain

## Visão
NFTs de localização geográfica que dão ownership exclusivo de "paredes virtuais" ao redor do mundo. Cada NFT é um spot real (lat/lng) onde o dono pode criar e atualizar grafites.

## Estado Atual

### Smart Contract: GraffitiSpot.sol
- **Padrão**: ERC-721 + ERC-2981 (royalties 5%)
- **Biblioteca**: OpenZeppelin
- **Nome/Símbolo**: "Graffiti The World" / "GTW" ⚠️ DESATUALIZADO
- **Deploy**: Ink Sepolia `0x44AA57E2e4079D2cC680F468e0d53E2Ad362137F`
- **Functions**:
  - `mintSpot(lat, lng, locationName, tier)` — payable
  - `updateGraffitiURI(tokenId, uri)` — owner only
  - `isSpotClaimed(lat, lng)` — view
  - `getSpotOwner(lat, lng)` — view
  - `getSpotPrice(tier)` — view

### Tiers de Preço
| Tier | ETH | USD (~) | Descrição |
|---|---|---|---|
| 🥉 Bronze | 0.0003 | ~$0.90 | Áreas rurais e suburbanas |
| 🥈 Silver | 0.0008 | ~$2.40 | Cidades médias, ruas comerciais |
| 🥇 Gold | 0.003 | ~$9.00 | Centros de metrópoles |
| 💎 Diamond | 0.01 | ~$30.00 | Pontos turísticos |
| 👑 Legendary | 0.05 | ~$150.00 | Locais icônicos (Times Square, Eiffel) |

### Redes Suportadas
| Rede | Chain ID | Status |
|---|---|---|
| Ink Sepolia (testnet) | 763373 | ✅ Ativo |
| Ink Mainnet | 57073 | 🔲 Pendente deploy |
| Base Sepolia | 84532 | 🔲 Não integrado |
| Base Mainnet | 8453 | 🔲 Não integrado |

## Fluxo do Usuário Onchain
```
1. Usuário navega pelo globo → escolhe parede
2. PricingEngine calcula tier (Overpass API gratuita)
3. SpotPurchaseModal exibe preço + tier
4. Usuário conecta wallet (MetaMask)
5. App troca rede automaticamente (se necessário)
6. Usuário aprova transação → mintSpot()
7. NFT é mintado → usuário recebe ownership
8. Usuário cria grafite (Express ou PRO)
9. Grafite é salvo no Supabase
10. (Futuro) updateGraffitiURI() atualiza metadata do NFT
```

## Estratégia Multi-Chain (Alvo)

### Por que Multi-Chain?
- **Ink (Kraken L2)**: Hackathon Spark + comunidade Kraken
- **Base (Coinbase L2)**: Hackathon Builder Codes + Base ecosystem rewards + maior TVL

### ERC-8021 Builder Codes (Base)
Para participar do programa Base Builder Codes, precisamos:
1. **Registrar um código** em [base.dev](https://base.dev) (ex: "urbanlayer")
2. **Appendar data suffix** em todas as transações na Base:
```
dataSuffix = codesBytes + codesLength + schemaId + ercMarker
           = "urbanlayer" + 0x0A + 0x00 + 0x80218021802180218021802180218021
```
3. **Implementar no Web3Service**: ao chamar `mintSpot()`, adicionar suffix ao tx data

### Smart Contract v2: UrbanLayerSpot.sol
Para mainnet (Ink + Base), deployar novo contrato com:
- Nome: "UrbanLayer" / "URBAN"
- Mesma lógica do GraffitiSpot.sol
- Possível adição: `referralCode` para tracking de conversões

## Monetização
| Fonte | Mecanismo | Status |
|---|---|---|
| Venda de spots | Mint fee (0.0003 - 0.05 ETH) | ✅ Implementado |
| Royalties | 5% em revenda (ERC-2981) | ✅ No contrato |
| Marketplace | Listagem no OpenSea | ✅ URLs geradas |
| Builder Rewards | Base Builder Code rewards | 🔲 Pendente |
| Premium Features | Estilos exclusivos, IA avançada | 🔲 Futuro |

## Decisões Técnicas
1. **Coordenadas como int256** — 6 casas decimais (40.758000 → 40758000)
2. **Hash keccak256(lat, lng)** — mapping de coordenadas para tokenId
3. **Pagamento direto** — msg.value vai para platformWallet (sem escrow)
4. **Sem pause/emergency** — contrato simples (considerar adicionar para mainnet)
5. **Sem upgradability** — contrato imutável após deploy
