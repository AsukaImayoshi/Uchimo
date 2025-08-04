// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const { wrapWithReanimatedMetroConfig } = require('react-native-reanimated/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

// SVG対応
defaultConfig.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer');
defaultConfig.resolver.assetExts = defaultConfig.resolver.assetExts.filter(ext => ext !== 'svg');
defaultConfig.resolver.sourceExts = [...defaultConfig.resolver.sourceExts, 'mjs'];
defaultConfig.resolver.sourceExts.push('svg', 'cjs', 'mjs');

// 不安定なパッケージエクスポート回避
defaultConfig.resolver.unstable_enablePackageExports = false;

// wrap with Reanimated
const withReanimated = wrapWithReanimatedMetroConfig(defaultConfig);

// NativeWindのスタイル読み込み
module.exports = withNativeWind(withReanimated, {
  input: './global.css',
});
