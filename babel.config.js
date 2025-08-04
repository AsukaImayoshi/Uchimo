//babel.config.js
module.exports = function (api) {
  api.cache(true);  // キャッシュの設定を1回だけ行う

  return {
    presets: [
          ["babel-preset-expo", { jsxImportSource: "nativewind" }],
          "nativewind/babel",
    ],
    plugins: [
    '@babel/plugin-proposal-export-namespace-from',
    'react-native-reanimated/plugin',
    ],
  };
};
