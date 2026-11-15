// https://docs.expo.dev/guides/customizing-metro
const fs = require('fs');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = withNativeWind(getDefaultConfig(__dirname), { input: './global.css', inlineRem: 16 });

// pnpm: react-native-css-interop có thể được Metro thấy qua 2 đường dẫn
// (node_modules/react-native-css-interop do publicHoistPattern, và node_modules/.pnpm/...).
// Hai đường dẫn = hai bản module: CSS nạp vào bản này, component đọc style ở bản kia → app mất hết style.
// Ép mọi file của gói về đường dẫn thật để chỉ còn một bản.
const resolveWithNativeWind = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const res = (resolveWithNativeWind ?? context.resolveRequest)(context, moduleName, platform);
  if (res?.type === 'sourceFile' && res.filePath.includes('react-native-css-interop')) {
    return { ...res, filePath: fs.realpathSync(res.filePath) };
  }
  return res;
};

module.exports = config;
