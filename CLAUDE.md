# Move NFT Studio - CLAUDE Development Guide

## Project Overview

Move NFT Studio is a comprehensive platform for creating and managing dynamic, composable NFTs on the Movement blockchain (Aptos-compatible). It enables creators to build advanced NFT collections with features like combination, evolution, and composability - capabilities that leverage the unique features of the Move programming language.

### Key Features
- **Dynamic NFTs**: Create collections with evolution capabilities based on custom rules
- **Composable NFTs**: Combine multiple NFTs to create new ones with defined combination rules
- **No-Code Interface**: Intuitive web interface for creators without technical expertise
- **Equipment System**: Define rules for equipment and attachments to NFTs
- **Mint Management**: Configurable allowlist and public mint phases with custom limits and fees

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** as build tool and dev server
- **React Router** for client-side routing
- **TailwindCSS** for styling with custom design system
- **shadcn/ui** component library built on Radix UI
- **@aptos-labs/wallet-adapter-react** for wallet integration
- **@tanstack/react-query** for state management and API calls

### Smart Contract
- **Move** programming language (Aptos framework)
- **Movement Labs** blockchain infrastructure
- Token standard: Aptos Token Objects framework
- Dependencies: TokenMinter contract for common functionalities

### Development Tools
- **TypeScript** with strict type checking
- **ESLint** for code linting
- **Prettier** for code formatting
- **PostCSS** with Autoprefixer
- **Node.js** scripts for Move contract management

## Project Structure

```
aptos-nft-studio/
├── frontend/                     # React frontend application
│   ├── components/              # Reusable UI components
│   │   ├── ui/                  # shadcn/ui components
│   │   ├── Header.tsx           # Navigation header
│   │   ├── WalletProvider.tsx   # Wallet connection provider
│   │   └── ...
│   ├── pages/                   # Route components
│   │   ├── Mint/               # Landing/minting page
│   │   ├── CreateCollection.tsx # Collection creation
│   │   ├── MyNFTs.tsx          # User's NFT portfolio
│   │   ├── Collections.tsx      # Browse collections
│   │   ├── CraftNFT.tsx        # NFT combination interface
│   │   └── EvolveNFT.tsx       # NFT evolution interface
│   ├── hooks/                   # Custom React hooks for blockchain data
│   ├── entry-functions/         # Move function call wrappers
│   ├── view-functions/          # Move view function wrappers
│   ├── utils/                   # Utility functions
│   ├── types/                   # TypeScript type definitions
│   ├── config.ts               # App configuration
│   └── constants.ts            # Environment constants
├── move/                        # Move smart contracts
│   ├── sources/
│   │   └── launchpad.move      # Main contract
│   ├── Move.toml               # Move package configuration
│   └── doc/                    # Generated documentation
├── scripts/                     # Development and deployment scripts
│   ├── move/                   # Move contract scripts
│   └── utils/                  # Utility scripts
├── resources/                   # Sample NFT metadata and assets
├── public/                     # Static assets
└── build/                      # Build output
```

## Key Commands

### Environment Setup
```bash
# Copy environment template
cp .env.sample .env

# Install dependencies
npm install

# Initialize Move environment
npm run move:init
```

### Development
```bash
# Start development server (opens at http://localhost:5173)
npm run dev

# Format code
npm run fmt

# Lint code
npm run lint
```

### Move Contract Operations
```bash
# Test Move contracts
npm run move:test

# Compile Move contracts
npm run move:compile

# Publish contracts to blockchain
npm run move:publish

# Upgrade existing contracts
npm run move:upgrade
```

### Build and Deploy
```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Configuration

### Required Environment Variables (.env)
```bash
# Network configuration (testnet, mainnet, custom)
VITE_APP_NETWORK="testnet"

# Contract addresses (set automatically by publish script)
VITE_MODULE_ADDRESS="your_deployed_contract_address"

# Creator address (your wallet address for creating collections)
VITE_COLLECTION_CREATOR_ADDRESS="your_wallet_address"

