import {useEffect,useMemo,useRef,useState} from 'react';
import type {User} from '@supabase/supabase-js';
import {Activity,ArrowDownToLine,ArrowLeft,ArrowRight,BookOpen,CalendarDays,Check,ChevronDown,ChevronRight,Clipboard,Cloud,Code2,Copy,FileText,Folder,FolderPlus,Grid2X2,HardDrive,Heart,Home,Image,Link2,LogOut,Menu,MessageCircle,Mic,MoreHorizontal,Plus,Search,Send,Settings,ShieldCheck,Sparkles,Trash2,UploadCloud,Users,Video, X} from 'lucide-react';
import {API_URL,Chat,configured,displayId,Folder,friendlyDate,Group,GroupItem,Item,loginWithGoogle,prettySize,readableError,supabase,Task,typeIcons,View,watchNativeOAuth} from './lib';

type IconType=typeof Home;
type NavItem={key:View;label:string;icon:IconType};
const mainNav:NavItem[]=[{key:'home',label:'Dashboard',icon:Home},{key:'ai',label:'AI Assistant',icon:Sparkles},{key:'save',label:'Smart Save',icon:Plus},{key:'storage',label:'My Storage',icon:Folder},{key:'gallery',label:'Photo Gallery',icon:Image}];
const discoverNav:NavItem[]=[{key:'prompts',label:'Prompt Library',icon:MessageCircle},{key:'notes',label:'Personal Notes',icon:FileText},{key:'learning',label:'Learning Hub',icon:BookOpen},{key:'code',label:'Coding Projects',icon:Code2},{key:'planner',label:'Daily Planner',icon:CalendarDays},{key:'groups',label:'Community Groups',icon:Users}];
const bottomNav:NavItem[]=[{key:'home',label:'Home',icon:Home},{key:'ai',label:'AI',icon:Sparkles},{key:'save',label:'Save',icon:Plus},{key:'storage',label:'Files',icon:Folder},{key:'groups',label:'Groups',icon:Users}];
const KINDS=['link','pdf','photo','video','note','prompt','code','document','social','other'] as const;
const blank={title:'',kind:'link',url:'',content:'',description:'',tags:'',folderId:''};

