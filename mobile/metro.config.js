const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

// Allow ethers.js to resolve properly in React Native
config.resolver.unstable_enablePackageExports = false

module.exports = config
