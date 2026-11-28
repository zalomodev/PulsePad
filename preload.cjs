const {contextBridge,ipcRenderer,webUtils}=require('electron');
contextBridge.exposeInMainWorld('pad',{
  cleanStatus:()=>ipcRenderer.invoke('clean-status'),cleanTools:()=>ipcRenderer.invoke('clean-tools'),cleanModels:()=>ipcRenderer.invoke('clean-models'),cleanPrepare:()=>ipcRenderer.invoke('clean-prepare'),
  cleanSettings:patch=>ipcRenderer.invoke('clean-settings',patch),cleanStart:id=>ipcRenderer.invoke('clean-start',id),cleanCancel:id=>ipcRenderer.invoke('clean-cancel',id),cleanReport:id=>ipcRenderer.invoke('clean-report',id),cleanRevise:(id,indices)=>ipcRenderer.invoke('clean-revise',id,indices),
  cleanTranscribe:id=>ipcRenderer.invoke('clean-transcribe',id),cleanTranscript:id=>ipcRenderer.invoke('clean-transcript',id),cleanManualSave:(id,indices)=>ipcRenderer.invoke('clean-manual-save',id,indices),
  onClean:fn=>ipcRenderer.on('clean-progress',(_,job)=>fn(job)),onSpotify:fn=>ipcRenderer.on('spotify-update',(_,data)=>fn(data)),
  spotifyEnable:enabled=>ipcRenderer.invoke('spotify-enable',enabled),spotifyStatus:()=>ipcRenderer.invoke('spotify-status'),spotifyAdd:entry=>ipcRenderer.invoke('spotify-add',entry),spotifyPlay:id=>ipcRenderer.invoke('spotify-play',id),featureHelp:name=>ipcRenderer.invoke('feature-help',name),
  profile:(action,value)=>ipcRenderer.invoke('profile',action,value),
  language:value=>ipcRenderer.invoke('language',value),
  storeAudio:(token,bytes)=>ipcRenderer.invoke('store-audio',token,bytes),clearSources:()=>ipcRenderer.invoke('clear-sources'),
  gameAudio:(action,bridge)=>ipcRenderer.invoke('game-audio',action,bridge),
  state:()=>ipcRenderer.invoke('state'),pick:()=>ipcRenderer.invoke('pick'),
  importFiles:files=>ipcRenderer.invoke('import',files.map(f=>webUtils.getPathForFile(f))),
  update:(id,patch)=>ipcRenderer.invoke('update',id,patch),remove:id=>ipcRenderer.invoke('remove',id),
  settings:s=>ipcRenderer.invoke('settings',s),cable:()=>ipcRenderer.invoke('cable'),shortcuts:()=>ipcRenderer.invoke('shortcuts'),
  onTrigger:fn=>ipcRenderer.on('trigger',(_,v)=>fn(v)),onProgress:fn=>ipcRenderer.on('import-progress',(_,v)=>fn(v))
});
