# Add project specific ProGuard rules here.# Add project specific ProGuard rules here.

# By default, the flags in this file are appended to flags specified# By default, the flags in this file are appended to flags specified

# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt

# You can edit the include path and order by changing the proguardFiles# You can edit the include path and order by changing the proguardFiles

# directive in build.gradle.# directive in build.gradle.

##

# For more details, see# For more details, see

#   http://developer.android.com/guide/developing/tools/proguard.html#   http://developer.android.com/guide/developing/tools/proguard.html



# react-native-reanimated# react-native-reanimated

-keep class com.swmansion.reanimated.** { *; }-keep class com.swmansion.reanimated.** { *; }

-keep class com.facebook.react.turbomodule.** { *; }-keep class com.facebook.react.turbomodule.** { *; }



# Firebase# Firebase

-keep class com.google.firebase.** { *; }-keep class com.google.firebase.** { *; }

-keep class com.google.android.gms.** { *; }-keep class com.google.android.gms.** { *; }

-dontwarn com.google.firebase.**-dontwarn com.google.firebase.**

-dontwarn com.google.android.gms.**-dontwarn com.google.android.gms.**



# Google Sign-In# Google Sign-In

-keep class com.google.android.gms.auth.** { *; }-keep class com.google.android.gms.auth.** { *; }



# WebRTC# WebRTC

-keep class org.webrtc.** { *; }-keep class org.webrtc.** { *; }

-dontwarn org.webrtc.**-dontwarn org.webrtc.**



# Socket.io# Socket.io

-keep class io.socket.** { *; }-keep class io.socket.** { *; }

-dontwarn io.socket.**-dontwarn io.socket.**



# OkHttp (used by socket.io)# OkHttp (used by socket.io)

-keep class okhttp3.** { *; }-keep class okhttp3.** { *; }

-keep interface okhttp3.** { *; }-keep interface okhttp3.** { *; }

-dontwarn okhttp3.**-dontwarn okhttp3.**

-dontwarn okio.**-dontwarn okio.**



# CallKeep# CallKeep

-keep class io.wazo.callkeep.** { *; }-keep class io.wazo.callkeep.** { *; }

-dontwarn io.wazo.callkeep.**-dontwarn io.wazo.callkeep.**



# Expo modules# Expo modules

-keep class expo.modules.** { *; }-keep class expo.modules.** { *; }

-dontwarn expo.modules.**-dontwarn expo.modules.**



# React Native# React Native

-keep class com.facebook.react.** { *; }-keep class com.facebook.react.** { *; }

-keep class com.facebook.hermes.** { *; }-keep class com.facebook.hermes.** { *; }

-dontwarn com.facebook.react.**-dontwarn com.facebook.react.**



# ML Kit Translation# ML Kit Translation

-keep class com.google.mlkit.** { *; }-keep class com.google.mlkit.** { *; }

-dontwarn com.google.mlkit.**-dontwarn com.google.mlkit.**


# Add any project specific keep options here:
