---
name: Expo web in Replit
description: Quirks and fixes for running Expo web mode inside the Replit container
---

## Rules

1. **No `--no-open` flag** — not supported by Expo CLI 56. Use `BROWSER=none` env prefix instead:
   ```
   BROWSER=none expo start --web --port 8080
   ```

2. **Port 8080, not 8081** — Replit only allows these ports: 3000, 3001, 3002, 3003, 4200, 5000, 5173, 6000, 6800, 8000, 8008, 8080, 8099, 9000. Port 8081 is blocked.

3. **`react-native-web` + `@expo/metro-runtime` required** — Expo SDK 56 will throw `CommandError` about missing web dependencies if these aren't installed. Run `npm install react-native-web@^0.19.0 @expo/metro-runtime --legacy-peer-deps` inside `mobile/`.

4. **Disable `typedRoutes`** — `experiments: { typedRoutes: true }` in app.json requires `@expo/router-server` typed-routes peer deps that aren't auto-installed. Removing this from app.json prevents a MODULE_NOT_FOUND crash on startup.

5. **React Native DevTools libglib error is non-fatal** — The error about `libglib-2.0.so.0` is a DevTools debugger shell issue, not the Metro bundler. The app still runs and serves correctly.

**Why:** Replit's container is headless (no GUI, blocked ports), so any Expo feature that tries to open a browser or use GUI tools fails unless explicitly disabled.

**How to apply:** Whenever setting up a new Expo project in Replit, apply all 4 fixes before first `npm run web`.
