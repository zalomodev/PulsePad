const fs=require('node:fs/promises'),path=require('node:path'),{randomUUID}=require('node:crypto');
const {CleanService,validateSelection}=require('./clean-service.cjs');
const {SpotifyIntegration,normalizeSpotifyLink,spotifyKey}=require('./spotify.cjs');
function registerFeatures({ipcMain,root,source,getState,save,win,shell}){
 const clean=new CleanService({root,source,onProgress:job=>{if(!win.isDestroyed())win.webContents.send('clean-progress',job);}});
 const spotify=new SpotifyIntegration({root,source,onUpdate:data=>{if(!win.isDestroyed())win.webContents.send('spotify-update',data);}});
 const defaults={auto:false,model:'',strict:false,fadeMs:40,paddingMs:60,audioLanguage:'auto'};
 getState().cleanSettings={...defaults,...getState().cleanSettings};
 async function commitClean(track,output,report){
  const state=getState();if(!state.tracks.some(t=>t.id===track.id))throw new Error('The source was removed. Clean output was not added.');
  const original=state.tracks.find(t=>t.id===(track.cleanOf||track.id))||track;
  const count=state.tracks.filter(t=>t.cleanOf===original.id).length;
  const id=randomUUID(),file=id+'.wav';await fs.mkdir(path.join(root,'clean-reports'),{recursive:true});await fs.copyFile(output,path.join(root,'audio',file));await fs.writeFile(path.join(root,'clean-reports',id+'.json'),JSON.stringify(report));
  const result={id,file,name:original.name+' — Clean'+(count?' ('+(count+1)+')':''),format:'WAV',category:track.category,volume:track.volume,loop:false,favorite:false,hotkey:'',color:track.color,cleanOf:original.id,reviewRequired:true};state.tracks.push(result);await save();return result;
 }
 function cleanTrack(id,override={}){
  const track=getState().tracks.find(t=>t.id===id);if(!track||track.kind==='spotify')throw new Error('Clean edits are available only for imported local audio.');
  const settings={...getState().cleanSettings,...override};if(!settings.manualTranscript&&!settings.analyzeOnly&&!/^opencode\/[a-zA-Z0-9._-]+$/.test(settings.model))throw new Error('Choose a currently free OpenCode model first.');
  return clean.enqueue({...track},settings,(output,report)=>commitClean(track,output,report));
 }
 ipcMain.handle('clean-settings',async(_,patch)=>{
  const settings=getState().cleanSettings;
  if(typeof patch.auto==='boolean')settings.auto=patch.auto;if(typeof patch.strict==='boolean')settings.strict=patch.strict;
  if(typeof patch.model==='string'&&/^opencode\/[a-zA-Z0-9._-]+$/.test(patch.model))settings.model=patch.model;
  if(['auto','es','en'].includes(patch.audioLanguage))settings.audioLanguage=patch.audioLanguage;
  for(const [key,min,max]of [['fadeMs',20,150],['paddingMs',20,200]])if(Number.isFinite(patch[key]))settings[key]=Math.max(min,Math.min(max,patch[key]));
  await save();return settings;
 });
 ipcMain.handle('clean-status',()=>({settings:getState().cleanSettings,jobs:clean.status()}));
 ipcMain.handle('clean-tools',()=>clean.tools());ipcMain.handle('clean-models',()=>clean.models());ipcMain.handle('clean-prepare',()=>clean.prepare());
 ipcMain.handle('clean-start',(_,id)=>cleanTrack(id));ipcMain.handle('clean-cancel',(_,id)=>clean.cancel(id));
 ipcMain.handle('clean-transcribe',(_,id)=>cleanTrack(id,{analyzeOnly:true}));
 async function manualReport(id){const job=[...clean.history,clean.current].find(j=>j&&j.id===id&&j.stage==='review');if(!job)throw new Error('Manual transcript not found in this session.');const transcript=JSON.parse(await fs.readFile(path.join(root,'clean-jobs',job.id,'transcript.json'),'utf8'));return {...transcript,selected:[],trackId:job.trackId};}
 ipcMain.handle('clean-transcript',(_,id)=>manualReport(id));
 ipcMain.handle('clean-manual-save',async(_,id,indices)=>{const report=await manualReport(id);const selected=validateSelection({wordIndices:indices},report.words);return cleanTrack(report.trackId,{manualTranscript:report,manualIndices:selected});});
 ipcMain.handle('clean-report',async(_,id)=>{const track=getState().tracks.find(t=>t.id===id);if(!track?.cleanOf)throw new Error('No clean report exists for this sound.');return JSON.parse(await fs.readFile(path.join(root,'clean-reports',track.id+'.json'),'utf8'));});
 ipcMain.handle('clean-revise',async(_,id,indices)=>{
  const track=getState().tracks.find(t=>t.id===id);if(!track?.cleanOf)throw new Error('Select a generated Clean version.');
  const report=JSON.parse(await fs.readFile(path.join(root,'clean-reports',track.id+'.json'),'utf8'));const selected=validateSelection({wordIndices:indices},report.words);
  return cleanTrack(track.cleanOf,{manualTranscript:report,manualIndices:selected});
 });
 ipcMain.handle('spotify-enable',async(_,enabled)=>{if(typeof enabled!=='boolean')throw new Error('Invalid setting.');getState().spotifyEnabled=enabled;await save();if(enabled)await spotify.start();else spotify.stop();return {enabled,current:spotify.current};});
 ipcMain.handle('spotify-status',()=>({enabled:!!getState().spotifyEnabled,current:spotify.current}));
 ipcMain.handle('spotify-add',async(_,entry)=>{
  const state=getState();const name=String(entry.name||'').trim().slice(0,300),artist=String(entry.artist||'').trim().slice(0,300);if(!name)throw new Error('A track name is required.');
  const uri=entry.link?normalizeSpotifyLink(entry.link):'';const key=spotifyKey(name,artist);const existing=state.tracks.find(t=>t.kind==='spotify'&&t.spotifyKey===key);if(existing){if(uri){existing.spotifyUri=uri;await save();}return existing;}
  const track={id:randomUUID(),kind:'spotify',name,artist,spotifyUri:uri,spotifyKey:key,format:'Spotify',category:'Spotify',volume:1,loop:false,favorite:false,hotkey:'',color:5};state.tracks.push(track);await save();return track;
 });
 ipcMain.handle('spotify-play',async(_,id)=>{const track=getState().tracks.find(t=>t.id===id&&t.kind==='spotify');if(!track)throw new Error('Spotify entry not found.');
  if(track.spotifyUri){await shell.openExternal(normalizeSpotifyLink(track.spotifyUri));return {mode:'track'};}
  if(spotify.current.available&&spotifyKey(spotify.current.title,spotify.current.artist)===track.spotifyKey){try{const result=await spotify.resume();if(result.resumed)return {mode:'current'};}catch{}}
  await shell.openExternal('spotify:search:'+encodeURIComponent(track.name+' '+track.artist));return {mode:'search'};
 });
 ipcMain.handle('feature-help',(_,name)=>{const urls={opencode:'https://opencode.ai/download',python:'https://www.python.org/downloads/windows/'};if(!urls[name])throw new Error('Invalid help topic.');return shell.openExternal(urls[name]);});
 if(getState().spotifyEnabled)spotify.start().catch(()=>{});
 return {onImport(track){if(getState().cleanSettings.auto){try{cleanTrack(track.id);}catch(e){if(!win.isDestroyed())win.webContents.send('clean-progress',{id:randomUUID(),trackId:track.id,name:track.name,stage:'error',error:e.message});}}},close(){spotify.stop();clean.shutdown();}};
}
module.exports={registerFeatures};
