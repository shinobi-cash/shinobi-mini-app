# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **mobile-first** Farcaster Mini App for Shinobi.cash - a privacy-focused cryptocurrency application designed primarily for mobile devices. Built with React, TypeScript, and Vite, the app provides deposit and withdrawal functionality for privacy pools using zero-knowledge proofs and Account Abstraction (ERC-4337). The entire UI is optimized for touch interactions and mobile screen sizes.

## Development Commands

### Build & Development
- `pnpm dev` - Start development server with Vite
- `pnpm build` - Build for production (runs TypeScript check + Vite build)
- `pnpm preview` - Preview production build locally

### Code Quality
- `pnpm lint` - Run Biome linter on src directory
- Biome is configured with 120 character line width and space indentation

## Architecture Overview

### Core Technologies
- **Frontend**: React 18 + TypeScript + Vite (optimized for mobile performance)
- **Mobile UI**: Tailwind CSS v4 with mobile-first design + Radix UI touch-friendly components
- **Mobile Interactions**: Vaul library for native-feeling drawers and bottom sheets
- **Wallet Integration**: Wagmi + RainbowKit (browser) / Farcaster Mini App SDK (in-frame)
- **State Management**: Zustand + React Context
- **Account Abstraction**: Permissionless.js for ERC-4337 smart accounts
- **Zero-Knowledge**: SnarkJS for proof generation (optimized for mobile browsers)
- **Blockchain**: Viem for Ethereum interactions on Base Sepolia
- **Data**: Apollo GraphQL client for indexer queries

### Environment Detection & Wallet Configuration
The app dynamically configures wallet providers based on environment:

**Farcaster Frame Environment** (`src/wagmi.ts:16-22`):
- Uses `@farcaster/miniapp-wagmi-connector` for in-frame wallet connections
- Simple Wagmi config without RainbowKit

**Browser Environment** (`src/wagmi.ts:8-13`):
- Full RainbowKit integration with multiple wallet options
- WalletConnect support via `VITE_WC_PROJECT_ID`

Detection logic in `src/utils/environment.ts` checks for Farcaster SDK availability.

### Authentication System
Multi-layered authentication supporting both password and passkey flows:

**AuthContext** (`src/contexts/AuthContext.tsx`):
- Manages cryptographic keys (private key, mnemonic, account key)
- Session restoration with automatic passkey login
- Password-based quick auth for returning users
- Key derivation using `src/lib/keyDerivation.ts`

**Session Management**:
- Encrypted note storage via `src/lib/noteCache.ts`
- WebAuthn passkey integration for passwordless auth
- Account key derivation from mnemonic for privacy pool interactions

### Privacy Pool Architecture

**Deposit Flow** (`src/hooks/useDepositCommitment.ts`):
- Generates unique deposit commitments using Poseidon hash
- Collision detection against on-chain deposits
- Note derivation from account keys for privacy preservation

**Withdrawal System** (`src/utils/WithdrawalProofGenerator.ts`):
- Zero-knowledge proof generation for private withdrawals
- Circuit files stored in `public/circuits/` with `.zkey` and `.vkey` files
- Account Abstraction for gasless transactions via paymaster

**Smart Contracts** (`src/config/constants.ts`):
- Base Sepolia deployment addresses
- Privacy Pool EntryPoint: `0xfBa5eDD64d4611ca50DD8dF9C4F94b895C66219b`
- ETH Privacy Pool: `0xB68E4f712bd0783fbc6b369409885c2319Db114a`
- ERC-4337 EntryPoint: `0x0000000071727De22E5E9d8BAf0edAc6f37da032`

### UI Architecture

**Mobile-First Navigation** (`src/contexts/NavigationContext.tsx`):
- Context-based navigation between screens: home | deposit | withdraw | profile
- No routing library - single-page app optimized for mobile performance
- Bottom navigation bar for thumb-friendly access

**Mobile Layout System** (`src/components/layout/`):
- `ScreenLayout` - Mobile-optimized screens with bottom navigation spacing and safe area handling
- `FullScreenLayout` - Full-screen modals for mobile workflows
- `ScreenContainer` - Mobile-first responsive containers with touch-friendly padding
- Automatic safe area handling for iOS devices (notches, home indicators, Dynamic Island)

**Mobile-Optimized Components**:
- `src/components/ui/` - Touch-friendly Radix UI components with mobile spacing
- `src/components/auth/` - Mobile authentication flows optimized for small screens
- `src/components/shared/` - Mobile-aware gate components
- **Drawer-based UI** - Primary interaction pattern using Vaul library for mobile-native bottom sheets and modals
- All interactive elements meet minimum 44px touch target requirements

