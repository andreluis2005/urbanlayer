# ⛓️ Smart Contract — GraffitiSpot.sol

## Visão Geral

Contrato ERC-721 para ownership de spots geográficos na rede INK (Kraken L2).
Cada NFT representa um local (lat/lng) onde o dono pode criar grafites.

## Endereços Deployados

| Rede | Endereço | Explorer |
|---|---|---|
| Ink Sepolia | `0x44AA57E2e4079D2cC680F468e0d53E2Ad362137F` | [Ver no Explorer](https://explorer-sepolia.inkonchain.com/address/0x44AA57E2e4079D2cC680F468e0d53E2Ad362137F) |
| Ink Mainnet | *a ser preenchido* | [Explorer](https://explorer.inkonchain.com) |

---

## Passo a Passo — Deploy via Remix IDE

### 1. Acessar o Remix IDE
- Abra [https://remix.ethereum.org](https://remix.ethereum.org) no navegador

### 2. Criar o arquivo do contrato
- No painel esquerdo, clique em **File Explorer**
- Clique no ícone de **novo arquivo** (📄)
- Nomeie como: `GraffitiSpot.sol`
- **Cole o código do contrato** (seção abaixo)

### 3. Compilar 
- Clique na aba **Solidity Compiler** (ícone de "S") no painel esquerdo
- Selecione o compilador versão: **0.8.20** ou superior
- Marque **"Enable optimization"** com 200 runs
- Clique em **"Compile GraffitiSpot.sol"**
- Verifique que NÃO há erros (warnings são ok)

### 4. Configurar MetaMask para Ink Sepolia
Antes de deployar, adicione a rede Ink Sepolia ao MetaMask:
- **Network Name**: Ink Sepolia
- **RPC URL**: `https://rpc-gel-sepolia.inkonchain.com/`
- **Chain ID**: `763373`
- **Currency Symbol**: ETH
- **Block Explorer**: `https://explorer-sepolia.inkonchain.com`

### 5. Deploy
- Clique na aba **Deploy & Run Transactions** (ícone de seta ↗️)
- Em **Environment**: selecione **"Injected Provider - MetaMask"**
- Confirme que MetaMask está na rede **Ink Sepolia**
- Em **Contract**: selecione `GraffitiSpot`
- Configure os parâmetros do constructor:
  - `_platformWallet`: Seu endereço de wallet (para receber royalties e pagamentos)
- Clique em **"Deploy"**
- MetaMask pedirá confirmação → **Confirme a transação**
- Aguarde a confirmação (geralmente 2-5 segundos na Ink)

### 6. Copiar o endereço do contrato
- Após deploy, o contrato aparecerá em "Deployed Contracts" no Remix
- Copie o endereço (algo como `0x1234...5678`)
- Cole no `.env` do projeto: `VITE_INK_CONTRACT_ADDRESS=0x1234...5678`
- Reinicie o servidor de desenvolvimento (`npm run dev`)

### 7. Verificar no Explorer (opcional mas recomendado)
- Acesse: `https://explorer-sepolia.inkonchain.com/address/SEU_ENDERECO`
- Clique em "Verify & Publish" para verificar o código-fonte

---

## Código do Contrato

> **IMPORTANTE**: Antes de colar no Remix, certifique-se de que o compilador está na versão 0.8.20+.
> O Remix fará download automático das dependências do OpenZeppelin.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title GraffitiSpot
 * @notice NFT representing ownership of a geographic spot for graffiti art
 * @dev ERC-721 + ERC-2981 (royalties) on INK L2 (Kraken)
 */
contract GraffitiSpot is ERC721, ERC721URIStorage, ERC2981, Ownable {
    using Strings for uint256;

    // ======== Storage ========

    uint256 private _nextTokenId;
    address public platformWallet;

    // Tiers de preço
    uint256[5] public tierPrices;

    // Mapeamento de coordenadas para token
    // Coordenadas são int256 com 6 casas decimais (ex: 40758000 = 40.758000)
    mapping(bytes32 => uint256) private _coordToTokenId;
    mapping(bytes32 => bool) private _coordClaimed;

    // Metadata por token
    struct SpotData {
        int256 lat;
        int256 lng;
        string locationName;
        uint8 tier;
        uint256 pricePaid;
        uint256 mintedAt;
    }
    mapping(uint256 => SpotData) public spots;

    // ======== Events ========

    event SpotMinted(
        uint256 indexed tokenId,
        address indexed owner,
        int256 lat,
        int256 lng,
        string locationName,
        uint8 tier,
        uint256 price
    );

    event GraffitiUpdated(uint256 indexed tokenId, string newUri);

    // ======== Constructor ========

    constructor(address _platformWallet) ERC721("Graffiti The World", "GTW") Ownable(msg.sender) {
        platformWallet = _platformWallet;

        // Tiers de preço (em wei)
        tierPrices[0] = 0.0003 ether;  // Bronze
        tierPrices[1] = 0.0008 ether;  // Silver
        tierPrices[2] = 0.003 ether;   // Gold
        tierPrices[3] = 0.01 ether;    // Diamond
        tierPrices[4] = 0.05 ether;    // Legendary

        // Configurar royalties: 5% para a plataforma
        _setDefaultRoyalty(_platformWallet, 500); // 500 = 5%

        _nextTokenId = 1; // Token IDs começam em 1
    }

    // ======== Core Functions ========

    /**
     * @notice Mint a new spot NFT
     * @param lat Latitude com 6 casas decimais (ex: 40758000 para 40.758000)
     * @param lng Longitude com 6 casas decimais
     * @param locationName Nome legível do local
     * @param tier 0=Bronze, 1=Silver, 2=Gold, 3=Diamond, 4=Legendary
     */
    function mintSpot(
        int256 lat,
        int256 lng,
        string calldata locationName,
        uint8 tier
    ) external payable returns (uint256) {
        require(tier < 5, "Invalid tier");
        require(msg.value >= tierPrices[tier], "Insufficient payment");

        bytes32 coordHash = _coordKey(lat, lng);
        require(!_coordClaimed[coordHash], "Spot already claimed");

        uint256 tokenId = _nextTokenId++;

        // Registrar claim
        _coordClaimed[coordHash] = true;
        _coordToTokenId[coordHash] = tokenId;

        // Salvar metadata
        spots[tokenId] = SpotData({
            lat: lat,
            lng: lng,
            locationName: locationName,
            tier: tier,
            pricePaid: msg.value,
            mintedAt: block.timestamp
        });

        // Mint NFT
        _safeMint(msg.sender, tokenId);

        // Enviar pagamento para a plataforma
        (bool sent, ) = platformWallet.call{value: msg.value}("");
        require(sent, "Payment transfer failed");

        emit SpotMinted(tokenId, msg.sender, lat, lng, locationName, tier, msg.value);

        return tokenId;
    }

    /**
     * @notice Update the graffiti artwork URI for a spot you own
     */
    function updateGraffitiURI(uint256 tokenId, string calldata uri) external {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        _setTokenURI(tokenId, uri);
        emit GraffitiUpdated(tokenId, uri);
    }

    // ======== View Functions ========

    function isSpotClaimed(int256 lat, int256 lng) external view returns (bool) {
        return _coordClaimed[_coordKey(lat, lng)];
    }

    function getSpotOwner(int256 lat, int256 lng) external view returns (address) {
        bytes32 key = _coordKey(lat, lng);
        require(_coordClaimed[key], "Spot not claimed");
        return ownerOf(_coordToTokenId[key]);
    }

    function getSpotTokenId(int256 lat, int256 lng) external view returns (uint256) {
        bytes32 key = _coordKey(lat, lng);
        require(_coordClaimed[key], "Spot not claimed");
        return _coordToTokenId[key];
    }

    function getSpotPrice(uint8 tier) external view returns (uint256) {
        require(tier < 5, "Invalid tier");
        return tierPrices[tier];
    }

    // ======== Admin Functions ========

    function updateTierPrice(uint8 tier, uint256 newPrice) external onlyOwner {
        require(tier < 5, "Invalid tier");
        tierPrices[tier] = newPrice;
    }

    function updatePlatformWallet(address newWallet) external onlyOwner {
        platformWallet = newWallet;
        _setDefaultRoyalty(newWallet, 500);
    }

    // ======== Internal ========

    function _coordKey(int256 lat, int256 lng) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(lat, lng));
    }

    // ======== Overrides (Required) ========

    function tokenURI(uint256 tokenId)
        public view override(ERC721, ERC721URIStorage) returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, ERC721URIStorage, ERC2981) returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
```

---

## ABI Simplificada (usada no frontend)

```json
[
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function balanceOf(address owner) view returns (uint256)",
  "function getSpotPrice(uint8 tier) view returns (uint256)",
  "function isSpotClaimed(int256 lat, int256 lng) view returns (bool)",
  "function getSpotOwner(int256 lat, int256 lng) view returns (address)",
  "function getSpotTokenId(int256 lat, int256 lng) view returns (uint256)",
  "function mintSpot(int256 lat, int256 lng, string locationName, uint8 tier) payable returns (uint256)",
  "function updateGraffitiURI(uint256 tokenId, string uri) external",
  "event SpotMinted(uint256 indexed tokenId, address indexed owner, int256 lat, int256 lng, string locationName, uint8 tier, uint256 price)",
  "event GraffitiUpdated(uint256 indexed tokenId, string newUri)"
]
```
