# WiLang

WiLang is a comprehensive video calling application built with Expo and React Native that delivers professional-grade communication features. The app combines Firebase authentication, WebRTC technology, and an intuitive user interface to provide seamless video calling experiences across iOS, Android, and web platforms.

<img width="100" alt="Screenshot_20250810-232446_whisperlang" src="https://github.com/user-attachments/assets/1504a035-6046-41a6-a600-35da55384313" />
<img width="100" alt="Screenshot_20250810-232454_whisperlang" src="https://github.com/user-attachments/assets/cb320865-f52a-4cab-99bd-b38e9d88eb58" />
<img width="100" alt="Screenshot_20250810-233023_whisperlang" src="https://github.com/user-attachments/assets/1dc99b3d-a00d-4d41-bfb4-1b6a4f53d336" />

## Key Features

### Authentication & Security
- **Firebase Authentication** with email/password and Google Sign-In
- **Secure user management** with profile persistence
- **Input validation** and error handling

### Video Calling
- **WebRTC-powered** peer-to-peer video calls
- **Meeting rooms** with unique IDs for group participation
- **Instant calls** with shareable meeting codes
- **One-to-one calls** directly from contacts
- **Audio/video controls** (mute, camera switch, end call)
- **Real-time connection** status and participant management

## Getting Started

### Prerequisites
- **Node.js** 18 or higher
- **Yarn** package manager
- **Expo CLI** (`npm install -g @expo/cli`)
- **Development environment:**
  - **iOS**: Xcode and iOS Simulator (macOS only)
  - **Android**: Android Studio with emulator
  - **Web**: Modern browser

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd WiLang
   ```

2. **Install dependencies**
   ```bash
   yarn install
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory with your Firebase configuration:
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

### Quick Start (Local Development)

1. **Start the Signaling Server First**
   ```bash
   # Navigate to server directory
   cd ../WiLang-server
   
   # Install server dependencies
   npm install
   
   # Start the signaling server
   npm start
   # Server will run on http://localhost:3000
   ```

2. **Start the React Native App**
   ```bash
   # In a new terminal, navigate back to main app
   cd ../WiLang
   
   # Start the Expo development server
   yarn start
   ```

3. **Choose Your Platform**
   - Press `a` for Android emulator
   - Press `i` for iOS simulator
   - Press `w` for web browser
   - Scan QR code with Expo Go app for physical device

### Step-by-Step Setup Guide

#### 1. Clone and Install
```bash
# Clone the repository
git clone https://github.com/sbhjt-gr/WiLang.git
cd WiLang

# Install dependencies
yarn install

# Install Expo CLI globally if not already installed
npm install -g @expo/cli
```

#### 2. Environment Setup
Create a `.env` file in the root directory:
```bash
# Copy the example and fill in your values
cp .env.example .env

# Edit the file with your Firebase configuration
nano .env
```

Required environment variables:
```bash
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_API_KEY=your-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789012
FIREBASE_APP_ID=1:123456789012:web:abcdef123456

# Google Sign-In (get from Firebase Console > Authentication > Sign-in method > Google)
GOOGLE_SIGN_IN_WEB_CLIENT_ID=your-web-client-id.googleusercontent.com

# Android specific (from google-services.json)
FIREBASE_ANDROID_API_KEY=your-android-api-key
FIREBASE_ANDROID_APP_ID=1:123456789012:android:abcdef123456

# iOS specific (from GoogleService-Info.plist)
FIREBASE_IOS_API_KEY=your-ios-api-key
FIREBASE_IOS_APP_ID=1:123456789012:ios:abcdef123456
FIREBASE_IOS_CLIENT_ID=your-ios-client-id.googleusercontent.com
FIREBASE_IOS_REVERSED_CLIENT_ID=com.googleusercontent.apps.your-reversed-client-id
FIREBASE_IOS_BUNDLE_ID=com.gorai.WiLang
```

#### 3. Firebase Configuration Files
Download and place the configuration files:

**For Android:**
```bash
# Download google-services.json from Firebase Console
# Place it in: android/app/google-services.json
cp ~/Downloads/google-services.json android/app/
```

**For iOS:**
```bash
# Download GoogleService-Info.plist from Firebase Console
# Place it in: ios/WiLang/GoogleService-Info.plist
cp ~/Downloads/GoogleService-Info.plist ios/WiLang/
```

#### 4. Platform-Specific Setup

**Android Setup:**
```bash
# Install Android Studio and set up Android SDK
# Create an Android Virtual Device (AVD)
# Or connect a physical Android device with USB debugging enabled

# Verify Android setup
npx expo run:android --device
```

**iOS Setup (macOS only):**
```bash
# Install Xcode from App Store
# Install iOS Simulator
# Install CocoaPods
sudo gem install cocoapods

# Install iOS dependencies
cd ios && pod install && cd ..

# Verify iOS setup
npx expo run:ios --simulator
```

#### 5. Running the Complete System

