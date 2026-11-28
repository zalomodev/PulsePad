import {installFeatures} from './feature-ui.js';
import {importSources} from './importer.js';
import {t as tr,captureDocument,setLanguage,getLanguage} from './i18n.js';
import {installGuide} from './guide.js';
import {icon,labelIcon,decorateIcons} from './icons.js';
import {SoundEngine} from './engine.js';
const $=id=>document.getElementById(id);
let featureUI;
let state={tracks:[],settings:{}},view='all',editId=null,toastTimer,focused=null,busy=false;
const svgIcon=icon;
const colors=['#c2f578','#b6a2ef','#82cce9','#e9b77a','#ec94ae','#87d6b4'];
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,7000);}
const engine=new SoundEngine(()=>{render();updatePlayer()},toast);
const safe=fn=>async(...args)=>{try{return await fn(...args)}catch(e){toast(e.message||String(e));}};
function button(text,cls,action,label){const b=document.createElement('button');b.textContent=text;b.className=cls;b.onclick=safe(action);if(label){b.title=label;b.setAttribute('aria-label',label)}if(cls.startsWith('star')){labelIcon(b,'star');b.setAttribute('aria-pressed',String(cls.includes('selected')))}else if(text==='···')labelIcon(b,'more');return b;}
function render(){
  $('count').textContent=state.tracks.length;
  document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  $('heading').textContent=view==='all'?tr("Tu música."):view==='favorites'?tr("Tus favoritos."):view==='clean'?tr('Versiones Clean'):view==='spotify'?'Spotify':view;
  $('profile-select').replaceChildren(...(state.profiles||[]).map(p=>new Option(p.name,p.id)));$('profile-select').value=state.activeProfile||'default';
  const categories=[...new Set(state.tracks.map(t=>t.category))].sort((a,b)=>a.localeCompare(b));
  $('categories').replaceChildren(...categories.map(category=>{const b=button(category,'nav'+(view===category?' active':''),()=>{view=category;render()});b.prepend(icon('folder'));return b}));
  $('category-list').replaceChildren(...categories.map(c=>new Option(c,c)));
  let tracks=state.tracks.filter(t=>(view==='all'||(view==='favorites'?t.favorite:view==='spotify'?t.kind==='spotify':view==='clean'?!!t.cleanOf:t.category===view))&&t.name.toLowerCase().includes($('search').value.toLowerCase()));
  tracks=$('sort').value==='name'?tracks.toSorted((a,b)=>a.name.localeCompare(b.name)):$('sort').value==='category'?tracks.toSorted((a,b)=>a.category.localeCompare(b.category)||a.name.localeCompare(b.name)):tracks.toReversed();
  const list=state.settings.layout!=='grid';$('grid').classList.toggle('list-view',list);$('view-list').setAttribute('aria-pressed',String(list));$('view-grid').setAttribute('aria-pressed',String(!list));
  $('visible-count').textContent=tracks.length===1?tr('1 sonido'):tr('{count} sonidos',{count:tracks.length});
  $('grid').hidden=tracks.length===0;
  $('grid').replaceChildren(...tracks.map(t=>{
    const active=engine.active.has(t.id),card=document.createElement('article');card.className='card'+(active?' playing':'');card.style.setProperty('--accent',colors[t.color%6]);card.dataset.id=t.id;
    const play=button('','pad-play',()=>playTrack(t),tr("Reproducir ")+t.name);
    const icon=document.createElement('span');icon.className='pad-icon';icon.appendChild(svgIcon(active?'stop':'play'));
    const title=document.createElement('strong');title.textContent=t.name;title.title=t.name;
    const detail=document.createElement('small');detail.textContent=t.kind==='spotify'?tr('Spotify · reproducción externa'):(t.cleanOf?tr('Clean · revisar')+' · ':'')+t.format+' · '+t.category;play.append(icon,title,detail);const wave=document.createElement('span');wave.className='clip-wave';wave.setAttribute('aria-hidden','true');for(let n=0;n<24;n++){const bar=document.createElement('i');bar.style.height=(5+Math.abs(Math.sin(n*1.7+t.name.length))*19)+'px';wave.append(bar)}play.append(wave);card.append(play);
    if(t.loop){const loop=document.createElement('span');loop.className='loop-mark';loop.appendChild(svgIcon('loop'));card.append(loop)}
    const actions=document.createElement('div');actions.className='card-actions';const key=document.createElement('kbd');key.textContent=t.hotkey?t.hotkey.replace('CommandOrControl','Ctrl').replaceAll('+',' + '):tr("Sin atajo");
    actions.append(button(t.favorite?'★':'☆','star'+(t.favorite?' selected':''),async()=>{state=await window.pad.update(t.id,{favorite:!t.favorite});render()},tr("Favorito")),key,button('···','',()=>featureUI.openActions(t),tr('Opciones de ')+t.name));card.append(actions);return card;
  }));
  $('empty').hidden=tracks.length>0;
  $('empty').querySelector('h2').textContent=state.tracks.length?tr("No hay sonidos en esta vista"):tr("Tu primer sonido empieza aquí");
  $('empty').querySelector('p').textContent=state.tracks.length?tr("Prueba otra búsqueda, colección o añade un favorito."):tr("Arrastra música o efectos a esta ventana. También puedes extraer el audio de tus vídeos.");
  $('engine-status').textContent=engine.active.size?tr('{count} sonido(s) en reproducción',{count:engine.active.size}):tr("Listo para reproducir");
}
async function playTrack(t){if(t.kind==='spotify'){const result=await window.pad.spotifyPlay(t.id);toast(tr(result.mode==='search'?'Se abrió la búsqueda en Spotify. Elige la canción allí.':'Reproduciendo en la app de Spotify, fuera del mezclador.'));return;}focused=t.id;await engine.play(t,$('exclusive').checked);}
async function importAudio(callback){if(busy)return;busy=true;$('import').disabled=true;$('first-import').disabled=true;try{const result=await importSources(await callback(),p=>{$('import-status').hidden=!p;if(p)$('import-status').textContent=tr('Importando {current}/{total}: {name}',p);});if(result){state=result.state;render();toast(tr('{count} audio(s) importados.',{count:result.added})+(result.errors.length?'\n'+result.errors.join('\n'):''));}}finally{busy=false;$('import').disabled=false;$('first-import').disabled=false;}}
$('import').onclick=$('first-import').onclick=safe(()=>importAudio(()=>window.pad.pick()));
window.pad.onProgress(p=>{$('import-status').hidden=!p;if(p)$('import-status').textContent=tr('Importando {current}/{total}: {name}',p);});
let dragDepth=0;window.addEventListener('dragenter',e=>{e.preventDefault();if(e.dataTransfer.types.includes('Files')){dragDepth++;$('drop').hidden=false}});
window.addEventListener('dragover',e=>e.preventDefault());window.addEventListener('dragleave',()=>{if(--dragDepth<=0)$('drop').hidden=true});
window.addEventListener('drop',safe(async e=>{e.preventDefault();dragDepth=0;$('drop').hidden=true;const files=[...e.dataTransfer.files];if(files.length)await importAudio(()=>window.pad.importFiles(files));}));
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;render()});
$('search').oninput=render;$('sort').onchange=()=>{state.settings.sort=$('sort').value;render();scheduleSave();};
function openEdit(t){$('edit-volume').disabled=$('edit-loop').disabled=t.kind==='spotify';editId=t.id;$('edit-name').value=t.name;$('edit-category').value=t.category;$('edit-volume').value=t.volume*100;$('edit-loop').checked=t.loop;$('edit-key').value=t.hotkey;$('edit').showModal();}
for(const key of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')$('edit-key').add(new Option('Ctrl + Alt + '+key,'CommandOrControl+Alt+'+key));
$('close-edit').onclick=()=>$('edit').close();
$('edit-form').onsubmit=safe(async e=>{e.preventDefault();state=await window.pad.update(editId,{name:$('edit-name').value,category:$('edit-category').value,volume:Number($('edit-volume').value)/100,loop:$('edit-loop').checked,hotkey:$('edit-key').value});engine.update(state.tracks.find(t=>t.id===editId));$('edit').close();render();});
$('delete').onclick=safe(async()=>{engine.stop(editId);state=await window.pad.remove(editId);$('edit').close();render();toast(tr("Quitado de la biblioteca. Tu archivo original sigue intacto."));});
function stopAll(){engine.stopAll();}
$('stop').onclick=$('player-stop').onclick=stopAll;
window.pad.onTrigger(safe(async id=>{if(id==='stop')return stopAll();const t=state.tracks.find(t=>t.id===id);if(t)await playTrack(t);}));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.querySelector('dialog[open]'))stopAll()});
function current(){return engine.active.get(focused)||[...engine.active.values()].at(-1);}
function time(value){if(!Number.isFinite(value))return '0:00';return Math.floor(value/60)+':'+String(Math.floor(value%60)).padStart(2,'0');}
function updatePlayer(){const p=current();$('player').hidden=!p;if(!p)return;$('now-name').textContent=p.track.name;$('now-detail').textContent=(p.audio.paused?tr("En pausa"):tr("Reproduciendo"))+(p.audio.loop?tr(" · Bucle"):'');labelIcon($('pause'),p.audio.paused?'play':'pause');$('pause').setAttribute('aria-label',p.audio.paused?tr("Reanudar"):tr("Pausar"));$('time').textContent=time(p.audio.currentTime);$('duration').textContent=time(p.audio.duration);if(document.activeElement!==$('seek'))$('seek').value=Number.isFinite(p.audio.duration)?p.audio.currentTime/p.audio.duration*1000:0;}
$('pause').onclick=safe(async()=>{const p=current();if(!p)return;p.audio.paused?await p.audio.play():p.audio.pause();updatePlayer();});
$('seek').oninput=()=>{const p=current();if(p&&Number.isFinite(p.audio.duration))p.audio.currentTime=Number($('seek').value)/1000*p.audio.duration;};
setInterval(()=>{updatePlayer();$('meter-fill').style.width=Math.min(100,engine.level()*100)+'%';},80);
async function saveSettings(){state.settings={...state.settings,master:Number($('master').value),voice:Number($('mic-volume').value),send:Number($('send-volume').value),monitor:$('monitor').checked,speakers:$('speakers').value,cable:$('cable').value,microphone:$('microphone').value,exclusive:$('exclusive').checked};for(const id of ['speakers','cable','microphone'])state.settings[id+'Label']=$(id).selectedOptions[0]?.text||'';await window.pad.settings(state.settings);}
let saveTimer;function scheduleSave(){clearTimeout(saveTimer);saveTimer=setTimeout(safe(saveSettings),200);}
$('master').oninput=()=>{engine.setVolume(Number($('master').value)/100);$('master-value').textContent=$('master').value+'%';scheduleSave();};
$('mic-volume').oninput=()=>{engine.setVoiceVolume(Number($('mic-volume').value)/100);scheduleSave();};
$('send-volume').oninput=()=>{engine.setSendVolume(Number($('send-volume').value)/100);$('send-value').textContent=$('send-volume').value+'%';scheduleSave();};
$('exclusive').onchange=scheduleSave;
async function route(){
  if($('broadcast').checked&&!$('cable').value){$('broadcast').checked=false;toast(tr("Selecciona primero una salida virtual para las llamadas."));}
  engine.monitor=$('monitor').checked;engine.broadcast=$('broadcast').checked;engine.speakerId=$('speakers').value;engine.cableId=$('cable').value;
  try{await engine.route();await saveSettings();}catch(e){$('broadcast').checked=false;engine.broadcast=false;engine.callGain&&(engine.callGain.gain.value=0);throw e;}
}
for(const id of ['monitor','speakers','broadcast','cable'])$(id).onchange=safe(route);
async function setMic(){
  try{await engine.microphone($('mic').checked,$('microphone').value);await refreshDevices();await saveSettings();}
  catch(e){$('mic').checked=false;throw new Error(tr("No se pudo abrir el micrófono: ")+e.message);}
}
$('mic').onchange=$('microphone').onchange=safe(setMic);
async function refreshDevices(){
  const devices=await navigator.mediaDevices.enumerateDevices();
  for(const [id,kind] of [['speakers','audiooutput'],['cable','audiooutput'],['microphone','audioinput']]){
    const select=$(id),previous=select.value||state.settings[id]||'';
    select.replaceChildren(new Option(id==='cable'?tr("Selecciona una salida virtual"):tr("Predeterminado"),id==='cable'?'':'default'));
    devices.filter(d=>d.kind===kind&&d.deviceId!=='default'&&d.deviceId!=='communications').forEach((d,i)=>select.add(new Option(d.label||tr('Dispositivo {number}',{number:i+1}),d.deviceId)));
    if([...select.options].some(o=>o.value===previous))select.value=previous;
    else if(state.settings[id+'Label']&&[...select.options].some(o=>o.text===state.settings[id+'Label']))select.value=[...select.options].find(o=>o.text===state.settings[id+'Label']).value;
    else if(id==='cable')select.value=devices.find(d=>d.kind==='audiooutput'&&/cable input|voicemeeter input|steam streaming microphone/i.test(d.label))?.deviceId||'';
    if(id==='cable'&&!previous)select.value=devices.find(d=>d.kind==='audiooutput'&&/cable input|voicemeeter input|steam streaming microphone/i.test(d.label))?.deviceId||'';
  }
  const virtual=devices.some(d=>d.kind==='audiooutput'&&/cable input|voicemeeter input|steam streaming microphone/i.test(d.label));
  $('route-hint').textContent=virtual?tr("En Discord o el juego, selecciona el micrófono del mismo cable o Steam Streaming Microphone. Empieza con un nivel de envío bajo."):tr("No detectamos un puente conocido. Selecciona otro dispositivo compatible o abre la guía de conexión.");
  return devices;
}
$('refresh').onclick=safe(async()=>{await refreshDevices();await route();toast(tr("Lista de dispositivos actualizada."));});
navigator.mediaDevices.addEventListener('devicechange',safe(async()=>{await refreshDevices();if($('mic').checked)await setMic();await route();}));

