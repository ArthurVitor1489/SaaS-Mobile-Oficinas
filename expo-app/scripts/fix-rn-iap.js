const fs = require('fs');
const path = require('path');

const filePath = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-iap',
  'android',
  'src',
  'play',
  'java',
  'com',
  'dooboolab',
  'rniap',
  'RNIapModule.kt'
);

if (fs.existsSync(filePath)) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('val activity = currentActivity')) {
    content = content.replace(
      'val activity = currentActivity',
      'val activity = reactApplicationContext.currentActivity'
    );
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('[postinstall] Patched react-native-iap RNIapModule.kt for React Native 0.81 compatibility.');
  } else {
    console.log('[postinstall] react-native-iap RNIapModule.kt already patched.');
  }
}
