# My Wallet Finance Tracker

An offline-first + cloud-synced mobile finance tracker app built from the Figma design reference (`https://height-sharp-66782844.figma.site/`).

## Tech Stack
- **Framework:** React Native `0.88.1` + Expo SDK `58` + Metro Bundler
- **Language:** TypeScript `6.0`
- **Styling:** Tailwind CSS (`tailwindcss` + `nativewind`) & Custom SVG Folder Geometry (`react-native-svg` + `expo-linear-gradient`)
- **Typography:** Urbanist (`@expo-google-fonts/urbanist`)
- **Offline Local Storage:** SQLite (`expo-sqlite` — `my_wallet_v2.db` with WAL mode)
- **Cloud Database & Auth:** Supabase (`@supabase/supabase-js`) — Supabase Auth + Supabase PostgreSQL (`profiles`, `wallets`, `activities` tables with Row-Level Security)
- **Android Build System:** Gradle (`android/gradlew`) for `.apk` and `.aab` builds

## Setup & Running Locally

1. Copy `.env.example` to `.env` (already configured for the `My Wallet` Supabase project):
   ```bash
   cp .env.example .env
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start Metro & launch on Android Studio Emulator (`Pixel_10_Pro`):
   ```bash
   npm run android
   ```
4. Build standalone APK or AAB via Gradle:
   ```bash
   npm run build:debug-apk
   npm run build:apk
   npm run build:aab
   ```