for(let i=0;i<27;i++){const bar=document.createElement('i');bar.style.height=(15+Math.abs(Math.sin(i*.7)*Math.cos(i*.23))*90)+'px';document.querySelector('.hero-wave').append(bar);}
captureDocument();
async function boot(){state=await window.pad.state();setLanguage(state.language||getLanguage());decorateIcons();await applySettings();return;}
async function applySettings(){const s=state.settings||{};$('sort').value=s.sort||'added';$('master').value=s.master??80;$('mic-volume').value=s.voice??80;$('send-volume').value=s.send??10;$('send-value').textContent=$('send-volume').value+'%';engine.setSendVolume(Number($('send-volume').value)/100);$('monitor').checked=s.monitor??true;$('exclusive').checked=s.exclusive??true;engine.setVolume(Number($('master').value)/100);engine.setVoiceVolume(Number($('mic-volume').value)/100);$('master-value').textContent=$('master').value+'%';for(const id of ['speakers','cable','microphone'])$(id).value='';await refreshDevices();await route();render();$('quick-volume').value=$('master').value;$('quick-value').textContent=$('master').value+'%';const failed=await window.pad.shortcuts();if(failed.length)toast(tr("Atajos ocupados por otra app: ")+failed.join(', '));}
safe(boot)();


function settingsPanel(open){document.body.classList.toggle('settings-open',open);$('settings-backdrop').hidden=!open;$('settings-toggle').setAttribute('aria-expanded',String(open));if(open)$('settings-close').focus();else $('settings-toggle').focus();}
$('settings-toggle').onclick=()=>settingsPanel(!document.body.classList.contains('settings-open'));
$('settings-close').onclick=$('settings-backdrop').onclick=()=>settingsPanel(false);
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('settings-open')){e.stopImmediatePropagation();settingsPanel(false);}},true);
$('quick-stop').onclick=stopAll;
$('quick-volume').oninput=()=>{$('master').value=$('quick-volume').value;$('master').oninput();};
const originalMaster=$('master').oninput;
$('master').oninput=()=>{originalMaster();$('quick-volume').value=$('master').value;$('quick-value').textContent=$('master').value+'%';};
function gameStatus(enabled){$('game-title').textContent=enabled?tr("Listo para jugar"):tr("Tu música también juega");$('game-info').textContent=enabled?tr("Música + tu voz → micrófono del juego. Usa los atajos de cada tarjeta."):tr("Configura el micrófono de Windows, tu voz y la música automáticamente.");labelIcon($('game-setup'),enabled?'check':'game',enabled?tr("Configurar de nuevo"):tr("Activar para juegos"));document.querySelector('.game-panel').classList.toggle('connected',enabled);$('game-restore').hidden=!enabled;}
$('game-setup').onclick=safe(async()=>{
 $('game-setup').disabled=true;
 try{
  await refreshDevices();
  const devices=await navigator.mediaDevices.enumerateDevices();
  const out=devices.find(d=>d.kind==='audiooutput'&&d.deviceId===$('cable').value&&/Steam Streaming Microphone|CABLE Input/i.test(d.label))||devices.find(d=>d.kind==='audiooutput'&&/Steam Streaming Microphone|CABLE Input/i.test(d.label));
  const physical=devices.find(d=>d.kind==='audioinput'&&d.deviceId===$('microphone').value&&!/steam|oculus|cable|voicemeeter/i.test(d.label))||devices.find(d=>d.kind==='audioinput'&&!['default','communications'].includes(d.deviceId)&&!/steam|oculus|cable|voicemeeter|stereo mix/i.test(d.label));
  if(!out||!physical)throw new Error(tr("Conecta tu micrófono y comprueba que Steam Streaming Microphone esté habilitado."));
  $('microphone').value=physical.deviceId;$('cable').value=out.deviceId;$('mic').checked=true;
  await setMic();$('broadcast').checked=true;await route();await engine.init();
  await window.pad.gameAudio('enable',/CABLE Input/i.test(out.label)?'cable':'steam');state.settings.gameMode=true;await saveSettings();gameStatus(true);
  toast(tr("Configurado. Abre o reinicia el chat de voz del juego. Si usas pulsar para hablar, mantén esa tecla al poner música."));
 }catch(e){$('broadcast').checked=false;$('mic').checked=false;await engine.microphone(false);await route();gameStatus(false);throw e;}
 finally{$('game-setup').disabled=false;}
});
$('game-restore').onclick=safe(async()=>{await window.pad.gameAudio('restore');$('broadcast').checked=false;$('mic').checked=false;await engine.microphone(false);await route();state.settings.gameMode=false;await saveSettings();gameStatus(false);toast(tr("Micrófonos anteriores restaurados."));});

