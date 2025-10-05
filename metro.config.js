const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts.push('cjs');

config.resolver.unstable_enablePackageExports = false;

const originalGetModulesRunBeforeMainModule = config.serializer.getModulesRunBeforeMainModule;

config.serializer.getModulesRunBeforeMainModule = (entryFilePath) => {
  const modules = originalGetModulesRunBeforeMainModule(entryFilePath);
  return modules.filter(module => {
    if (module && typeof module === 'object' && module.path) {
      return path.isAbsolute(module.path) || module.path.startsWith('.');
    }
    return true;
  });
};

module.exports = config;
