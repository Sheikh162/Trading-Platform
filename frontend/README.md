# Frontend Service

The Frontend service is a modern Next.js-based web application that provides the user interface for the trading platform, featuring real-time market data, order management, and interactive trading tools.

## Overview

This service delivers a responsive, real-time trading interface built with Next.js 15, React 19, and modern web technologies. It provides users with comprehensive trading tools, market visualization, and real-time data updates.

## Features

- **Real-time Trading Interface**: Live order book, trade history, and price updates
- **Market Data Visualization**: Interactive charts and market depth displays
- **Order Management**: Place, modify, and cancel orders
- **Responsive Design**: Optimized for desktop and mobile devices
- **Dark/Light Theme**: User preference-based theming
- **WebSocket Integration**: Real-time data streaming
- **Modern UI Components**: Built with Radix UI and Tailwind CSS

## Technology Stack

### Core Framework
- **Next.js 15**: React framework with App Router
- **React 19**: Latest React with concurrent features
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework

### UI Components
- **Radix UI**: Accessible component primitives
- **Lucide React**: Modern icon library
- **Class Variance Authority**: Component variant management
- **Next Themes**: Theme management

### Data & Visualization
- **Lightweight Charts**: High-performance trading charts
- **Axios**: HTTP client for API communication
- **WebSocket Client**: Real-time data streaming

## Application Structure

### Pages
- **Home (`/`)**: Market overview and navigation
- **Markets (`/markets`)**: Market listing and selection
- **Trading (`/trade/[market]`)**: Individual market trading interface

### Key Components

#### Market Components (`components/comp/`)
- **Markets.tsx**: Market listing and selection interface
- **TradeView.tsx**: Main trading interface
- **Trades.tsx**: Trade history display
- **MarketBar.tsx**: Market information header
- **SwapUI.tsx**: Order placement interface

#### Depth Components (`components/depth/`)
- **Depth.tsx**: Order book visualization
- **BidTable.tsx**: Buy orders display
- **AskTable.tsx**: Sell orders display

#### UI Components (`components/ui/`)
- **button.tsx**: Customizable button component
- **card.tsx**: Card layout component
- **input.tsx**: Form input component
- **table.tsx**: Data table component
- **tabs.tsx**: Tab navigation component

### Utilities (`utils/`)
- **ChartManager.ts**: Chart configuration and management
- **httpClient.ts**: API communication utilities
- **SignalingManager.ts**: WebSocket connection management
- **wsClient.ts**: WebSocket client implementation
- **types.ts**: TypeScript type definitions

## Real-time Features

### WebSocket Integration
The frontend connects to the WebSocket service for real-time updates:

- **Trade Streams**: Live trade execution updates
- **Depth Updates**: Real-time order book changes
- **Ticker Updates**: Price change notifications
- **Order Updates**: Order status changes

### Data Streaming
```typescript
// Example WebSocket subscription
const wsClient = new WebSocketClient();
wsClient.subscribe('trade@TATA_INR', (data) => {
  // Handle trade updates
});
```

## API Integration

### HTTP Client
The frontend communicates with the API service for:
- Order placement and management
- Market data retrieval
- User balance queries
- Historical data access

### Proxy Route
- **`/api/proxy`**: Proxies requests to backend services
- Handles CORS and authentication
- Provides unified API interface

## Styling and Theming

### Design System
- **Tailwind CSS**: Utility-first styling
- **CSS Variables**: Dynamic theming support
- **Responsive Design**: Mobile-first approach
- **Accessibility**: WCAG compliant components

### Theme Support
- **Dark Mode**: Professional dark theme
- **Light Mode**: Clean light theme
- **System Preference**: Automatic theme detection
- **Theme Toggle**: Manual theme switching

## Development

### Prerequisites
- Node.js 18+
- npm or yarn
- Backend services running

### Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

### Development Scripts
- `npm run dev`: Start development server with Turbopack
- `npm run build`: Build optimized production bundle
- `npm run start`: Start production server
- `npm run lint`: Run ESLint for code quality

### Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── markets/           # Markets page
│   ├── trade/[market]/    # Trading interface
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── comp/             # Main application components
│   ├── depth/            # Order book components
│   └── ui/               # Reusable UI components
├── lib/                   # Utility libraries
└── utils/                 # Application utilities
```

## Configuration

### Next.js Configuration
- **App Router**: Modern Next.js routing
- **TypeScript**: Full type safety
- **Turbopack**: Fast development builds
- **Image Optimization**: Automatic image optimization

### Tailwind Configuration
- **Custom Colors**: Trading platform color scheme
- **Responsive Breakpoints**: Mobile-first design
- **Component Variants**: Consistent styling system

## Performance Optimizations

### Build Optimizations
- **Code Splitting**: Automatic route-based splitting
- **Tree Shaking**: Unused code elimination
- **Image Optimization**: Next.js image optimization
- **Bundle Analysis**: Webpack bundle analyzer

### Runtime Optimizations
- **React 19 Features**: Concurrent rendering
- **Memoization**: Component and value memoization
- **Lazy Loading**: Component lazy loading
- **WebSocket Efficiency**: Optimized real-time updates

## Browser Support

- **Modern Browsers**: Chrome, Firefox, Safari, Edge
- **ES2020+**: Modern JavaScript features
- **CSS Grid/Flexbox**: Modern layout support
- **WebSocket**: Real-time communication

## Deployment

### Production Build
```bash
npm run build
npm start
```

### Docker Support
The service includes Docker configuration for containerized deployment.

### Environment Variables
- `NEXT_PUBLIC_API_URL`: Backend API URL
- `NEXT_PUBLIC_WS_URL`: WebSocket service URL
- `NEXT_PUBLIC_APP_NAME`: Application name

## Security Considerations

- **CORS Configuration**: Proper cross-origin setup
- **Input Validation**: Client-side validation
- **XSS Protection**: React's built-in XSS protection
- **HTTPS**: Secure communication in production

## Accessibility

- **WCAG Compliance**: Accessibility standards
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader Support**: ARIA labels and roles
- **Color Contrast**: Accessible color schemes

## Testing

### Component Testing
- **React Testing Library**: Component testing
- **Jest**: Test runner and assertions
- **User Interactions**: User behavior testing

### E2E Testing
- **Playwright**: End-to-end testing
- **Trading Flows**: Complete user journeys
- **Real-time Features**: WebSocket testing