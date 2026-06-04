# Copilot Instructions

## Commands

This repository does **not** have a root workspace or root npm scripts. Work inside `app/` or `server/`.

| Scope | Command | Purpose |
| --- | --- | --- |
| `app/` | `cd app && npm install` | Install Expo app dependencies |
| `app/` | `cd app && npm start` | Start the Expo dev server |
| `app/` | `cd app && npm run android` | Open the Expo app on Android |
| `app/` | `cd app && npm run ios` | Open the Expo app on iOS |
| `app/` | `cd app && npm run web` | Open the Expo app on web |
| `app/` | `cd app && npm run lint` | Run the app linter |
| `app/` | `cd app && npm run reset-project` | Reset the Expo starter app scaffold |
| `server/` | `cd server && npm install` | Install Express server dependencies |
| `server/` | `cd server && npm start` | Start the Express server on `PORT` or `3000` |

There is currently **no automated test suite** and **no build script** defined in either package, so there is no single-test command yet.

## High-level architecture

- The repo is split into two independent packages: `app/` is an Expo React Native client, and `server/` is a separate Node/Express service. Future work should usually target one package at a time rather than assuming a root monorepo workflow.
- The product README describes the intended system as **Expo/RN app -> Express API -> Azure OpenAI vision -> Cosmos DB**, but the implementation is still mostly scaffolded. The mobile app is an Expo starter built on `expo-router`, the server is still the default Express generator app, and `database/` does not contain a live schema or client implementation yet.
- In the app, `app/src/app/_layout.tsx` is the entry layout: it wraps the router in Expo's `ThemeProvider`, shows `AnimatedSplashOverlay`, and mounts the shared tab UI from `src/components/app-tabs.tsx`.
- Current screens live directly under `app/src/app/` (`index.tsx` and `explore.tsx`). Navigation is file-based through `expo-router`, not a hand-built navigator tree.
- The server entrypoint is `server/bin/www`, which reads `PORT`, creates the HTTP server, and starts the Express app from `server/app.js`. Routes are currently mounted at `/` and `/users`.

## Key conventions

- For Expo work, follow the existing assistant guidance in `app/AGENTS.md`: **read the exact Expo SDK 56 docs** at `https://docs.expo.dev/versions/v56.0.0/` before changing Expo APIs or patterns.
- Use the `@/*` TypeScript path alias in `app/tsconfig.json` for app imports. App code consistently imports from `@/components`, `@/hooks`, `@/constants`, and `@/assets` instead of deep relative paths.
- Prefer the shared theming wrappers over raw primitives when building UI: `ThemedText`, `ThemedView`, `useTheme`, and the tokens in `src/constants/theme.ts` centralize colors, spacing, fonts, content width, and bottom-tab spacing.
- Keep platform differences in platform-specific files when possible. The app already uses `.web.ts` / `.web.tsx` overrides such as `use-color-scheme.web.ts` and `app-tabs.web.tsx` instead of branching everything inline.
- The app currently uses `expo-router/unstable-native-tabs` on native and `expo-router/ui` tabs on web. If you touch navigation, preserve both implementations instead of assuming a single shared tab component.
- `app/app.json` has `experiments.typedRoutes = true`, so route changes should stay compatible with Expo Router typed routes rather than bypassing the router conventions.
