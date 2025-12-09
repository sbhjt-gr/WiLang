const { withAppBuildGradle, withAndroidManifest, withAppDelegate, createRunOncePlugin } = require('@expo/config-plugins');

const TRANSLATE_DEP = "implementation 'com.google.mlkit:translate:17.0.2'";
const LANGUAGE_ID_DEP = "implementation 'com.google.mlkit:language-id:17.0.5'";

const ensureDependency = (contents, dependency) => {
  if (contents.includes(dependency)) {
    return contents;
  }
  return contents.replace(/dependencies\s*{/, match => `${match}\n    ${dependency}`);
};

const withTranslationDependencies = config => {
  return withAppBuildGradle(config, gradleConfig => {
    let contents = gradleConfig.modResults.contents;
    contents = ensureDependency(contents, TRANSLATE_DEP);
    contents = ensureDependency(contents, LANGUAGE_ID_DEP);
    gradleConfig.modResults.contents = contents;
    return gradleConfig;
  });
};

const withCallScreenAttrs = config => {
  return withAndroidManifest(config, manifestConfig => {
    const manifest = manifestConfig.modResults;
    const app = manifest.manifest.application[0];
    const activities = app.activity || [];

    for (const activity of activities) {
      if (activity.$['android:name'] === '.MainActivity') {
        activity.$['android:showWhenLocked'] = 'true';
        activity.$['android:turnScreenOn'] = 'true';
      }
    }

    return manifestConfig;
  });
};

const voipDelegateCode = `
import PushKit

extension AppDelegate: PKPushRegistryDelegate {
  func setupVoIP() {
    let registry = PKPushRegistry(queue: DispatchQueue.main)
    registry.delegate = self
    registry.desiredPushTypes = [.voIP]
  }
  
  func pushRegistry(_ registry: PKPushRegistry, didUpdate pushCredentials: PKPushCredentials, for type: PKPushType) {
    let token = pushCredentials.token.map { String(format: "%02.2hhx", $0) }.joined()
    RNCCallKeep.registerVoipPushToken(token: token)
  }
  
  func pushRegistry(_ registry: PKPushRegistry, didReceiveIncomingPushWith payload: PKPushPayload, for type: PKPushType, completion: @escaping () -> Void) {
    let data = payload.dictionaryPayload
    
    guard let callId = data["callId"] as? String,
          let callerName = data["callerName"] as? String else {
      completion()
      return
    }
    
    RNCCallKeep.reportNewIncomingCall(
      uuidString: callId,
      handle: callerName,
      handleType: "generic",
      hasVideo: true,
      localizedCallerName: callerName,
      supportsHolding: false,
      supportsDTMF: false,
      supportsGrouping: false,
      supportsUngrouping: false,
      fromPushKit: true,
      payload: data as? [String: Any]
    )
    
    completion()
  }
}
`;

const withVoipPush = config => {
  return withAppDelegate(config, delegateConfig => {
    let contents = delegateConfig.modResults.contents;
    
    if (!contents.includes('import PushKit')) {
      contents = contents.replace(
        'import React',
        'import React\nimport RNCCallKeep'
      );
      
      const classEndIndex = contents.lastIndexOf('}');
      contents = contents.slice(0, classEndIndex) + 
        '\n  public func applicationDidBecomeActive(_ application: UIApplication) {\n    setupVoIP()\n  }\n' +
        contents.slice(classEndIndex);
      
      contents += voipDelegateCode;
    }
    
    delegateConfig.modResults.contents = contents;
    return delegateConfig;
  });
};

const withPlugins = config => {
  config = withTranslationDependencies(config);
  config = withCallScreenAttrs(config);
  config = withVoipPush(config);
  return config;
};

module.exports = createRunOncePlugin(withPlugins, 'wilang-plugin', '1.0.0');
