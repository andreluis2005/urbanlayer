# UrbanLayer 🎨🌍

**UrbanLayer** is an AI-powered platform integrated with the Kraken Ink blockchain that allows users to create graffiti art on real-world locations using Google Street View and mint them as NFTs.

## Key Features
- **Global Canvas**: Explore the world via an interactive 3D globe.
- **AI Graffiti Engine**: Generate high-quality graffiti portraits and text styles using SDXL.
- **Street View Integration**: Place your art accurately on real walls and facades.
- **Ink Network (Kraken L2)**: Own your "spot" on the map by minting location-based NFTs.
- **Pricing Engine**: Dynamic pricing based on location popularity and tier.

## Getting Started

### Prerequisites
- Node.js (v18+)
- MetaMask (connected to Ink Network)

### Installation
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with your API keys:
   - `VITE_REPLICATE_API_TOKEN`
   - `VITE_GOOGLE_MAPS_API_KEY`
   - `VITE_MAPBOX_TOKEN`
   - `VITE_INK_CONTRACT_ADDRESS`
4. Run the development server:
   ```bash
   npm run dev
   ```

## Technology Stack
- **Frontend**: React, TypeScript, TailwindCSS, Framer Motion.
- **AI**: Replicate (SDXL, Background Removal).
- **Maps**: Mapbox GL (Globe), Google Street View API.
- **Web3**: ethers.js v6, Ink Network (Kraken L2).
