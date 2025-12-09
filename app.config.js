require('dotenv').config();

export default {
  expo: {
    name: "WiLang",
    slug: "wilang",
    version: "1.3.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    permissions: [
      "CONTACTS"
    ],
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#585EAF"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.gorai.wilanger",
      googleServicesFile: "./ios/WiLang/GoogleService-Info.plist",
      deploymentTarget: "18.0",
      infoPlist: {
        NSContactsUsageDescription: "WiLang needs access to your contacts to help you connect with friends and family for video calls.",
        NSCameraUsageDescription: "WiLang needs access to your camera for video calls.",
        NSMicrophoneUsageDescription: "WiLang needs access to your microphone for voice and video calls.",
        NSSpeechRecognitionUsageDescription: "WiLang needs access to speech recognition for real-time subtitle transcription.",
        NSPhotoLibraryUsageDescription: "WiLang needs access to your photo library to save or share media from video calls.",
        UIBackgroundModes: ["audio", "voip"],
        CFBundleURLTypes: [
          {
            CFBundleURLName: "google",
            CFBundleURLSchemes: ["com.googleusercontent.apps.766424113100-vli0c36l3co3befsignlc15eorsuqtfa"]
          }
        ]
      },
      scheme: "com.gorai.wilanger"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#3754AB"
      },
      package: "com.gorai.wilanger",
      googleServicesFile: "./android/app/google-services.json",
      permissions: [
        "android.permission.READ_CONTACTS",
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
        "android.permission.ACCESS_NETWORK_STATE",
        "android.permission.CHANGE_NETWORK_STATE",
        "android.permission.MODIFY_AUDIO_SETTINGS",
        "android.permission.SYSTEM_ALERT_WINDOW",
        "android.permission.VIBRATE"
      ]
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      eas: {
        projectId: "146b3cbc-1d82-4c4b-9f27-746b6274af08"
      },
      FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
      FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
      FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
      FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID,
      FIREBASE_APP_ID: process.env.FIREBASE_APP_ID,
      FIREBASE_MEASUREMENT_ID: process.env.FIREBASE_MEASUREMENT_ID,
      GOOGLE_SIGN_IN_WEB_CLIENT_ID: process.env.GOOGLE_SIGN_IN_WEB_CLIENT_ID,
      GOOGLE_SIGN_IN_IOS_CLIENT_ID: process.env.GOOGLE_SIGN_IN_IOS_CLIENT_ID,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY
    },
    plugins: [
      "expo-font",
      "expo-web-browser",
      "expo-router",
      "expo-sqlite",
      "expo-secure-store",
      "expo-audio",
      [
        "expo-build-properties",
        {
          "android": {
            "minSdkVersion": 28
          },
          "ios": {
            "deploymentTarget": "18.0"
          }
        }
      ],
      [
        "expo-contacts",
        {
          contactsPermission: "WiLang needs access to your contacts to help you connect with friends and family for video calls."
        }
      ],
      [
        "expo-speech-recognition",
        {
          microphonePermission: "WiLang needs microphone access for real-time speech transcription.",
          speechRecognitionPermission: "WiLang needs speech recognition access for real-time subtitle transcription."
        }
      ],
      "./app.plugin.js"
    ]
  }
};