**Terminal 1 - Signaling Server:**
```bash
cd WiLang-server
npm install
npm start
# Server running on http://localhost:3000
```

**Terminal 2 - React Native App:**
```bash
cd WiLang
yarn start
# Choose your platform:
# - Press 'a' for Android
# - Press 'i' for iOS
# - Press 'w' for web
```

### Development

```bash
# Start the development server
yarn start

# Run on specific platforms
yarn android    # Android device/emulator
yarn ios        # iOS simulator
yarn web        # Web browser
```

### Common Startup Issues & Solutions

**"Metro bundler failed to start"**
```bash
# Clear Metro cache
npx expo start --clear
# or
yarn start --clear
```


**"Android build failed"**
```bash
# Clean and rebuild
cd android
./gradlew clean
cd ..
npx expo run:android --clear
```

**"iOS build failed"**
```bash
# Clean iOS build
cd ios
xcodebuild clean
rm -rf build/
pod install
cd ..
npx expo run:ios --clear
```

**"Firebase configuration error"**
```bash
# Verify files exist
ls android/app/google-services.json
ls ios/WiLang/GoogleService-Info.plist

# Check environment variables
echo $FIREBASE_PROJECT_ID
```

**"WebRTC connection failed"**
```bash
# Make sure signaling server is running
curl http://localhost:3000
# Should return server status

# Check server logs in Terminal 1
# Restart server if needed
```

### Testing the Setup

#### 1. Verify Signaling Server
```bash
# Test server endpoint
curl http://localhost:3000
# Should return: {"message": "WiLang WebRTC Signaling Server", "status": "Running", ...}

# Check WebSocket connection (in browser console)
const socket = io('http://localhost:3000');
socket.on('connect', () => console.log('Connected to signaling server'));
```

#### 2. Test Authentication
1. Open the app
2. Try registering with email/password
3. Test Google Sign-In (if configured)
4. Verify you can log in and out

#### 3. Test Video Calling
1. **Single Device Test:**
   - Create an instant meeting
   - Note the meeting ID
   - Join the same meeting from a web browser
   - You should see yourself in both windows

2. **Multi-Device Test:**
   - Use two devices (or device + browser)
   - Sign in with different accounts
   - Create meeting on one device
   - Join meeting on second device
   - Test audio/video controls

#### 4. Test Contact Integration
1. Grant contacts permission
2. Verify contacts load correctly
3. Try initiating a video call from contacts
4. Test contact search functionality

### Quick Development Tips

```bash
# Hot reload after code changes
# Press 'r' in terminal to reload
# Press 'j' to open debugger

# Clear all caches if issues persist
npx expo start --clear --reset-cache

# View app logs
npx expo logs

# Debug network requests
npx expo start --dev-client --clear
```

### Performance Optimization for Development

```bash
# Use development build for better performance
npx expo install expo-dev-client
npx expo run:android --variant debug
npx expo run:ios --configuration Debug

# Enable debugging
export EXPO_DEBUG=true
export DEBUG=expo:*
```

## Configuration Requirements

