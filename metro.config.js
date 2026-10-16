const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

 /**
+ * Metro configuration
+ * https://facebook.github.io/metro/docs/configuration
  *
+ * @type {import('metro-config').MetroConfig}
  */
const config = {
  resolver: {
    // Watchman can stall `watch-project` on this machine and block the Vega bundle.
    useWatchman: false,
  },
};
 
module.exports = mergeConfig(getDefaultConfig(__dirname), config);