### Data Layer

**GraphQL Integration** (`src/lib/clients.ts`):
- Apollo Client with dev/prod environment configuration
- Bearer token authentication for indexer API
- Error-tolerant queries with 'all' error policy

**Service Layer**:
- `src/services/contractService.ts` - Smart contract interactions
- `src/services/queryService.ts` - GraphQL query orchestration
- `src/services/withdrawalService.ts` - Withdrawal transaction building

### Development Environment

**Required Environment Variables**:
```
VITE_INDEXER_URL_DEV - Development GraphQL endpoint
VITE_INDEXER_URL_PROD - Production GraphQL endpoint
VITE_INDEXER_TOKEN_DEV - Development API token
VITE_INDEXER_TOKEN_PROD - Production API token
VITE_PIMLICO_API_KEY - Bundler API key for ERC-4337
VITE_WC_PROJECT_ID - WalletConnect project ID (optional)
```

**Farcaster Configuration**:
- `vercel.json` redirects `/.well-known/farcaster.json` to hosted manifest
- Frame metadata in `index.html` for social sharing

## Common Development Patterns

### Adding New Components
- Follow existing patterns in `src/components/ui/` for styled components
- Use Radix UI primitives with Tailwind for consistent styling
- Implement proper TypeScript interfaces for props

### Working with Privacy Pools
- All deposit/withdrawal operations require account key derivation
- Use `noteCache` for secure local storage of user notes
- Proof generation is async and resource-intensive - handle loading states

### Authentication Integration
- Always check `useAuth()` state before privacy pool operations
- Handle session restoration gracefully in components
- Use `AuthenticationGate` for conditional rendering based on auth state

### Smart Contract Integration
- Use `publicClient` for read operations
- Create smart account clients via `getWithdrawalSmartAccountClient()` for transactions
- All transactions go through ERC-4337 bundlers with paymaster sponsorship

### Mobile-First Development
This app is designed **mobile-first** - all development should prioritize mobile experience:

**Design Principles**:
- All layouts start with mobile designs (320px base width)
- Desktop is considered a secondary breakpoint using `sm:` prefixes
- Touch-first interactions with minimum 44px touch targets
- Thumb-zone optimization for primary actions (bottom 1/3 of screen)
- Single-handed usage patterns prioritized

**Mobile Testing Requirements**:
- Test all changes on mobile devices first, desktop second  
- Use browser dev tools with mobile device simulation
- Verify touch interactions, not just clicks
- Test with various mobile screen sizes (iPhone SE to iPhone Pro Max)
- Validate safe area behavior on iOS devices with notches/Dynamic Island
- Ensure proper keyboard handling on mobile browsers

**Mobile Layout Patterns**:
- Use `ScreenLayout` for standard mobile screens with bottom nav spacing
- Implement drawer/modal patterns for complex interactions
- Stack content vertically for mobile, consider horizontal layouts only for larger screens
- Use mobile-appropriate spacing (smaller margins, larger tap targets)

## Security Considerations

- Private keys and mnemonics handled entirely client-side
- Zero-knowledge proofs preserve transaction privacy
- Account Abstraction enables gasless transactions without exposing user keys
- Encrypted note storage prevents plaintext exposure of sensitive data
- "Alway remeber the mobile first design"
- The pattern that works without visual jumping:
  /* Mobile: Full width */
  inset-x-0

  /* Desktop: Reset then position */
  sm:inset-x-auto    /* Key: resets left/right to auto first */
  sm:left-1/2
  sm:-translate-x-1/2
  sm:w-[430px]

  Without sm:inset-x-auto, there's a CSS conflict between inset-x-0 (left: 0, right: 0) and
   sm:left-1/2, causing the drawer to start in wrong position and jump to correct position.
   The inset-x-auto class resets the positioning cleanly before applying desktop centering,
   eliminating the visual jump and ensuring smooth animations from the start.

  This follows mobile-first design principles: start with mobile positioning, then cleanly
  override for desktop without conflicts.


  Absolutely! I've captured this important learning about responsive drawer positioning.
  The key insight is that sm:inset-x-auto is essential for cleanly resetting mobile
  positioning before applying desktop constraints, preventing CSS conflicts that cause
  visual jumping.

  This mobile-first approach ensures smooth drawer animations across all screen sizes while
   maintaining the native mobile experience and desktop mobile app simulation. I'll
  remember this pattern for future responsive component implementations.