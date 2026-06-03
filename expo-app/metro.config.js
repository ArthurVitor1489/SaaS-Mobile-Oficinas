const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for resolving .mjs files (used by lucide-react-native and other modern modules)
if (config.resolver && config.resolver.sourceExts) {
  config.resolver.sourceExts.push('mjs');
}

module.exports = config;
