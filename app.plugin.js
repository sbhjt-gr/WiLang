const { withAppBuildGradle, withAndroidManifest, createRunOncePlugin } = require('@expo/config-plugins');

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

const withPlugins = config => {
  config = withTranslationDependencies(config);
  config = withCallScreenAttrs(config);
  return config;
};

module.exports = createRunOncePlugin(withPlugins, 'wilang-plugin', '1.0.0');
