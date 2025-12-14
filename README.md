# WiLang

WiLang is a secure video calling application that brings professional communication to your fingertips. Built with React Native and Expo, it combines encrypted video calls, real-time speech transcription, and easy-to-use features for seamless communication across iOS, Android, and web platforms.

What makes WiLang special is its focus on privacy and accessibility. Your conversations are protected with end-to-end encryption, while AI-powered speech recognition provides real-time subtitles during calls - making communication accessible for everyone.

<img width="100" alt="Screenshot_20250810-232446_whisperlang" src="https://github.com/user-attachments/assets/1504a035-6046-41a6-a600-35da55384313" />
<img width="100" alt="Screenshot_20250810-232454_whisperlang" src="https://github.com/user-attachments/assets/cb320865-f52a-4cab-99bd-b38e9d88eb58" />
<img width="100" alt="Screenshot_20250810-233023_whisperlang" src="https://github.com/user-attachments/assets/1dc99b3d-a00d-4d41-bfb4-1b6a4f53d336" />

## Key Features

### Security & Privacy
- **End-to-End Encryption** for all video and audio streams using AES-GCM encryption
- **Security Verification Codes** to verify encryption keys between participants
- **Firebase Authentication** with email/password and Google Sign-In
- **Secure Key Management** with automatic key rotation and secure storage
- **Privacy Protection** with no data stored on external servers during calls

### AI-Powered Speech Recognition
- **Real-time Transcription & Translation** using Palabra AI for live subtitles and translations during calls (optional cloud service via LiveKit)
- **Voice Activity Detection (VAD)** to optimize transcription performance and reduce bandwidth/battery usage
- **Multi-language Support** with automatic language detection
- **Configurable processing modes** — cloud-based Palabra translation or lightweight local detection features
- **Accessibility Features** making calls inclusive for hearing-impaired users

### Video Calling
- **Encrypted WebRTC Calls** with peer-to-peer connections
- **Meeting Rooms** with unique IDs for group participation
- **Instant Calls** with shareable meeting codes
- **One-to-one Calls** directly from your contacts
- **Audio/Video Controls** including mute, camera switch, and call management
- **Real-time Connection Status** with participant management

## Getting Started

### Prerequisites

Before you start, make sure you have these installed:

- **Node.js** version 18 or higher
- **Yarn** package manager (recommended) or npm
- **Expo CLI** - install with `npm install -g @expo/cli`

For mobile development, you'll also need:
- **iOS Development**: Xcode and iOS Simulator (macOS only)
- **Android Development**: Android Studio with an emulator or physical device
- **Web Testing**: Any modern browser like Chrome, Firefox, or Safari

### Installation

Getting WiLang running is straightforward. Follow these steps:

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd wilang
   ```

2. **Install dependencies**
   
   WiLang uses Yarn for package management. This ensures all dependencies work correctly together:
   ```bash
   yarn install
   ```

3. **Set up your environment**
   
   Create a `.env` file in the root directory with your Firebase configuration. You can get these values from your Firebase project console:
   ```bash
   # Firebase Configuration
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_API_KEY=your-api-key
   FIREBASE_AUTH_DOMAIN=your-auth-domain
   FIREBASE_STORAGE_BUCKET=your-storage-bucket
   FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   FIREBASE_APP_ID=your-app-id
   
   # Google Sign-In
   GOOGLE_SIGN_IN_WEB_CLIENT_ID=your-web-client-id
   
   # Platform-specific
   FIREBASE_ANDROID_API_KEY=your-android-api-key
   FIREBASE_ANDROID_APP_ID=your-android-app-id
   FIREBASE_IOS_API_KEY=your-ios-api-key
   FIREBASE_IOS_APP_ID=your-ios-app-id

   # Palabra (optional) - speech translation
   # Palabra can be configured in app Settings or via environment variables
   PALABRA_CLIENT_ID=your-palabra-client-id
   PALABRA_CLIENT_SECRET=your-palabra-client-secret
   PALABRA_API_BASE_URL=https://api.palabra.ai
   ```

## How to Run This Project

### Quick Start Guide

Running WiLang locally is straightforward. Start the signaling server (local dev or production) and the mobile app.

1. **Start the Signaling Server**

   The server handles connection setup between users. From the repository root:

   ```bash
   # Navigate to server directory
   cd wilang-server

   # Install server dependencies
   npm install

   # Development: runs with nodemon for auto-reload
   npm run dev

   # Production: start normally
   npm start
   # Server will run on http://localhost:3000 by default
   ```

2. **Start the Mobile App**

   In a new terminal window at the repository root:

   ```bash
   # Install and start the Expo development server
   yarn install
   yarn start
   ```

3. **Choose Where to Run**

   Once Expo starts, you'll see options to run the app:
   - Press `a` to run on Android emulator
   - Press `i` to run on iOS simulator
   - Press `w` to run in web browser
   - Scan the QR code with Expo Go or use a custom dev client

### Troubleshooting

If you run into issues, here are quick fixes:

**Metro bundler won't start:**
```bash
npx expo start --clear
```

**Build failures:**
```bash
# Android
cd android && ./gradlew clean && cd .. && npx expo run:android --clear

# iOS
cd ios && pod install && cd .. && npx expo run:ios --clear
```

**Connection issues:**
Make sure the signaling server is running on `http://localhost:3000`

## Configuration

### Firebase Setup