### Firebase Setup
1. **Create a Firebase project** at [Firebase Console](https://console.firebase.google.com)
2. **Enable Authentication** with Email/Password and Google Sign-In
3. **Enable Firestore** for user data storage
4. **Download configuration files:**
   - Android: `google-services.json`
   - iOS: `GoogleService-Info.plist`
5. **Configure environment variables** (see Installation section)

### WebRTC Signaling Server
WiLang requires a signaling server for WebRTC connections. The app connects to the server configured in the .env file.

The signaling server handles:
- User registration and discovery
- Meeting room creation and management
- WebRTC offer/answer/ICE candidate exchange
- Real-time participant updates

### Device Permissions
The app requires the following permissions:
- **Camera** - for video calls
- **Microphone** - for audio communication
- **Contacts** - for accessing device contacts (optional)
- **Network** - for WebRTC connections

## App Structure

### Tab Navigation
1. **Calls Tab** - Create instant meetings, join existing meetings, view upcoming calls
2. **Contacts Tab** - Access device contacts, initiate video calls
3. **History Tab** - View call history and past meetings
4. **Settings Tab** - User preferences and account management

### Key Screens
- **Authentication** - Login/Register with email or Google
- **Video Call** - Full-screen video calling interface
- **Instant Call** - Quick meeting creation and sharing
- **Users** - Connected users and meeting participants

### Core Features
- **Meeting Rooms**: Create shareable meeting IDs for group calls
- **One-on-One Calls**: Direct calling from contacts
- **Real-time Communication**: WebRTC with fallback signaling
- **User Management**: Firebase Authentication with profile sync

## Development Workflow

### Scripts Available
```bash
# Development
yarn start              # Start Expo development server
yarn android           # Run on Android device/emulator
yarn ios               # Run on iOS simulator
yarn web               # Run in web browser

# Building
yarn build:android     # Build Android APK/AAB with EAS
yarn build:ios         # Build iOS app with EAS

# Code Quality
yarn lint              # Run ESLint
yarn test              # Run Jest tests
```

### Build Profiles
- **Development**: Local testing with development client
- **Preview**: Internal distribution (APK for Android)
- **Production**: App store distribution (AAB/IPA)

### Environment Variables
Production builds automatically use environment variables configured in the Expo project settings and local `.env` file.

### Key Components

#### WebRTC Provider (`src/store/WebRTCProvider.tsx`)
- Manages WebRTC connections and peer-to-peer communication
- Handles meeting creation, joining, and participant management
- Provides camera/microphone controls and stream management
- Integrates with Socket.IO for signaling

#### Firebase Services (`src/services/`)
- **Authentication**: Email/password and Google Sign-In
- **User Management**: Profile storage and retrieval
- **Security**: Input validation and secure credential handling

#### Video Call Interface
- **VideoCallScreen**: Full-screen calling with controls
- **InstantCallScreen**: Quick meeting setup and sharing
- **Contact Integration**: Direct calling from device contacts

## Technical Implementation

### Core Technologies
- **Framework**: React Native with Expo SDK 53
- **Language**: TypeScript for type safety
- **Navigation**: React Navigation 7 with native stack and tab navigators
- **UI Library**: React Native Elements (RNEUI) with custom styling
- **Authentication**: Firebase Auth with multi-provider support
- **Real-time Communication**: WebRTC with Socket.IO signaling
- **State Management**: React Context with custom providers
- **Styling**: StyleSheet with LinearGradient and animations

### WebRTC Architecture
```typescript
// Connection Flow
1. User Registration → Socket.IO connection
2. Meeting Creation → Generate unique meeting ID
3. Participant Joining → WebRTC peer connection setup
4. Media Exchange → Audio/video stream sharing
5. Real-time Signaling → Offer/Answer/ICE candidates
```

#### Key WebRTC Features
- **Peer-to-peer connections** with STUN/TURN server support
- **Meeting rooms** with multi-participant support
- **Real-time signaling** via Socket.IO
- **Media controls** (mute, camera switch, screen sharing ready)
- **Connection status** monitoring and error handling

### Firebase Integration
- **Authentication Providers**: Email/Password, Google Sign-In
- **User Management**: Profile creation and persistence
- **Security Rules**: Firestore security for user data
- **Environment-based Configuration**: Development/production separation

### Performance Optimizations
- **Lazy Loading**: Dynamic imports for heavy components
- **Memory Management**: Proper cleanup of WebRTC connections
- **Network Efficiency**: Optimized signaling and media transmission
- **UI Responsiveness**: Smooth animations with native driver

## Deployment

### Signaling Server
The app requires a WebRTC signaling server for production use. A Node.js/Socket.IO server is included in the `WiLang-server` directory:

```bash
# Deploy to Render, Heroku, or similar
cd ../WiLang-server
npm install
npm start
```

Server endpoints:
- `GET /` - Server status and health check
- `GET /health` - Health monitoring
- `GET /meeting/:id` - Meeting information
- **WebSocket** - Real-time signaling via Socket.IO

### Environment Configuration
Update the `SERVER_URL` in `src/store/WebRTCProvider.tsx`:
```typescript
const SERVER_URL = __DEV__ 
  ? 'http://localhost:3000' 
  : 'https://server-domain.com';
```

## 🔧 Troubleshooting

### Common Issues

**Camera/Microphone Permission Denied**
```bash
# Check app permissions in device settings
# Re-install the app to reset permissions
expo install expo-camera
```

**WebRTC Connection Failed**
- Ensure signaling server is running and accessible
- Check network connectivity and firewall settings
- Verify STUN/TURN server configuration
- Test with different networks (WiFi vs cellular)

**Build Failures**
```bash
# Clear caches
expo start --clear
yarn cache clean
npx expo install --fix

# Reset development client
npx expo run:android --clear
npx expo run:ios --clear
```

### Debugging Tips
1. **Enable debug logs** in development mode
2. **Check React Native debugger** for WebRTC status
3. **Monitor network requests** in browser dev tools
4. **Test signaling server** independently with Socket.IO client

## Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Install dependencies: `yarn install`
4. Set up environment variables
5. Start development server: `yarn start`

### Code Standards
- **TypeScript** for all new code
- **ESLint** configuration must pass
- **Prettier** for code formatting
- **Component structure** following established patterns

### Testing
```bash
yarn test              # Run unit tests
yarn lint              # Check code quality
yarn build:android     # Test production build
```

### Pull Request Process
1. Update documentation for any user-facing changes
2. Add tests for new functionality
3. Ensure all tests pass
4. Update version numbers following semantic versioning
5. Submit PR with clear description of changes

## License

This project is licensed under the GNU AFFERO GENERAL PUBLIC v3.0 License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Expo** team for the excellent development platform
- **React Native WebRTC** community for media capabilities
- **Firebase** for authentication and backend services
- **Socket.IO** for real-time communication
- **RNEUI** for beautiful UI components
