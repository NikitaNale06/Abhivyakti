const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Register .tflite as asset
config.resolver.assetExts.push('tflite');
config.resolver.assetExts.push('task');

// Ensure JSON is treated as source
config.resolver.sourceExts.push('json');

// Exclude training python & keras artifacts from Metro bundler watcher
config.resolver.blockList = [
  /.*\.py$/,
  /.*\.keras$/,
  /.*\.pkl$/,
];

// Disable strict JSON parsing (Hermes issue with large JSON)
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    ...config.transformer?.minifierConfig,
    keep_classnames: true,
    keep_fnames: true,
    mangle: false,
  },
};

module.exports = config;