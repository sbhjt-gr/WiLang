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
- **Real-time Transcription** using Whisper AI for live subtitles during calls
- **Voice Activity Detection** to optimize transcription performance
- **Multi-language Support** with automatic language detection
- **Offline Processing** - all speech recognition happens on your device
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
   cd WiLang
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
   ```

## How to Run This Project

### Quick Start Guide

Running WiLang locally is easy. You need to start two things: the signaling server and the mobile app.

1. **Start the Signaling Server**
   
   The server handles connection setup between users. In your first terminal:
   ```bash
   # Navigate to server directory
   cd ../WiLang-server
   
   # Install server dependencies
   npm install
   
   # Start the signaling server
   npm start
   # Server will run on http://localhost:3000
   ```

2. **Start the Mobile App**
   
   In a new terminal window, go back to the main app:
   ```bash
   # In a new terminal, navigate back to main app
   cd ../WiLang
   
   # Start the Expo development server
   yarn start
   ```

3. **Choose Where to Run**
   
   Once Expo starts, you'll see options to run the app:
   - Press `a` to run on Android emulator
   - Press `i` to run on iOS simulator  
   - Press `w` to run in web browser
   - Scan the QR code with Expo Go app on your physical device

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

The included server handles WebRTC connections between users. It manages user discovery, meeting rooms, and connection setup. You can deploy it to any Node.js hosting service like Heroku, Render, or DigitalOcean.

### Required Permissions

WiLang needs these permissions to work:
- **Camera & Microphone** - For video calls and speech transcription
- **Contacts** - Optional, for calling people from your contact list
- **Network** - For connecting to other users

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

- **React Native 0.76** with **Expo SDK 52** for cross-platform development
- **TypeScript** for type safety
- **WebRTC** for peer-to-peer video calls with end-to-end encryption
- **Whisper.rn** for on-device AI speech recognition
- **Firebase** for authentication and user management
- **Socket.IO** for real-time signaling
- **Noble Cryptography** (@noble/ciphers) for AES-GCM encryption

### Architecture Highlights

**End-to-End Encryption**: Uses X25519 key exchange with AES-GCM-256 encryption for all video and audio frames. Each participant generates identity and ephemeral keys, exchanges them securely, and derives session keys for encryption.

**Speech Recognition**: Integrates Whisper AI models that run entirely on-device for privacy. Includes Voice Activity Detection (VAD) to optimize performance and reduce battery usage.

**WebRTC Integration**: Custom implementation with encryption at the frame level, allowing secure peer-to-peer communication with verification codes for key validation.

## Deployment

### Server Deployment

The signaling server can be deployed to any Node.js hosting service:

```bash
cd WiLang-server
npm install
npm start
```

Update the `SERVER_URL` in your app configuration to point to your deployed server instead of localhost.

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
- **whisper.rn** for on-device speech recognition
- **React Native WebRTC** for video communication
- **Firebase** for authentication services
- **Socket.IO** for real-time signaling
- **Noble Cryptography** for secure encryption
