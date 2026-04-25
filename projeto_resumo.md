# Resumo do Projeto: UrbanLayer 🌍🎨

## Visão Geral
**UrbanLayer** (anteriormente "Graffiti the World") é uma plataforma inovadora que mescla Arte Urbana, Inteligência Artificial (IA) e Web3 (Blockchain). A plataforma permite que os usuários criem intervenções artísticas (grafites) em locais históricos e muros do mundo real através do Google Street View, utilizando IA para a geração da arte, e posteriormente transformem essas "posses" digitais de espaços físicos em NFTs na blockchain da **Kraken (Ink L2 network)**.

## Arquitetura e Tecnologias
O projeto possui uma arquitetura moderna dividida entre Frontend, Integração de Mapas, IA e Smart Contracts:

### 1. Frontend
*   **Frameworks:** React (com TypeScript), Vite.
*   **Estilização e Animação:** TailwindCSS e Framer Motion.

### 2. Mapas e Geolocalização
*   **Visão Global:** Integração com **Mapbox GL** para renderização de um globo 3D interativo, permitindo explorar o aspecto global do projeto.
*   **Visão Local:** Integração avançada com a API do **Google Street View** para visualização imersiva dos muros e fachadas através do ponto de vista do "nível da rua", gerando o canvas ideal.

### 3. Motor de Inteligência Artificial (AI Engine)
A estratégia de IA é fortemente baseada no ecosistema do **Replicate**:
*   **Text-to-Graffiti (Lettering):** Utiliza o modelo `flux-schnell` para geração rápida de expressões textuais artísticas urbanas.
*   **Image-to-Graffiti (Retratos/Murais):** Possui pipeline de img2img baseada no `SDXL` suportando diferentes embeddings/modelos rodando estilos específicos (Cultura Urbana, Stencil Banksy, Murais, Basquiat).
*   **Pré-processamento:** Utliza `recraft-remove-background` para isolar imagens/fotos do usuário antes da composição.
*   *Planejamento (AI Router/Multi-agente):* Conforme documentos recentes (`ai_strategy.md`), existe um planejamento estratégico em andamento de atuar com **Google Gemini** para análises contextuais mais avançadas das imagens dos muros, moderação e orquestração de sistema Multi-Agente na experiência criativa.

### 4. Web3 e Smart Contracts
*   **Rede:** Desenvolvido na **Ink**, L2 Network patrocinada pela Kraken (Ethereum layer 2).
*   **Contrato:** `GraffitiSpot.sol` - Um contrato ERC-721 (Padrão NFT) estendido com a EIP-2981 (Royalties Padrão de Mercado), escrito em Solidity (^0.8.20).
*   **Lógica de Negócio Dinâmica On-chain:**
    *   Mapeamento geográfico usando hashes imutáveis das coordenadas espaciais lat/long com precisão restrita (6 casas decimais).
    *   Tiers de preços dinâmicos baseados no valor agregado do local (Bronze, Silver, Gold, Diamond, Legendary) para os "Spots".
    *   Sistema base com `5%` de pagamento de royalties sobre cada spot voltando à wallet da plataforma.
    *   Integração do frontend baseada em SDK Web3 via `ethers.js v6`.

## Fluxo Principal de Uso (User Journey)
1.  **Exploração Espacial:** O usuário navega instintivamente pelo globo 3D e cruza o mundo até as coordenadas desejadas.
2.  **Imersão:** Ao chegar perto o suficiente, a perspectiva se altera do render Mapbox em pássaro para o frame real imersivo panorâmico do Google Street View focado na alvenaria do muro.
3.  **Criação:** O usuário manipula os controladores e integra-se à IA da interface para requisitar criações textuais únicas ou reinterpretações visuais em estilos predefinidos ou upload.
4.  **Composição Canvas:** As informações renderizadas pelo Node de Inference do Replicate são mescladas (multiplicadas visualmente para remover blocos opacos na sobreposição) via HTML5 Canvas.
5.  **Claim & Minting Web3:** Adquirindo o visual final, a conversão é submetida a uma transação com custo baseado no Tier para registro permanente global através do seu endereço no MetaMask injetado localmente para o protocolo INK.
