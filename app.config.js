require('dotenv').config();

export default {
  expo: {
    name: "WhisperLang",
    slug: "whisperlang",
    version: "1.0.1",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    permissions: [
      "CONTACTS"
    ],
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#3754AB"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.gorai.whisperlang",
      googleServicesFile: "./ios/WhisperLang/GoogleService-Info.plist",
      infoPlist: {
        NSContactsUsageDescription: "WhisperLang needs access to your contacts to help you connect with friends and family for video calls.",
        NSCameraUsageDescription: "WhisperLang needs access to your camera for video calls.",
        NSMicrophoneUsageDescription: "WhisperLang needs access to your microphone for voice and video calls.",
        CFBundleURLTypes: [
          {
            CFBundleURLName: "google",
            CFBundleURLSchemes: ["com.googleusercontent.apps.766424113100-vli0c36l3co3befsignlc15eorsuqtfa"]
          }
        ]
      },
      scheme: "com.gorai.whisperlang"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#3754AB"
      },
      package: "com.gorai.whisperlang",
      googleServicesFile: "./android/app/google-services.json",
      permissions: [
        "android.permission.READ_CONTACTS",
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
        "android.permission.ACCESS_NETWORK_STATE",
        "android.permission.CHANGE_NETWORK_STATE",
        "android.permission.MODIFY_AUDIO_SETTINGS"
      ]
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      eas: {
        projectId: "#"
      },
      FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
      FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
      FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
      FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID,
      FIREBASE_APP_ID: process.env.FIREBASE_APP_ID,
      FIREBASE_MEASUREMENT_ID: process.env.FIREBASE_MEASUREMENT_ID,
      GOOGLE_SIGN_IN_WEB_CLIENT_ID: process.env.GOOGLE_SIGN_IN_WEB_CLIENT_ID,
      GOOGLE_SIGN_IN_IOS_CLIENT_ID: process.env.GOOGLE_SIGN_IN_IOS_CLIENT_ID
    },
    plugins: [
      [
        "expo-build-properties",
        {
          ios: {
            useFrameworks: "static"
          }
        }
      ],
      [
        "expo-contacts",
        {
          contactsPermission: "WhisperLang needs access to your contacts to help you connect with friends and family for video calls."
        }
      ]
    ]
  }
};