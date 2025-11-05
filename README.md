# RalphTV Watch

Mobile-optimized Progressive Web App for watching RalphTV live stream.

## Features

- 📱 **Mobile-Optimized**: Full-screen video player designed for mobile devices
- 🎬 **HLS Streaming**: Low-latency live streaming with hls.js
- 📲 **PWA Support**: Installable to home screen as standalone app
- 🎮 **Playback Controls**: Play/pause, volume, and fullscreen controls
- ⚡ **Fast & Lightweight**: Minimal dependencies, focused solely on viewing

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
# .env
VITE_RELAY_BASE_URL=https://your-relay-url.up.railway.app
```

3. Development:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

## Railway Deployment

1. Create new Railway project
2. Connect to this GitHub repository
3. Add environment variable:
   - `VITE_RELAY_BASE_URL`: Your relay service URL

Railway will automatically build and deploy using `npm run build` and serve from `dist`.

## PWA Installation

On mobile devices:
- **iOS (Safari)**: Tap Share → Add to Home Screen
- **Android (Chrome)**: Tap Menu → Add to Home Screen

The app will open in full-screen mode with no browser UI.

## Architecture

This is a standalone project, completely separate from the RalphTV Broadcaster. This ensures:
- Zero impact on broadcaster stability
- Optimized bundle size for viewers
- Independent deployment and scaling
- Simplified mobile experience

## Tech Stack

- React 18 + TypeScript
- Vite for fast builds
- hls.js for video streaming
- Service Worker for PWA features