# Project identifier
PROJECT_NAME="Move NFT Studio"
```

## Smart Contract Architecture

### Core Contract: `launchpad.move`
Located at `/Users/ryorod/Documents/hackathon/movement/aptos-nft-studio/move/sources/launchpad.move`

#### Key Functions:
- **create_collection**: Create new NFT collections with mint stages
- **mint_nft**: Mint NFTs during active mint phases
- **combine_nft**: Combine two NFTs based on combination rules
- **evolve_nft**: Evolve NFTs based on evolution rules
- **add_combination_rule**: Define how NFTs can be combined
- **add_evolution_rule**: Define evolution paths for NFTs

#### Key Resources:
- **CollectionConfig**: Per-collection configuration and rules
- **CombinationRules**: Rules for NFT combinations
- **EvolutionRules**: Rules for NFT evolution
- **Registry**: Global registry of all collections

## Frontend Architecture

### State Management
- **React Query** for server state and blockchain data caching
- **Custom hooks** for blockchain interactions (in `/hooks/`)
- **Context providers** for wallet connection and global state

### Key Hooks
- `useGetCollections`: Fetch all collections
- `useGetOwnedNFTs`: Get user's NFT portfolio
- `useGetEvolutionRules`: Fetch evolution rules for collections
- `useNFTModal`: Modal state management for NFT interactions

### Routing Structure
- `/` - Mint/Landing page
- `/create-collection` - Collection creation form
- `/my-nfts` - User's NFT portfolio
- `/collections` - Browse all collections
- `/collection/:id` - Collection detail page
- `/craft-nft` - NFT combination interface
- `/evolve-nft` - NFT evolution interface

## Development Workflow

### Setting Up Development Environment
1. Clone the repository
2. Copy `.env.sample` to `.env` and configure variables
3. Run `npm install` to install dependencies
4. Run `npm run move:init` to initialize Move environment
5. Deploy contracts with `npm run move:publish`
6. Start development server with `npm run dev`

### Making Changes
1. **Frontend changes**: Edit files in `/frontend/`, hot reload is enabled
2. **Smart contract changes**: Edit `/move/sources/launchpad.move`, then:
   - Test: `npm run move:test`
   - Compile: `npm run move:compile`
   - Deploy: `npm run move:publish`

### Adding New Features
1. **New pages**: Add to `/frontend/pages/` and update routing in `App.tsx`
2. **New components**: Add to `/frontend/components/`
3. **New blockchain interactions**: Add hooks to `/frontend/hooks/`
4. **New Move functions**: Add to contract and create wrappers in `/frontend/entry-functions/`

## Testing Strategy

### Move Contracts
- Unit tests in Move (run with `npm run move:test`)
- Integration testing through frontend interaction

### Frontend
- Manual testing through development server
- Type checking with TypeScript compiler
- Linting with ESLint

## Deployment

### Smart Contracts
- Deployed to Movement testnet/mainnet via `npm run move:publish`
- Contract addresses stored in `.env` file
- Upgradeable through `npm run move:upgrade`

### Frontend
- Built with `npm run build`
- Static files in `/build/` directory
- Deployed to Netlify (production: https://aptos-move-nft-studio.netlify.app/)

## Key Design Patterns

### Blockchain Integration
- **Entry Functions**: Direct contract calls for state changes
- **View Functions**: Read-only contract queries
- **React Query**: Caching and synchronization of blockchain data
- **Wallet Adapter**: Standardized wallet connection

### UI/UX Patterns
- **Responsive Design**: Mobile-first approach with Tailwind
- **Component Library**: Consistent design system with shadcn/ui
- **Form Handling**: Controlled components with validation
- **Loading States**: Spinners and skeletons for async operations

## Performance Considerations

### Frontend
- **Code Splitting**: Automatic with Vite
- **Asset Optimization**: Image compression and lazy loading
- **Bundle Size**: Tree shaking and dead code elimination
- **Caching**: React Query for API responses

### Blockchain
- **Gas Optimization**: Efficient Move code patterns
- **Batch Operations**: Multiple NFT operations in single transaction
- **View Functions**: Read operations don't consume gas

## Security Considerations

### Smart Contract
- **Access Control**: Admin and creator role separation
- **Input Validation**: All user inputs validated
- **Reentrancy Protection**: Following Move best practices
- **Upgrade Safety**: Careful state migration in upgrades

### Frontend
- **Wallet Security**: No private key handling in frontend
- **Input Sanitization**: All user inputs sanitized
- **Environment Variables**: Sensitive data in environment variables only

## Contributing Guidelines

### Code Style
- **TypeScript**: Strict type checking enabled
- **Formatting**: Use `npm run fmt` before commits
- **Linting**: Fix all ESLint warnings
- **Naming**: Use descriptive, consistent naming conventions

### Git Workflow
- **Feature branches**: Create branches for new features
- **Commit messages**: Clear, descriptive commit messages
- **Pull requests**: Required for all changes to main branch

### Move Development
- **Documentation**: Comment complex Move functions
- **Testing**: Write tests for new Move functions
- **Gas Efficiency**: Optimize for gas consumption
- **Security**: Follow Move security best practices

## Troubleshooting

### Common Issues
1. **Wallet Connection**: Ensure wallet is on correct network
2. **Contract Calls**: Check gas fees and account balance
3. **Development Server**: Clear cache and restart if issues occur
4. **Move Compilation**: Check Move.toml addresses match deployment

### Debug Tools
- **Browser DevTools**: For frontend debugging
- **Move Prover**: For Move contract verification
- **Aptos Explorer**: For transaction inspection
- **React Query DevTools**: For state inspection

## Resources

### Documentation
- [Move Documentation](https://move-language.github.io/move/)
- [Aptos Developer Documentation](https://aptos.dev/)
- [React Documentation](https://react.dev/)
- [TailwindCSS Documentation](https://tailwindcss.com/)

### Project Links
- [Deployed App](https://aptos-move-nft-studio.netlify.app/)
- [GitHub Repository](https://github.com/gmove-hackers/aptos-nft-studio)
- [Demo Video](https://www.youtube.com/watch?v=kDBK36v6aoQ)

### Team
- [Slothify](https://x.com/zkSlothify)
- [R3](https://x.com/987654_21)
- [arjanjohan](https://x.com/arjanjohan)

---

*This document serves as a comprehensive guide for development work on the Move NFT Studio project. Keep it updated as the project evolves.*