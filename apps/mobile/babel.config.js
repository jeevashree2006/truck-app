module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // expo-router/babel is included in babel-preset-expo for SDK 50+,
      // so it is not listed separately here.
      // react-native-reanimated/plugin MUST be listed last.
      'react-native-reanimated/plugin',
    ],
  };
};
