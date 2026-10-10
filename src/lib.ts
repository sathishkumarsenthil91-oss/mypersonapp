import {createClient} from '@supabase/supabase-js';
import {Capacitor} from '@capacitor/core';
import {Browser} from '@capacitor/browser';
import {App} from '@capacitor/app';

export const API_URL=import.meta.env.VITE_SUPABASE_URL?.trim() || '';
export const API_KEY=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || '';
export const configured=Boolean(API_URL&&API_KEY&&!API_URL.includes('YOUR_PROJECT_REF')&&!API_KEY.includes('REPLACE_ME'));
export const supabase=configured?createClient(API_URL,API_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:!Capacitor.isNativePlatform(),flowType:'pkce'}}):null;
export type Folder={id:string;display_id:string;owner_id:string;parent_id:string|null;name:string;favorite:boolean;created_at:string};
export type Item={id:string;display_id:string;owner_id:string;folder_id:string|null;title:string;description:string|null;kind:string;tags:string[];url:string|null;content:string|null;storage_path:string|null;size_bytes:number;created_at:string;favorite:boolean};
export type Task={id:string;owner_id:string;title:string;done:boolean;due_at:string|null;created_at:string};
export type Group={id:string;owner_id:string;display_id:string;name:string;description:string|null;visibility:'public'|'private';created_at:string};
export type GroupItem={id:string;group_id:string;author_id:string;title:string;content:string|null;url:string|null;created_at:string};
export type Chat={id:string;role:'user'|'assistant';content:string};
export type View='home'|'ai'|'save'|'storage'|'gallery'|'prompts'|'notes'|'learning'|'code'|'planner'|'groups'|'settings';
export const typeIcons:Record<string,string>={photo:'🖼️',pdf:'📕',video:'🎬',note:'📝',prompt:'✨',link:'🔗',social:'🌐',code:'💻',document:'📄',other:'📦'};
export function prettySize(n:number){if(!n)return '0 B';if(n<1024)return n+' B';if(n<1024**2)return (n/1024).toFixed(1)+' KB';return (n/1024**2).toFixed(1)+' MB'}
export function friendlyDate(value:string){return new Date(value).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}
export function readableError(e:unknown){return e instanceof Error?e.message:String(e)}
export function displayId(prefix:string){return prefix+'-'+crypto.randomUUID().split('-')[0].toUpperCase()}
export async function loginWithGoogle(){
 if(!supabase)throw Error('Connect your Supabase project first.');
 const native=Capacitor.isNativePlatform();
 const redirectTo=native?'quickit://auth/callback':window.location.origin+'/';
 const {data,error}=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo,skipBrowserRedirect:native}});
 if(error)throw error;
 if(native&&data.url)await Browser.open({url:data.url,windowName:'_self'});
}
export function watchNativeOAuth(){
 if(!Capacitor.isNativePlatform()||!supabase)return ()=>{};
 let disposed=false;let remove=()=>{};
 App.addListener('appUrlOpen',async event=>{
  if(disposed||!event.url.startsWith('quickit://auth/callback'))return;
  await Browser.close().catch(()=>{});
  const url=new URL(event.url);
  const code=url.searchParams.get('code');
  if(code){const {error}=await supabase!.auth.exchangeCodeForSession(code);if(error)alert(error.message)}
 }).then(handle=>{if(disposed)handle.remove();else remove=()=>handle.remove()});
 return ()=>{disposed=true;remove()};
}
