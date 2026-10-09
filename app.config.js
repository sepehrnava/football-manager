// Build-time additions to app.json:
// - Google's Firebase file for Android, once downloaded into the project root (README, Cloud save).
// - AdMob app IDs from EXPO_PUBLIC_ADMOB_*_APP_ID, else Google's public test app IDs (README, Ads).
const fs = require('fs');

const TEST_APP_IDS = {
  android: 'ca-app-pub-3940256099942544~3347511713',
  ios: 'ca-app-pub-3940256099942544~1458002511',
};

module.exports = ({ config }) => {
  const android = { ...config.android };
  if (fs.existsSync('./google-services.json')) android.googleServicesFile = './google-services.json';
  const ads = [
    'react-native-google-mobile-ads',
    {
      androidAppId: process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID || TEST_APP_IDS.android,
      iosAppId: process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID || TEST_APP_IDS.ios,
      userTrackingUsageDescription:
        'Lets us show ads that fit your interests. Ads keep Top Squad free to play.',
    },
  ];
  return { ...config, android, plugins: [...(config.plugins ?? []), ads] };
};
