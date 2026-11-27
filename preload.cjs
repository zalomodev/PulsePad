const {contextBridge,ipcRenderer,webUtils}=require('electron');
contextBridge.exposeInMainWorld('pad',{
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
