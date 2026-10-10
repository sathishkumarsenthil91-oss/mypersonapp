import {readFileSync,writeFileSync,existsSync} from 'node:fs';
const path='android/app/src/main/AndroidManifest.xml';
if(!existsSync(path))throw Error('Android project missing: npm run android:init');
let xml=readFileSync(path,'utf8');
if(!xml.includes('android:scheme="quickit"')){
 const start=xml.indexOf('<activity');
 const end=xml.indexOf('</activity>',start);
 if(start<0||end<0)throw Error('Could not find Android activity');
 xml=xml.slice(0,end)+[
 '  <intent-filter>',
 '    <action android:name="android.intent.action.VIEW" />',
 '    <category android:name="android.intent.category.DEFAULT" />',
 '    <category android:name="android.intent.category.BROWSABLE" />',
 '    <data android:scheme="quickit" android:host="auth" android:path="/callback" />',
 '  </intent-filter>',
 ].join('\n')+'\n'+xml.slice(end);
 writeFileSync(path,xml);
}
console.log('Android Google OAuth deep-link registered.');
