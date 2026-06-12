// Crypto polyfill — must run before any ethers import
try {
  const ExpoRandom = require('expo-crypto')
  if (typeof global.crypto === 'undefined') global.crypto = {}
  if (typeof global.crypto.getRandomValues !== 'function') {
    global.crypto.getRandomValues = function (array) {
      const bytes = ExpoRandom.getRandomBytes(array.byteLength)
      for (let i = 0; i < array.length; i++) array[i] = bytes[i]
      return array
    }
  }
} catch (_) {}

require('expo-router/entry')
