// Adds Google's Firebase file for Android builds once it has been downloaded into the
// project root (see README, Cloud save setup). Everything else lives in app.json.
const fs = require('fs');

module.exports = ({ config }) => {
  if (!fs.existsSync('./google-services.json')) return config;
  return { ...config, android: { ...config.android, googleServicesFile: './google-services.json' } };
};
