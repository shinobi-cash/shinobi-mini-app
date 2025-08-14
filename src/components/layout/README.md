# Screen Layout System

This directory contains reusable layout components that ensure consistent spacing and safe area handling across all screens in the Shinobi mini app.

## Components

### ScreenLayout
The primary layout component for screens within the main app (between header and bottom navigation).

**Usage:**
```tsx
import { ScreenLayout } from '@/components/layout/ScreenLayout'

export function MyScreen() {
  return (
    <ScreenLayout>
      <div>Your screen content here</div>
    </ScreenLayout>
  )
}
```

**Features:**
- Automatic bottom padding to account for fixed bottom navigation
- Safe area handling for devices with home indicators (iPhone X+)
- Hidden scrollbars for clean mobile experience
- Proper overflow handling

### FullScreenLayout
For screens that need full control over their layout (like setup flows).

**Usage:**
```tsx
import { FullScreenLayout } from '@/components/layout/ScreenLayout'

export function SetupScreen() {
  return (
    <FullScreenLayout>
      <div className="h-screen bg-app-background flex flex-col">
        {/* Your full-screen content */}
      </div>
    </FullScreenLayout>
  )
}
```

### ScreenContainer
Standard responsive container with proper mobile-first design.

**Usage:**
```tsx
import { ScreenContainer } from '@/components/layout/ScreenLayout'

export function ContentScreen() {
  return (
    <ScreenLayout>
      <ScreenContainer maxWidth="md" padding="lg">
        <h1>My Content</h1>
        <p>This content will be properly centered and padded</p>
      </ScreenContainer>
    </ScreenLayout>
  )
}
```

**Props:**
- `maxWidth`: 'sm' | 'md' | 'lg' | 'xl' (default: 'md')
- `padding`: 'sm' | 'md' | 'lg' (default: 'md')

## Implementation Guidelines

### For Main App Screens
All screens that appear within the main app layout (home, deposit, history, profile) should use `ScreenLayout`:

```tsx
// In MainScreen.tsx
case 'your-screen':
  return (
    <ScreenLayout>
      <YourScreen />
    </ScreenLayout>
  )
```

### For Modal/Overlay Screens
Screens that appear as modals or overlays should use `FullScreenLayout`:

```tsx
export function ModalScreen() {
  return (
    <FullScreenLayout>
      {/* Modal content with its own header/footer */}
    </FullScreenLayout>
  )
}
```

### For Setup/Onboarding Flows
Multi-step flows should use `FullScreenLayout` with their own navigation:

```tsx
export function OnboardingFlow() {
  return (
    <FullScreenLayout>
      <div className="h-screen flex flex-col">
        <OnboardingHeader />
        <div className="flex-1 overflow-hidden">
          <OnboardingStep />
        </div>
      </div>
    </FullScreenLayout>
  )
}
```

## Safe Area Support

The layout system automatically handles safe areas for devices with:
- Home indicators (iPhone X+)
- Dynamic islands
- Notches
- Other device-specific safe areas

**CSS Classes Available:**
- `pb-safe-area-bottom` - Bottom safe area padding
- `pt-safe-area-top` - Top safe area padding
- `pl-safe-area-left` - Left safe area padding
- `pr-safe-area-right` - Right safe area padding
- `h-safe-area-bottom` - Safe area height

## Mobile-First Design

All layout components follow mobile-first principles:
- Base styles target mobile devices
- `sm:` prefix for larger screens (640px+)
- Touch-friendly interaction areas
- Appropriate spacing and typography scaling

## Common Patterns

### Scrollable Content with Fixed Header
```tsx
<ScreenLayout>
  <div className="flex flex-col">
    <div className="flex-shrink-0 p-4">
      {/* Fixed header content */}
    </div>
    <div className="flex-1 overflow-auto px-4">
      {/* Scrollable content */}
    </div>
  </div>
</ScreenLayout>
```

### Centered Content
```tsx
<ScreenLayout>
  <ScreenContainer>
    <div className="flex items-center justify-center min-h-[60vh]">
      {/* Centered content */}
    </div>
  </ScreenContainer>
</ScreenLayout>
```

### List with Header
```tsx
<ScreenLayout>
  <div className="flex flex-col">
    <ScreenContainer className="flex-shrink-0">
      <h1>List Title</h1>
    </ScreenContainer>
    <div className="flex-1 px-4">
      {/* List items */}
    </div>
  </div>
</ScreenLayout>
```

## Migration Guide

### Existing Screens
To migrate existing screens:

1. Wrap content with `ScreenLayout`
2. Remove manual bottom padding (pb-20, pb-24, etc.)
3. Remove manual height management (h-full, h-screen on content)
4. Update overflow handling to work with ScreenLayout

**Before:**
```tsx
export function OldScreen() {
  return (
    <div className="h-full flex flex-col pb-20">
      {/* Content */}
    </div>
  )
}
```

**After:**
```tsx
export function NewScreen() {
  return (
    <ScreenLayout>
      <div className="flex flex-col">
        {/* Content */}
      </div>
    </ScreenLayout>
  )
}
```

## Testing on Different Devices

The layout system is designed to work across:
- iPhone (all models including X+ with safe areas)
- Android phones (various screen sizes)
- iPad (responsive breakpoints)
- Desktop (when testing in browser)

Test your screens by:
1. Using browser dev tools to simulate different devices
2. Testing on actual devices when possible
3. Checking safe area behavior on devices with home indicators
4. Verifying scrolling behavior with long content

## Future Enhancements

Planned improvements:
- Dynamic safe area detection
- Keyboard avoidance for form screens
- Gesture-based navigation support
- Enhanced accessibility features