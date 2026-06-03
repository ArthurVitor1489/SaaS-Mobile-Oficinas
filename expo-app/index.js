console.log('[@OficinaPro] Custom index.js starting...');
import './src/services/polyfills';
console.log('[@OficinaPro] Polyfills imported.');
import registerRootComponent from 'expo/src/launch/registerRootComponent';
import App from './App';
console.log('[@OficinaPro] App loaded, registering root component...');
registerRootComponent(App);