WiLang uses Firebase for authentication and user profiles:

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Enable Email/Password and Google Sign-In in Authentication
3. Enable Firestore database
4. Download `google-services.json` (Android) and `GoogleService-Info.plist` (iOS)
5. Place these files in `android/app/` and `ios/WiLang/` respectively

### Signaling Server

The included server (`wilang-server`) handles WebRTC signaling (Socket.IO), PeerJS peer connections (available at `/peerjs`), user registration, push notifications (FCM / APNs), and room management. The server includes heartbeat checks and rate limiting to improve resiliency and security. Deploy it to any Node.js hosting service like Render, Heroku, or DigitalOcean.

Important environment variables (examples):

- `FIREBASE_SERVICE_ACCOUNT` — JSON string of Firebase service account credentials used by `firebase-admin`. When set, the server initializes the admin SDK and logs `firebase_admin_initialized`.
- `APNS_KEY`, `APNS_KEY_ID`, `APNS_TEAM_ID` — configure Apple Push Notification key if you need APNs support (server writes a temporary `.p8` key file from `APNS_KEY` and initializes an APNs provider).
- `PORT` — server listening port (defaults to 3000 locally)

For development, use `npm run dev` (nodemon) and watch server logs for `firebase_admin_initialized`, `apns_initialized`, or credential-related messages.

### Required Permissions

WiLang needs these permissions to work:
- **Camera & Microphone** - For video calls and speech transcription
- **Contacts** - Optional, for calling people from your contact list
- **Network** - For connecting to other users

### Palabra Integration (Speech Translation)

Real-time translation and transcription are handled by **Palabra AI**. The app uses a LiveKit-based transport to stream audio to Palabra's streaming sessions and receive transcriptions and translations in real-time.

- Palabra requires credentials (clientId/clientSecret) or a user token to create streaming sessions. Configure Palabra credentials in the app's Settings → Translation (or via your app's runtime configuration).
- The Palabra pipeline includes VAD, partial-transcription streaming, and optional speech generation for translated audio.

Note: earlier versions shipped a Replicate/SeamlessM4T demo; that demo is no longer used in the default build and has been replaced with Palabra-based translation.
## App Structure

WiLang is organized into four main tabs:

- **Calls** - Create instant meetings, join with codes, see upcoming calls
- **Contacts** - Access your contacts and start video calls
- **History** - View past calls and meetings
- **Settings** - Manage your profile and preferences

The app includes screens for authentication, video calling with full controls, instant meeting creation, and user management.

## Development

### Available Commands

```bash
yarn start              # Start Expo development server
yarn android           # Run on Android
yarn ios               # Run on iOS
yarn web               # Run in browser
yarn lint              # Check code quality
yarn test              # Run tests
```

### Key Technologies

- **React Native 0.76** with **Expo SDK 53** for cross-platform development
- **TypeScript** for type safety
- **WebRTC** for peer-to-peer video calls with end-to-end encryption
-- **Palabra AI** for real-time translation & transcription (via LiveKit transport)
- **Firebase** for authentication and user management
- **Socket.IO** for real-time signaling
- **Noble Cryptography** (@noble/ciphers) for AES-GCM encryption

Additional notable libraries and services:
- **LiveKit** for media streaming and audio routing (@livekit/react-native)
- **PeerJS** server for peer connections (server exposes `/peerjs`)
- **APNs / FCM** push support via the server (APNs key support is handled via env vars)

### Architecture Highlights

**End-to-End Encryption**: Uses X25519 key exchange with AES-GCM-256 encryption for media frames. Each participant generates identity and ephemeral keys, exchanges them securely, and derives session keys for encryption. Verification codes are available to validate keys between participants.

**Speech Recognition & Translation**: Integrates Palabra AI for real-time translation and transcription via LiveKit transport. Voice Activity Detection (VAD) is used in the pipeline to optimize performance and reduce bandwidth and battery usage.

**WebRTC Integration**: Uses LiveKit for media handling and a custom signaling layer (Socket.IO + PeerJS) for peer discovery and connections. The client reads `SIGNALING_SERVER_URL` and `FALLBACK_SERVER_URLS` from `.env` (defaults point to a Render deployment at `https://whisperlang-render.onrender.com`).

## Deployment

### Server Deployment

The signaling server can be deployed to any Node.js hosting service:

```bash
cd wilang-server
npm install
# For local development with auto-reload
npm run dev
npm start
```

Update the `SIGNALING_SERVER_URL` / `FALLBACK_SERVER_URLS` in your app configuration (or `.env`) to point to your deployed server instead of localhost. The client defaults to `https://whisperlang-render.onrender.com` when not set.

### Building for Production

```bash
# Android
yarn build:android

# iOS
yarn build:ios
```

These commands use EAS (Expo Application Services) to create production-ready builds.

## Contributing

We welcome contributions! Here's how to get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes following the existing code style
4. Ensure tests pass: `yarn test && yarn lint`
5. Submit a pull request with a clear description

Please follow TypeScript best practices and include tests for new features.

## License

This project is licensed under the GNU Affero General Public License v3.0. See the [LICENSE](LICENSE) file for details.

## Acknowledgments

Built with amazing open source technologies:
- **Expo** for the development platform
- **Palabra AI** for real-time translation & transcription
- **LiveKit** for media streaming and audio routing
- **React Native WebRTC** for video communication
- **Firebase** for authentication services
- **Socket.IO** for real-time signaling
- **Noble Cryptography** for secure encryption