export default function App(){
 const [user,setUser]=useState<User|null>(null);
 const [loading,setLoading]=useState(true);
 const [view,setView]=useState<View>('home');
 const [items,setItems]=useState<Item[]>([]);
 const [folders,setFolders]=useState<Folder[]>([]);
 const [tasks,setTasks]=useState<Task[]>([]);
 const [groups,setGroups]=useState<Group[]>([]);
 const [groupItems,setGroupItems]=useState<GroupItem[]>([]);
 const [messages,setMessages]=useState<Chat[]>([]);
 const [search,setSearch]=useState('');
 const [folderId,setFolderId]=useState<string|null>(null);
 const [activeGroup,setActiveGroup]=useState<string|null>(null);
 const [sort,setSort]=useState<'newest'|'name'|'size'>('newest');
 const [grid,setGrid]=useState(true);
 const [toast,setToast]=useState('');
 const [busy,setBusy]=useState(false);
 const [save,setSave]=useState(blank);
 const [file,setFile]=useState<File|null>(null);
 const [newFolder,setNewFolder]=useState('');
 const [chatText,setChatText]=useState('');
 const [taskText,setTaskText]=useState('');
 const [due,setDue]=useState('');
 const [groupName,setGroupName]=useState('');
 const [groupPrivate,setGroupPrivate]=useState(false);
 const [groupPost,setGroupPost]=useState('');
 const [inviteEmail,setInviteEmail]=useState('');
 const [shareLink,setShareLink]=useState('');
 const fileRef=useRef<HTMLInputElement|null>(null);
 const [authEmail,setAuthEmail]=useState('');
 const [authPassword,setAuthPassword]=useState('');
 const [signup,setSignup]=useState(false);
 const [mobileMenu,setMobileMenu]=useState(false);

 function notify(message:string){setToast(message);window.setTimeout(()=>setToast(''),5200)}
 async function run(job:()=>Promise<void>){setBusy(true);try{await job()}catch(e){notify(readableError(e))}finally{setBusy(false)}}

 async function refresh(){if(!supabase)return;
  const [i,f,t,g,gm]=await Promise.all([
   supabase.from('qi_items').select('*').order('created_at',{ascending:false}).limit(500),
   supabase.from('qi_folders').select('*').order('name').limit(500),
   supabase.from('qi_tasks').select('*').order('created_at',{ascending:false}).limit(500),
   supabase.from('qi_groups').select('*').order('created_at',{ascending:false}).limit(200),
   supabase.from('qi_ai_messages').select('id,role,content').order('created_at',{ascending:true}).limit(100),
  ]);
  for(const result of [i,f,t,g,gm])if(result.error)throw result.error;
  setItems((i.data||[]) as Item[]);setFolders((f.data||[]) as Folder[]);setTasks((t.data||[]) as Task[]);setGroups((g.data||[]) as Group[]);setMessages((gm.data||[]) as Chat[]);
 }
 async function fetchPosts(groupId:string){if(!supabase)return;
  const {data,error}=await supabase.from('qi_group_items').select('*').eq('group_id',groupId).order('created_at',{ascending:false});
  if(error)notify(error.message);else setGroupItems((data||[]) as GroupItem[]);
 }
 useEffect(()=>{
  if(!supabase){setLoading(false);return}
  const api=supabase;
  let live=true;
  api.auth.getUser().then(({data})=>{if(live)setUser(data.user)}).finally(()=>{if(live)setLoading(false)});
  const {data:{subscription}}=api.auth.onAuthStateChange((_event,session)=>{if(live)setUser(session?.user||null)});
  const unwatch=watchNativeOAuth();
  return()=>{live=false;subscription.unsubscribe();unwatch()};
 },[]);
 useEffect(()=>{if(user)refresh().catch(e=>notify(readableError(e)));else{setItems([]);setFolders([]);setTasks([]);setGroups([]);setMessages([])}},[user?.id]);
 useEffect(()=>{if(activeGroup)fetchPosts(activeGroup)},[activeGroup]);
 useEffect(()=>{if(!user)return;const timer=window.setInterval(()=>{if(document.visibilityState==='visible')refresh().catch(()=>{})},45000);return()=>window.clearInterval(timer)},[user?.id]);
 useEffect(()=>{if(!user||!supabase)return;
  const token=new URL(window.location.href).searchParams.get('invite');
  if(!token)return;
  run(async()=>{const {error}=await supabase!.rpc('qi_accept_invite',{p_token:token});if(error)throw error;notify('You joined the group!');history.replaceState({},'',location.pathname);await refresh();setView('groups')});
 },[user?.id]);

 const query=search.trim().toLowerCase();
 const filtered=useMemo(()=>items.filter(x=>!query||[x.title,x.description,x.display_id,x.kind,...(x.tags||[])].join(' ').toLowerCase().includes(query)).sort((a,b)=>sort==='name'?a.title.localeCompare(b.title):sort==='size'?b.size_bytes-a.size_bytes:b.created_at.localeCompare(a.created_at)),[items,query,sort]);
 const totalBytes=items.reduce((s,item)=>s+(item.size_bytes||0),0);
 const name=user?.user_metadata?.full_name?.split(' ')[0]||user?.email?.split('@')[0]||'there';
 const currentFolder=folders.find(f=>f.id===folderId);
 const categories=[{kind:'photo',name:'Images',shade:'pink'},{kind:'pdf',name:'Documents',shade:'blue'},{kind:'video',name:'Videos',shade:'violet'},{kind:'note',name:'Notes',shade:'yellow'}];
 function go(next:View){setView(next);setMobileMenu(false);setSearch('');if(next!=='storage')setFolderId(null)}
 function copy(text:string){navigator.clipboard.writeText(text).then(()=>notify('Copied to clipboard')).catch(()=>notify('Copy is unavailable in this browser'))}

 async function saveItem(){if(!supabase||!user)throw Error('Sign in first');
  if(!save.title.trim()&&!file)throw Error('Add a title or select a file');
  const kind=file?(file.type.startsWith('image/')?'photo':file.type.startsWith('video/')?'video':file.type.includes('pdf')?'pdf':save.kind):save.kind;
  let path:string|null=null;
  if(file){path=`${user.id}/${crypto.randomUUID()}/${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
   const {error}=await supabase.storage.from('quick-it-files').upload(path,file,{upsert:false,contentType:file.type||'application/octet-stream'});if(error)throw error;
  }
  const {error}=await supabase.from('qi_items').insert({owner_id:user.id,display_id:displayId('QIT'),title:save.title.trim()||file!.name,kind,description:save.description.trim()||null,content:save.content.trim()||null,url:save.url.trim()||null,tags:save.tags.split(',').map(t=>t.trim()).filter(Boolean),folder_id:save.folderId||null,storage_path:path,size_bytes:file?.size||0});
  if(error){if(path)await supabase.storage.from('quick-it-files').remove([path]);throw error}
  setSave(blank);setFile(null);notify('Saved privately to your vault');await refresh();go('storage');
 }
 async function addFolder(){if(!supabase||!user||!newFolder.trim())return;
  const {error}=await supabase.from('qi_folders').insert({owner_id:user.id,parent_id:folderId,display_id:displayId('FLD'),name:newFolder.trim()});if(error)throw error;
  setNewFolder('');notify('Folder created');await refresh();
 }
 async function toggleFavorite(item:Item){if(!supabase)return;const {error}=await supabase.from('qi_items').update({favorite:!item.favorite}).eq('id',item.id);if(error)throw error;await refresh()}
 async function deleteItem(item:Item){if(!supabase||!window.confirm(`Permanently delete "${item.title}"?`))return;
  if(item.storage_path){const {error}=await supabase.storage.from('quick-it-files').remove([item.storage_path]);if(error)throw error}
  const {error}=await supabase.from('qi_items').delete().eq('id',item.id);if(error)throw error;notify('Deleted');await refresh();
 }
 async function openItem(item:Item){if(!supabase)return;
  if(item.storage_path){const {data,error}=await supabase.storage.from('quick-it-files').createSignedUrl(item.storage_path,120);if(error)throw error;if(data?.signedUrl)window.open(data.signedUrl,'_blank','noopener,noreferrer');return}
  if(item.url){const dest=new URL(item.url);if(!['https:','http:'].includes(dest.protocol))throw Error('Only http(s) links can be opened');window.open(dest.href,'_blank','noopener,noreferrer');return}
  setSave({title:item.title,kind:item.kind,url:'',content:item.content||'',description:item.description||'',tags:(item.tags||[]).join(', '),folderId:item.folder_id||''});go('save');notify('Opened as a copy. Saving creates a new item.');
 }
 async function addTask(){if(!supabase||!user||!taskText.trim())return;
  const {error}=await supabase.from('qi_tasks').insert({owner_id:user.id,title:taskText.trim(),due_at:due?new Date(due).toISOString():null});if(error)throw error;setTaskText('');setDue('');await refresh();
 }
 async function toggleTask(t:Task){if(!supabase)return;const {error}=await supabase.from('qi_tasks').update({done:!t.done}).eq('id',t.id);if(error)throw error;await refresh()}
 async function createGroup(){if(!supabase||!user||!groupName.trim())return;
  const {error}=await supabase.from('qi_groups').insert({owner_id:user.id,display_id:displayId('GRP'),name:groupName.trim(),visibility:groupPrivate?'private':'public'});
  if(error)throw error;setGroupName('');notify('Group created');await refresh();
 }
 async function joinGroup(g:Group){if(!supabase||!user)return;
  const {error}=await supabase.from('qi_group_members').insert({group_id:g.id,user_id:user.id,role:'viewer'});if(error)throw error;notify('Joined public group');
 }
 async function postGroup(){if(!supabase||!user||!activeGroup||!groupPost.trim())return;
  const {error}=await supabase.from('qi_group_items').insert({group_id:activeGroup,author_id:user.id,title:groupPost.trim(),content:groupPost.trim()});if(error)throw error;setGroupPost('');await fetchPosts(activeGroup);
 }
 async function createInvite(){if(!supabase||!activeGroup||!inviteEmail.trim())return;
  const {data,error}=await supabase.rpc('qi_create_invite',{p_group_id:activeGroup,p_email:inviteEmail.trim()});if(error)throw error;
  const url=`${location.origin}/?invite=${encodeURIComponent(data as string)}`;setShareLink(url);notify('Private invite link created. Send it only to the intended email address.');
 }
 async function askAI(){if(!supabase||!user||!chatText.trim())return;
  const question=chatText.trim();setChatText('');
  const {error:saveError}=await supabase.from('qi_ai_messages').insert({owner_id:user.id,role:'user',content:question});if(saveError)throw saveError;
  setMessages(m=>[...m,{id:crypto.randomUUID(),role:'user',content:question}]);
  const {data,error}=await supabase.functions.invoke('quick-it-ai',{body:{prompt:question}});
  if(error)throw new Error(`AI assistant unavailable: ${error.message}. Check the Edge Function and its API secret.`);
  if(!data?.reply)throw Error('AI returned no response.');
  const {error:replyError}=await supabase.from('qi_ai_messages').insert({owner_id:user.id,role:'assistant',content:String(data.reply)});if(replyError)throw replyError;
  setMessages(m=>[...m,{id:crypto.randomUUID(),role:'assistant',content:String(data.reply)}]);
 }

 const action=(label:string,icon:IconType,click:()=>void,secondary=false)=>{const Icon=icon;return <button className={secondary?'btn btn-ghost':'btn btn-primary'} onClick={click} type="button"><Icon size={17}/>{label}</button>};
 const iconButton=(icon:IconType,title:string,click:()=>void)=>{const Icon=icon;return <button aria-label={title} title={title} className="icon-button" onClick={click}><Icon size={17}/></button>};
 const folderTile=(f:Folder)=><button key={f.id} className="folder-card glass" onClick={()=>{setFolderId(f.id);go('storage');setFolderId(f.id)}}><div className="folder-symbol"><Folder size={24} fill="#b3a5fd" strokeWidth={1.5}/></div><strong>{f.name}</strong><small>{items.filter(x=>x.folder_id===f.id).length} items</small></button>;
 const itemTile=(it:Item)=><div key={it.id} className={`item-row ${grid?'tile':''}`}><div className="file-icon">{typeIcons[it.kind]||'📦'}</div><div className="item-info"><strong title={it.title}>{it.title}</strong><small>{it.kind.toUpperCase()} · {friendlyDate(it.created_at)} · {it.display_id}</small></div><div className="item-controls">{iconButton(Copy,'Copy ID',()=>copy(it.display_id))}{iconButton(Heart,it.favorite?'Remove favorite':'Favorite',()=>run(()=>toggleFavorite(it)))}{iconButton(ArrowDownToLine,'Open or download',()=>run(()=>openItem(it)))}{iconButton(Trash2,'Delete',()=>run(()=>deleteItem(it)))}</div></div>;

 if(loading)return <div className="loading-screen"><img src="/app-icon.svg" alt="Quick IT"/><span>Preparing your space…</span></div>;
 if(!configured)return <div className="auth-scene"><div className="auth-card glass"><img className="auth-logo" src="/quick-it-logo.svg" alt="Quick IT"/><h1>One place for everything.</h1><p>This is the Quick IT application source. Connect a new Supabase project to activate accounts, storage and secure synchronization.</p><div className="notice"><ShieldCheck size={19}/>Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> in <code>.env</code>.</div><small>The interface will not impersonate a working backend.</small></div></div>;
 if(!user)return <div className="auth-scene"><div className="auth-card glass"><img className="auth-logo" src="/quick-it-logo.svg" alt="Quick IT"/><span className="eyebrow">YOUR PERSONAL DIGITAL SPACE</span><h1>{signup?'Create your space':'Welcome back'}</h1><p>Your notes, files, links and AI assistant — in sync across web and Android.</p><button className="google-button" onClick={()=>run(async()=>{await loginWithGoogle()})}><span className="google-g">G</span>Continue with Google<ArrowRight size={18}/></button><div className="auth-separator"><span>or with email</span></div><form onSubmit={e=>{e.preventDefault();run(async()=>{if(!supabase)return;const {error}=signup?await supabase.auth.signUp({email:authEmail,password:authPassword}):await supabase.auth.signInWithPassword({email:authEmail,password:authPassword});if(error)throw error;if(signup)notify('Account created. Check your email if verification is enabled.')})}}><input required type="email" placeholder="Your email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)}/><input required type="password" minLength={6} placeholder="Password" value={authPassword} onChange={e=>setAuthPassword(e.target.value)}/><button className="btn btn-primary full" disabled={busy}>{busy?'Please wait…':signup?'Create account':'Sign in'}<ArrowRight size={17}/></button></form><button className="text-button" onClick={()=>setSignup(!signup)}>{signup?'Already have an account? Sign in':'New to Quick IT? Create an account'}</button><p className="privacy"><ShieldCheck size={15}/>Your vault is private by default.</p></div></div>;

 const navButton=(nav:NavItem)=>{const Icon=nav.icon;return <button key={nav.key} className={`nav-link ${view===nav.key?'selected':''}`} onClick={()=>go(nav.key)}><Icon size={19}/><span>{nav.label}</span></button>};
 return <div className="shell">
  <aside className={`sidebar glass ${mobileMenu?'open':''}`}><button className="brand" onClick={()=>go('home')}><img src="/app-icon.svg" alt=""/><div><b>quick <em>it</em></b><small>PERSONAL AI HUB</small></div></button><div className="side-label">WORKSPACE</div><nav>{mainNav.map(navButton)}</nav><div className="side-label">YOUR COLLECTION</div><nav>{discoverNav.map(navButton)}</nav><div className="sidebar-bottom"><div className="upgrade-card"><span>✦</span><strong>Make room for ideas</strong><p>Organize your digital life effortlessly.</p><button onClick={()=>go('save')}>Save something <ArrowRight size={14}/></button></div>{navButton({key:'settings',label:'Settings',icon:Settings})}</div></aside>
  <div className="workspace"><header className="topbar"><button className="mobile-menu icon-button" onClick={()=>setMobileMenu(!mobileMenu)}><Menu size={20}/></button><div className="crumbs">Workspace <ChevronRight size={14}/> <strong>{[...mainNav,...discoverNav,{key:'settings' as View,label:'Settings',icon:Settings}].find(n=>n.key===view)?.label}</strong></div><div className="top-actions"><label className="global-search"><Search size={17}/><input aria-label="Global search" placeholder="Search files, tags or ID…" value={search} onChange={e=>setSearch(e.target.value)} onFocus={()=>{if(!['storage','gallery','notes','prompts','code','learning'].includes(view))setView('storage')}}/></label><button className="avatar" onClick={()=>go('settings')} title="Profile">{name.slice(0,1).toUpperCase()}</button></div></header>
  <main className="content">
   {view==='home'&&<><div className="page-title"><div><span className="eyebrow">YOUR SPACE, YOUR PACE</span><h1>Good to see you, {name} <span>✦</span></h1><p>Everything important, beautifully in one place.</p></div>{action('Smart Save',Plus,()=>go('save'))}</div><section className="hero glass"><div className="hero-text"><span className="hero-kicker"><Sparkles size={15}/> MEET YOUR PERSONAL AI ASSISTANT</span><h2>Your ideas deserve<br/>a smarter space.</h2><p>Save, find and organize your digital world — with a little help from AI.</p>{action('Ask Quick IT AI',ArrowRight,()=>go('ai'))}</div><div className="orb-wrap"><div className="orb-glow"></div><div className="orb"><span>✦</span></div><div className="float-chip top">✨ Smart search</div><div className="float-chip bottom">☁️ Always in sync</div></div></section>
    <div className="stats-grid"><div className="stat-card glass"><div className="stat-icon lilac"><HardDrive size={20}/></div><small>My storage</small><strong>{prettySize(totalBytes)}</strong><span>{items.length} saved items</span></div><div className="stat-card glass"><div className="stat-icon blue"><Folder size={20}/></div><small>Collections</small><strong>{folders.length}</strong><span>Organized folders</span></div><div className="stat-card glass"><div className="stat-icon pink"><CalendarDays size={20}/></div><small>Tasks to do</small><strong>{tasks.filter(t=>!t.done).length}</strong><span>Keep moving forward</span></div><div className="stat-card glass"><div className="stat-icon yellow"><Users size={20}/></div><small>Communities</small><strong>{groups.length}</strong><span>Shared spaces</span></div></div>
    <div className="two-column"><section className="section glass"><div className="section-head"><div><h3>My collections</h3><p>Your content, organized</p></div><button className="text-button" onClick={()=>go('storage')}>View all <ArrowRight size={15}/></button></div><div className="category-grid">{categories.map(cat=><button className="category" key={cat.kind} onClick={()=>go(cat.kind==='photo'?'gallery':cat.kind==='note'?'notes':'storage')}><div className={`category-emoji ${cat.shade}`}>{typeIcons[cat.kind]}</div><b>{cat.name}</b><small>{items.filter(it=>it.kind===cat.kind).length} items</small></button>)}</div></section><section className="section glass"><div className="section-head"><div><h3>My day</h3><p>A little progress goes a long way</p></div><button className="text-button" onClick={()=>go('planner')}>Planner <ArrowRight size={15}/></button></div>{tasks.length?tasks.slice(0,4).map(t=><button key={t.id} className="task-line" onClick={()=>run(()=>toggleTask(t))}><span className={`task-check ${t.done?'done':''}`}>{t.done&&<Check size={13}/>}</span><span className={t.done?'done-text':''}>{t.title}</span></button>):<div className="empty-small">Your day is clear. Add a task to get started.</div>}{action('Add a task',Plus,()=>go('planner'),true)}</section></div>
    <section className="section glass"><div className="section-head"><div><h3>Recently saved</h3><p>Jump right back in</p></div><button className="text-button" onClick={()=>go('storage')}>All files <ArrowRight size={15}/></button></div><div className="list-items">{items.slice(0,4).map(itemTile)}{!items.length&&<div className="empty-small">Nothing saved yet. Your first file or link will appear here.</div>}</div></section></>}
   {view==='save'&&<><div className="page-title"><div><span className="eyebrow">SMART CAPTURE</span><h1>Save something wonderful</h1><p>One easy place for links, documents, prompts and ideas.</p></div></div><section className="save-panel glass"><div className="save-banner"><div className="stat-icon lilac"><Plus size={24}/></div><div><h3>Universal Smart Save</h3><p>Every item gets a permanent searchable ID.</p></div></div><div className="save-types">{KINDS.map(k=><button key={k} className={`kind ${save.kind===k?'on':''}`} onClick={()=>setSave({...save,kind:k})}><span>{typeIcons[k]}</span>{k}</button>)}</div><form className="edit-form" onSubmit={e=>{e.preventDefault();run(saveItem)}}><div className="field"><label>Title</label><input placeholder="Give this a clear name…" value={save.title} onChange={e=>setSave({...save,title:e.target.value})}/></div><div className="field"><label>Website / social media URL</label><input type="url" placeholder="https://example.com" value={save.url} onChange={e=>setSave({...save,url:e.target.value})}/></div><div className="field"><label>Content / notes / prompt / code</label><textarea rows={5} placeholder="Write or paste your content here…" value={save.content} onChange={e=>setSave({...save,content:e.target.value})}/></div><div className="form-row"><div className="field"><label>Folder</label><select value={save.folderId} onChange={e=>setSave({...save,folderId:e.target.value})}><option value="">My vault (root)</option>{folders.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></div><div className="field"><label>Tags (comma separated)</label><input placeholder="study, inspiration, project" value={save.tags} onChange={e=>setSave({...save,tags:e.target.value})}/></div></div><div className="field"><label>Description</label><input placeholder="A short description (optional)" value={save.description} onChange={e=>setSave({...save,description:e.target.value})}/></div><label className="upload-box"><UploadCloud size={27}/><b>{file?file.name:'Upload a PDF, photo, video or document'}</b><span>{file?prettySize(file.size):'Click to choose a file from your device'}</span><input ref={fileRef} type="file" onChange={e=>setFile(e.target.files?.[0]||null)}/></label><button className="btn btn-primary save-submit" disabled={busy}>{busy?'Saving…':'Save to my vault'}<ArrowRight size={18}/></button></form></section></>}
   {view==='storage'&&<><div className="page-title"><div><span className="eyebrow">YOUR PRIVATE VAULT</span><h1>My Storage</h1><p>Find anything by name, tags or its unique ID.</p></div>{action('Add files',Plus,()=>go('save'))}</div><section className="storage-banner glass"><div className="storage-bubble"><Cloud size={31}/></div><div className="storage-copy"><strong>{prettySize(totalBytes)} stored</strong><span>{items.length} files & links · only visible to you</span><div className="storage-track"><span style={{width:`${Math.min(100,items.length?Math.max(5,(items.filter(it=>it.storage_path).length/items.length)*100):0)}%`}}/></div><small>Bar indicates uploaded-file proportion, not your Supabase plan quota.</small></div><ShieldCheck size={25} className="storage-shield"/></section><section className="section glass"><div className="section-head"><div><h3>My folders</h3><p>{currentFolder?`Inside ${currentFolder.name}`:'Your organized spaces'}</p></div></div><div className="breadcrumbs"><button onClick={()=>setFolderId(null)}>My Vault</button>{currentFolder&&<><ChevronRight size={14}/><button>{currentFolder.name}</button></>}</div><form className="add-folder" onSubmit={e=>{e.preventDefault();run(addFolder)}}><input value={newFolder} onChange={e=>setNewFolder(e.target.value)} placeholder="New folder name…"/><button className="btn btn-ghost"><FolderPlus size={16}/>Create folder</button></form><div className="folders-grid">{folders.filter(f=>f.parent_id===folderId).map(folderTile)}{!folders.filter(f=>f.parent_id===folderId).length&&<div className="empty-small">No subfolders here yet.</div>}</div></section><section className="section glass"><div className="section-head"><div><h3>Files & saved content</h3><p>{filtered.filter(it=>it.folder_id===folderId).length} items in this location</p></div><div className="view-controls"><select aria-label="Sort files" value={sort} onChange={e=>setSort(e.target.value as typeof sort)}><option value="newest">Newest first</option><option value="name">Name</option><option value="size">Size</option></select>{iconButton(Grid2X2,'Toggle grid/list',()=>setGrid(!grid))}</div></div><div className={`list-items ${grid?'tiles-grid':''}`}>{filtered.filter(it=>it.folder_id===folderId).map(itemTile)}{!filtered.filter(it=>it.folder_id===folderId).length&&<div className="empty-small">No saved items here. Try Smart Save to add your first one.</div>}</div></section></>}
   {['gallery','prompts','notes','learning','code'].includes(view)&&<><div className="page-title"><div><span className="eyebrow">QUICK IT COLLECTIONS</span><h1>{({gallery:'Photo Gallery',prompts:'AI Prompt Library',notes:'Personal Notes',learning:'Learning Hub',code:'Coding Projects'} as Record<string,string>)[view]}</h1><p>Always in sync with your private vault.</p></div>{action('Create or upload',Plus,()=>{setSave({...blank,kind:({gallery:'photo',prompts:'prompt',notes:'note',learning:'document',code:'code'} as Record<string,string>)[view]});go('save')})}</div><section className="section glass"><div className="section-head"><div><h3>Saved {view==='gallery'?'images':'resources'}</h3><p>Click a resource to open or copy it</p></div></div><div className="list-items tiles-grid">{filtered.filter(it=>view==='learning'?['pdf','document','note','link'].includes(it.kind):it.kind===({gallery:'photo',prompts:'prompt',notes:'note',code:'code'} as Record<string,string>)[view]).map(itemTile)}{!filtered.some(it=>view==='learning'?['pdf','document','note','link'].includes(it.kind):it.kind===({gallery:'photo',prompts:'prompt',notes:'note',code:'code'} as Record<string,string>)[view])&&<div className="empty-small">Your collection is empty. Save content here to get started.</div>}</div></section></>}
   {view==='planner'&&<><div className="page-title"><div><span className="eyebrow">YOUR DAILY FLOW</span><h1>Daily Planner</h1><p>Small actions, big ideas.</p></div></div><section className="section glass"><h3>Add a task</h3><form className="task-form" onSubmit={e=>{e.preventDefault();run(addTask)}}><input value={taskText} onChange={e=>setTaskText(e.target.value)} placeholder="What would you like to do?" required/><input type="datetime-local" value={due} onChange={e=>setDue(e.target.value)}/><button className="btn btn-primary" disabled={busy}><Plus size={16}/>Add</button></form><h3>My tasks</h3><div className="task-list">{tasks.map(t=><button key={t.id} className="task-line large" onClick={()=>run(()=>toggleTask(t))}><span className={`task-check ${t.done?'done':''}`}>{t.done&&<Check size={14}/>}</span><span className={t.done?'done-text':''}>{t.title}</span>{t.due_at&&<small>{new Date(t.due_at).toLocaleString()}</small>}</button>)}{!tasks.length&&<div className="empty-small">A clear slate! Add your first task.</div>}</div><p className="hint">Due dates are saved. Push reminder notifications require a separate Android notification integration.</p></section></>}
   {view==='ai'&&<><div className="page-title"><div><span className="eyebrow">QUICK IT INTELLIGENCE</span><h1>Your AI Companion <span>✦</span></h1><p>Ask questions about your private files and get useful answers.</p></div></div><section className="ai-container glass"><div className="ai-heading"><div className="small-orb">✦</div><div><b>Quick IT AI</b><small>Personal assistant · Private-by-default search</small></div></div><div className="chat-messages">{!messages.length&&<div className="chat-empty"><div className="orb mini"><span>✦</span></div><h2>Hello, {name}!</h2><p>I can help you search your own saved information and answer questions. Your vault stays private.</p><div className="quick-prompts">{['Find my saved PDFs','Summarize my notes','Show coding resources'].map(p=><button key={p} onClick={()=>setChatText(p)}>{p}</button>)}</div></div>}{messages.map(m=><div key={m.id} className={`chat-message ${m.role}`}><div className="chat-avatar">{m.role==='assistant'?'✦':name.slice(0,1).toUpperCase()}</div><div>{m.content}</div></div>)}</div><form className="chat-composer" onSubmit={e=>{e.preventDefault();run(askAI)}}><button type="button" className="icon-button" onClick={()=>go('save')} title="Add a file"><Plus size={21}/></button><input value={chatText} onChange={e=>setChatText(e.target.value)} placeholder="Ask anything about your saved content…"/><button className="send-button" disabled={busy||!chatText.trim()} title="Send"><Send size={18}/></button></form><p className="hint centered">AI replies require an authorized Supabase Edge Function and server-side API key.</p></section></>}
   {view==='groups'&&<><div className="page-title"><div><span className="eyebrow">CREATE & COLLABORATE</span><h1>Community Groups</h1><p>Share selected resources without exposing your personal vault.</p></div></div><div className="two-column groups-layout"><section className="section glass"><h3>Create a group</h3><form className="edit-form" onSubmit={e=>{e.preventDefault();run(createGroup)}}><div className="field"><label>Group name</label><input value={groupName} onChange={e=>setGroupName(e.target.value)} placeholder="Study circle, project team…" required/></div><label className="checkbox-row"><input type="checkbox" checked={groupPrivate} onChange={e=>setGroupPrivate(e.target.checked)}/>Private · invitation-only group</label><button className="btn btn-primary" disabled={busy}><Plus size={16}/>Create group</button></form><div className="divider-space"/><h3>Available communities</h3>{groups.map(g=><button className={`group-row ${activeGroup===g.id?'current':''}`} key={g.id} onClick={()=>setActiveGroup(g.id)}><span className="group-avatar"><Users size={20}/></span><span><b>{g.name}</b><small>{g.visibility} · {g.display_id}</small></span><ChevronRight size={17}/></button>)}{!groups.length&&<div className="empty-small">No groups yet. Create the first one.</div>}</section><section className="section glass"><h3>{activeGroup?groups.find(g=>g.id===activeGroup)?.name:'Select a community'}</h3>{activeGroup?<><p className="hint">Groups are shared spaces; personal vault items are not shared automatically.</p>{groups.find(g=>g.id===activeGroup)?.owner_id===user.id&&<form className="invite-form" onSubmit={e=>{e.preventDefault();run(createInvite)}}><input type="email" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} placeholder="Invitee email address" required/><button className="btn btn-ghost">Create invite</button></form>}{shareLink&&<div className="share-line"><span>{shareLink}</span>{iconButton(Copy,'Copy invitation link',()=>copy(shareLink))}</div>}<form className="post-form" onSubmit={e=>{e.preventDefault();run(postGroup)}}><textarea rows={3} value={groupPost} onChange={e=>setGroupPost(e.target.value)} placeholder="Write a group post or share a useful link…"/><button className="btn btn-primary" disabled={busy}>Post to group</button></form>{groupItems.map(post=><div className="group-post" key={post.id}><b>{post.title}</b><small>{friendlyDate(post.created_at)}</small><p>{post.content}</p></div>)}{!groupItems.length&&<div className="empty-small">Nothing posted here yet.</div>}{groups.find(g=>g.id===activeGroup)?.visibility==='public'&&groups.find(g=>g.id===activeGroup)?.owner_id!==user.id&&action('Join community',Users,()=>run(()=>joinGroup(groups.find(g=>g.id===activeGroup)!)),true)}</>:<div className="empty-small">Choose a group from the left to view discussions.</div>}</section></div></>}
   {view==='settings'&&<><div className="page-title"><div><span className="eyebrow">YOUR ACCOUNT</span><h1>Profile & Settings</h1><p>Identity, privacy and your workspace information.</p></div></div><section className="section glass settings-panel"><div className="profile-row"><div className="profile-avatar">{name.slice(0,1).toUpperCase()}</div><div><h3>{user.user_metadata?.full_name||name}</h3><p>{user.email}</p></div></div><div className="settings-list"><div><span>Account ID</span><b>{user.id}</b>{iconButton(Copy,'Copy account ID',()=>copy(user.id))}</div><div><span>Account privacy</span><b>Personal vault private by default</b><ShieldCheck size={17}/></div><div><span>App platform</span><b>Quick IT · Web and Android</b><Cloud size={17}/></div><div><span>Supabase connected</span><b>{new URL(API_URL).hostname}</b><Check size={17}/></div></div><button className="btn btn-ghost" onClick={()=>run(async()=>{const{error}=await supabase!.auth.signOut();if(error)throw error})}><LogOut size={17}/>Sign out</button></section></>}
  </main><footer className="footer">Quick IT · A smarter place for everything <span>Privacy first · Made for every screen</span></footer></div>
  <nav className="bottom-nav glass">{bottomNav.map(nav=>{const Icon=nav.icon;return <button key={nav.key} onClick={()=>go(nav.key)} className={view===nav.key?'active':''}><Icon size={nav.key==='save'?25:21}/><span>{nav.label}</span></button>})}</nav>
  {toast&&<div className="toast" role="status"><Sparkles size={15}/>{toast}<button onClick={()=>setToast('')}><X size={14}/></button></div>}
 </div>
}