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

    // Tiers de preco
    uint256[5] public tierPrices;

    // Mapeamento de coordenadas para token
    // Coordenadas sao int256 com 6 casas decimais (ex: 40758000 = 40.758000)
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

        // Tiers de preco (em wei)
        tierPrices[0] = 0.0003 ether;  // Bronze
        tierPrices[1] = 0.0008 ether;  // Silver
        tierPrices[2] = 0.003 ether;   // Gold
        tierPrices[3] = 0.01 ether;    // Diamond
        tierPrices[4] = 0.05 ether;    // Legendary

        // Configurar royalties: 5% para a plataforma
        _setDefaultRoyalty(_platformWallet, 500); // 500 = 5%

        _nextTokenId = 1; // Token IDs comecam em 1
    }

    // ======== Core Functions ========

    /**
     * @notice Mint a new spot NFT
     * @param lat Latitude com 6 casas decimais (ex: 40758000 para 40.758000)
     * @param lng Longitude com 6 casas decimais
     * @param locationName Nome legivel do local
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
