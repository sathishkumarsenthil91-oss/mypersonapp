import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {appId:'com.quickit.hub',appName:'Quick IT',webDir:'dist',android:{allowMixedContent:false},plugins:{SplashScreen:{launchShowDuration:1200,backgroundColor:'#F9F8FF',showSpinner:false}}};
export default config;
