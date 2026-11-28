const {app, BrowserWindow, ipcMain, dialog, globalShortcut, session, shell} = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {randomUUID} = require('node:crypto');
const {registerFeatures}=require('./src/features.cjs');
const en=require('./src/locales/en.json');
function tr(text){return (state.language||(app.getLocale().startsWith('es')?'es':'en'))==='en'?(en[text]||text):text;}
const {execFile} = require('node:child_process');
async function gameAudio(action,bridge='steam') {
  if(action==='restore'&&!require('node:fs').existsSync(path.join(root,'previous-microphones.json')))return {enabled:false};
  const script=path.join(root,'audio-default.ps1');await fs.copyFile(path.join(__dirname,'src','audio-default.ps1'),script);
  return new Promise((resolve,reject)=>execFile('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',script,'-Action',action,'-Bridge',bridge,'-Backup',path.join(root,'previous-microphones.json')],{windowsHide:true,timeout:20000},(error,stdout,stderr)=>error?reject(new Error(stderr||error.message)):resolve(JSON.parse(stdout.trim()))));
}
// Shared per-user data survives application updates and multiple downloaded copies.
const projectRoot=app.isPackaged?path.resolve(path.dirname(app.getPath('exe')),'../..'):__dirname;
const legacyRoot=path.join(app.isPackaged ? path.dirname(app.getPath('exe')) : __dirname,'data');
app.setPath('userData', process.env.PULSEPAD_DATA || path.join(app.getPath('appData'),'PulsePad'));
const primary=app.requestSingleInstanceLock();
if(!primary)app.quit();
app.on('second-instance',()=>{if(win){if(win.isMinimized())win.restore();win.show();win.focus();}});
let features;
let win, state = {tracks: [], settings: {}}, root, saveQueue = Promise.resolve(), importing = false;
const formats = ['mp3','wav','ogg','flac','m4a','aac','opus','wma','aiff','aif','mp4','webm','mkv'];
function save() {
  const snapshot = JSON.stringify(state, null, 2);
  saveQueue = saveQueue.catch(()=>{}).then(async()=>{
    await fs.writeFile(path.join(root, 'library.tmp'), snapshot);
    try{await fs.copyFile(path.join(root,'library.json'),path.join(root,'library.backup.json'));}catch(e){if(e.code!=='ENOENT')throw e;}
    await fs.rename(path.join(root, 'library.tmp'), path.join(root, 'library.json'));
  });
  return saveQueue;
}
function publicState() {return {...state, tracks: state.tracks.map(t=>({...t,url:t.kind==='spotify'?null:pathToFileURL(path.join(root,'audio',t.file||t.id+'.flac')).href}))};}
function shortcuts() {
  globalShortcut.unregisterAll();
  const failed = [];
  state.tracks.forEach(t=>{if(t.hotkey && !globalShortcut.register(t.hotkey,()=>win?.webContents.send('trigger',t.id))) failed.push(t.hotkey);});
  if(!globalShortcut.register('CommandOrControl+Shift+Space',()=>win?.webContents.send('trigger','stop'))) failed.push('Ctrl+Shift+Space');
  return failed;
}
const approvedSources=new Map();
async function approveSources(paths){
 if(!Array.isArray(paths)||paths.length>200)throw new Error(tr('Importa hasta 200 archivos por vez.'));
 const sources=[];
 for(const file of paths){
  if(typeof file!=='string'||!path.isAbsolute(file)||!formats.includes(path.extname(file).slice(1).toLowerCase()))throw new Error(tr('Formato no admitido.'));
  const stat=await fs.stat(file);if(!stat.isFile()||stat.size>1024**3)throw new Error(tr('El límite es 1 GB por archivo.'));
  const token=randomUUID(),name=path.basename(file,path.extname(file));approvedSources.set(token,{name,format:path.extname(file).slice(1).toUpperCase()});sources.push({token,name,url:pathToFileURL(file).href});
 }
 return sources;
}
async function storeAudio(token,bytes){
 const source=approvedSources.get(token);if(!source)throw new Error('Invalid import token.');
 if(!(bytes instanceof Uint8Array)||bytes.byteLength<44||bytes.byteLength>256*1024*1024+44)throw new Error('Invalid audio size.');
 const buffer=Buffer.from(bytes);if(buffer.toString('ascii',0,4)!=='RIFF'||buffer.toString('ascii',8,12)!=='WAVE')throw new Error('Invalid WAV file.');
 const id=randomUUID(),file=id+'.wav';await fs.writeFile(path.join(root,'audio',file),buffer);
 const used=new Set(state.tracks.map(t=>t.hotkey));const key=[...'1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map(k=>'CommandOrControl+Alt+'+k).find(k=>!used.has(k));
 const track={id,file,name:source.name,format:source.format,volume:.8,loop:false,favorite:false,category:state.language==='en'?'Sounds':'Sonidos',hotkey:key||'',color:state.tracks.length%6};state.tracks.push(track);
 if(shortcuts().includes(key))track.hotkey='';await save();approvedSources.delete(token);features?.onImport(track);
}
app.whenReady().then(async()=>{
  if(!primary)return;
  root=app.getPath('userData');
  if(!process.env.PULSEPAD_DATA){
    const pointer=path.join(root,'storage-location.json');await fs.mkdir(root,{recursive:true});
    try{const stored=JSON.parse(await fs.readFile(pointer,'utf8'));if(path.isAbsolute(stored.libraryPath))root=stored.libraryPath;}catch(e){if(e.code!=='ENOENT')throw e;const old=path.join(projectRoot,'user-library');if(require('node:fs').existsSync(path.join(old,'library.json'))){await fs.writeFile(pointer,JSON.stringify({libraryPath:old}));root=old;}}
  }
  await fs.mkdir(path.join(root,'audio'),{recursive:true});
  if(!process.env.PULSEPAD_DATA) {
    // Merge legacy libraries by immutable ID; keep originals for recovery.
    let merged={tracks:[],settings:{}},exists=false;
    try{merged=JSON.parse(await fs.readFile(path.join(root,'library.json'),'utf8'));exists=true;}catch(e){if(e.code!=='ENOENT')throw e;}
    const seen=new Set(merged.tracks.map(t=>t.id));
    for(const source of [...new Set([legacyRoot,path.join(projectRoot,'data'),path.join(projectRoot,'user-library'),path.join(app.getPath('appData'),'PulsePadShared')])]) {
      if(source===root)continue;
      let old;try{old=JSON.parse(await fs.readFile(path.join(source,'library.json'),'utf8'));}catch{continue;}
      if(!exists){merged.settings=old.settings||{};exists=true;}
      merged.migratedSources||=[];if(merged.migratedSources.includes(source))continue;
      for(const track of old.tracks||[])if(!seen.has(track.id)&&/^[a-f0-9-]+$/i.test(track.id)) {
        try{await fs.copyFile(path.join(source,'audio',track.file||track.id+'.flac'),path.join(root,'audio',track.file||track.id+'.flac'),require('node:fs').constants.COPYFILE_EXCL);}catch(e){if(e.code!=='EEXIST')throw e;}
        merged.tracks.push(track);seen.add(track.id);
      }
      merged.migratedSources.push(source);
    }
    state=merged;await save();
  }
  try {const stored=JSON.parse(await fs.readFile(path.join(root,'library.json'),'utf8'));if(!Array.isArray(stored.tracks))throw new Error(tr("Biblioteca inválida"));state=stored;}catch(e){if(e.code!=='ENOENT')dialog.showErrorBox(tr('No se pudo leer la biblioteca'),e.message);}
  state.language||=app.getLocale().startsWith('es')?'es':'en';
  ipcMain.handle('language',async(_,value)=>{if(!['es','en'].includes(value))throw new Error('Invalid language');state.language=value;await save();});
  state.profiles||=[{id:'default',name:tr('Principal'),settings:{...state.settings}}];state.activeProfile||='default';
  ipcMain.handle('profile',async(_,action,value)=>{
    const active=state.profiles.find(p=>p.id===state.activeProfile);active.settings={...state.settings};
    if(action==='create'){const p={id:randomUUID(),name:String(value||'Nuevo perfil').trim().slice(0,40)||'Nuevo perfil',settings:{...state.settings}};state.profiles.push(p);state.activeProfile=p.id;}
    else if(action==='switch'){const target=state.profiles.find(p=>p.id===value);if(!target)throw new Error(tr("Perfil no encontrado"));state.activeProfile=target.id;state.settings={...target.settings};}
    else if(action==='rename'){active.name=String(value||'Principal').trim().slice(0,40)||'Principal';}
    else throw new Error(tr("Acción inválida"));
    await save();return publicState();
  });
  session.defaultSession.setPermissionRequestHandler((wc,permission,callback)=>callback(wc===win?.webContents&&['media','speaker-selection'].includes(permission)));
  session.defaultSession.setPermissionCheckHandler((wc,permission)=>wc===win?.webContents&&['media','speaker-selection'].includes(permission));
  ipcMain.handle('state',()=>publicState());
  ipcMain.handle('pick',async()=>{const result=await dialog.showOpenDialog(win,{properties:['openFile','multiSelections'],filters:[{name:tr('Audio y vídeo'),extensions:formats}]});return result.canceled?null:approveSources(result.filePaths)});
  ipcMain.handle('import',(_,paths)=>approveSources(paths));
  ipcMain.handle('store-audio',(_,token,bytes)=>storeAudio(token,bytes));
  ipcMain.handle('clear-sources',()=>approvedSources.clear());
  ipcMain.handle('update',async(_,id,patch)=>{
    const t=state.tracks.find(t=>t.id===id);if(!t)throw new Error(tr("Sonido no encontrado."));
    if(typeof patch.name==='string'&&patch.name.trim())t.name=patch.name.trim().slice(0,120);
    if(typeof patch.category==='string')t.category=patch.category.trim().slice(0,40)||'Sonidos';
    if(Number.isFinite(patch.volume))t.volume=Math.max(0,Math.min(1,patch.volume));
    for(const k of ['loop','favorite'])if(typeof patch[k]==='boolean')t[k]=patch[k];
    if(typeof patch.hotkey==='string') {
      const key=patch.hotkey;
      if(key&&!/^CommandOrControl\+Alt\+[A-Z0-9]$/.test(key))throw new Error(tr("Usa Ctrl + Alt + una letra o número."));
      if(key&&state.tracks.some(x=>x.id!==id&&x.hotkey===key))throw new Error(tr("Ese atajo ya está asignado."));
      const previous=t.hotkey;t.hotkey=key;
      if(shortcuts().includes(key)&&key){t.hotkey=previous;shortcuts();throw new Error(tr("Windows u otra app está usando ese atajo."));}
    }
    await save();return publicState();
  });
  ipcMain.handle('remove',async(_,id)=>{const t=state.tracks.find(t=>t.id===id);if(!t)return publicState();state.tracks=state.tracks.filter(t=>t.id!==id);await save();if(t.kind!=='spotify')await fs.rm(path.join(root,'audio',t.file||id+'.flac'),{force:true});shortcuts();return publicState()});
  ipcMain.handle('settings',async(_,settings)=>{state.settings=settings;state.profiles.find(p=>p.id===state.activeProfile).settings={...settings};await save()});
  ipcMain.handle('cable',()=>shell.openExternal('https://vb-audio.com/Cable/'));
  ipcMain.handle('shortcuts',()=>shortcuts());
  ipcMain.handle('game-audio',(_,action,bridge)=>{if(!['enable','restore','status'].includes(action)||!['steam','cable'].includes(bridge||'steam'))throw new Error(tr("Acción inválida"));return gameAudio(action,bridge)});
  win=new BrowserWindow({width:state.window?.width||1250,height:state.window?.height||830,minWidth:950,minHeight:650,backgroundColor:'#101114',title:'PulsePad',autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}});
  win.on('resize',()=>{if(!win.isMaximized()){const {width,height}=win.getBounds();state.window={width,height};save();}});
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',e=>e.preventDefault());
  features=registerFeatures({ipcMain,root,source:path.join(__dirname,'src'),getState:()=>state,save,win,shell});
  let closing=false;
  win.on('close',e=>{if(closing)return;e.preventDefault();features?.close();gameAudio('restore').catch(error=>dialog.showErrorBox(tr('Restaurar micrófono'),error.message)).finally(()=>{closing=true;win.close()});});
  await win.loadFile('src/index.html');shortcuts();
});
app.on('window-all-closed',()=>app.quit());
let restoredOnQuit=false;
app.on('before-quit',e=>{if(restoredOnQuit||!root)return;e.preventDefault();features?.close();gameAudio('restore').catch(()=>{}).finally(()=>{restoredOnQuit=true;app.quit()});});
app.on('will-quit',()=>globalShortcut.unregisterAll());