decorateIcons();

for(const [id,layout] of [['view-list','list'],['view-grid','grid']])$(id).onclick=()=>{state.settings.layout=layout;render();scheduleSave();};
let profileAction='create';
$('profile-add').onclick=()=>{profileAction='create';$('profile-title').textContent=tr("Nuevo perfil");$('profile-name').value='';$('profile-dialog').showModal();};
$('profile-rename').onclick=()=>{profileAction='rename';$('profile-title').textContent=tr("Renombrar perfil");$('profile-name').value=$('profile-select').selectedOptions[0]?.text||'';$('profile-dialog').showModal();};
$('profile-close').onclick=()=>$('profile-dialog').close();
async function quietProfile(){clearTimeout(saveTimer);await saveSettings();engine.stopAll();if($('broadcast').checked||$('mic').checked)await window.pad.gameAudio('restore');$('broadcast').checked=false;$('mic').checked=false;await engine.microphone(false);engine.broadcast=false;await engine.route();gameStatus(false);}
$('profile-form').onsubmit=safe(async e=>{e.preventDefault();await quietProfile();state=await window.pad.profile(profileAction,$('profile-name').value);await applySettings();$('profile-dialog').close();toast(tr("Perfil guardado. Tu biblioteca sigue completa."));});
$('profile-select').onchange=safe(async e=>{const id=e.target.value;await quietProfile();state=await window.pad.profile('switch',id);await applySettings();toast(tr("Perfil cargado. Activa el modo juegos cuando lo necesites."));});
installGuide({engine,toast,setup:()=>$('game-setup').onclick(),tracks:()=>state.tracks});

$('language').onchange=safe(async()=>{clearTimeout(toastTimer);$('toast').hidden=true;state.language=$('language').value;await window.pad.language(state.language);setLanguage(state.language);decorateIcons();render();gameStatus($('broadcast').checked);updatePlayer();});

featureUI=installFeatures({getState:()=>state,refresh:async()=>{state=await window.pad.state();render();},toast,openEdit});
decorateIcons();
