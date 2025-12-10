module.exports = function(api) {
  api.cache(true);
  const plugins = [
    ['module:react-native-dotenv', {
      moduleName: '@env',
      path: '.env',
      blocklist: null,
      allowlist: null,
      safe: false,
      allowUndefined: true,
      verbose: false,
    }],
    'react-native-reanimated/plugin',
  ];
  if (process.env.NODE_ENV === 'production') {
    plugins.push('transform-remove-console');
  }
  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
