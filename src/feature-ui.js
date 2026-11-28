import {t} from './i18n.js';
import {icon,labelIcon} from './icons.js';

export function installFeatures({getState,refresh,toast,openEdit}){
 const $=id=>document.getElementById(id);let currentTrack,reportTrack,manualJobId,models=[],settings={},spotifyCurrent={available:false},tools={},report;
 const jobs=new Map(),dismissed=new Set();let loadingModels;
 const safe=fn=>async(...args)=>{try{return await fn(...args)}catch(e){toast(t(e.message||String(e)));}};
 async function loadModels(){
  if(loadingModels)return loadingModels;
  loadingModels=(async()=>{models=await window.pad.cleanModels();$('clean-model').replaceChildren(...models.map(m=>new Option(m.name+' · $0',m.id)));
   const selected=models.find(m=>m.id===settings.model)||models.find(m=>m.id==='opencode/flint-40b-free')||models[0];
   if(selected){$('clean-model').value=selected.id;settings=await window.pad.cleanSettings({model:selected.id});}else $('clean-tool-status').textContent=t('No hay modelos gratuitos disponibles. No se usará uno de pago.');
  })().finally(()=>{loadingModels=null;});return loadingModels;
 }
 async function status(){const result=await window.pad.cleanStatus();settings=result.settings;result.jobs.forEach(j=>jobs.set(j.id,j));$('clean-auto').checked=settings.auto;$('clean-strict').checked=settings.strict;$('clean-fade').value=settings.fadeMs;$('clean-padding').value=settings.paddingMs;$('clean-audio-language').value=settings.audioLanguage||'auto';renderJobs();}
 async function preferences(){
  $('feature-settings').showModal();await status();
  const spotify=await window.pad.spotifyStatus();$('spotify-enable').checked=spotify.enabled;spotifyCurrent=spotify.current;renderSpotify();
  tools=await window.pad.cleanTools();$('clean-tool-status').textContent=t(tools.python?'Procesamiento local listo.':'Necesitas Python y las herramientas de audio.');
  if(!tools.opencode)$('clean-tool-status').textContent+=' '+t('Instala OpenCode para usar modelos gratuitos.');
  if(tools.opencode)await loadModels();
 }
 $('feature-tools').onclick=safe(preferences);$('features-close').onclick=()=>$('feature-settings').close();
 $('clean-refresh').onclick=safe(async()=>{await loadModels();toast(t('Catálogo gratuito actualizado.'));});
 $('clean-prepare').onclick=safe(async()=>{
  $('clean-prepare').disabled=true;$('clean-tool-status').textContent=t('Preparando herramientas y modelos locales (aprox. 600 MB). Puede tardar varios minutos.');
  try{tools=await window.pad.cleanPrepare();$('clean-tool-status').textContent=t('Herramientas de audio listas.');if(tools.opencode)await loadModels();}
  finally{$('clean-prepare').disabled=false;}
 });
 $('opencode-help').onclick=safe(()=>window.pad.featureHelp('opencode'));$('python-help').onclick=safe(()=>window.pad.featureHelp('python'));
 $('clean-model').onchange=safe(async()=>{settings=await window.pad.cleanSettings({model:$('clean-model').value});});
 $('clean-auto').onchange=safe(async()=>{
  if($('clean-auto').checked){tools=await window.pad.cleanTools();if(!tools.python||!tools.opencode){$('clean-auto').checked=false;throw new Error('Prepara las herramientas de audio e instala OpenCode primero.');}await loadModels();if(!settings.model){$('clean-auto').checked=false;throw new Error('No hay modelos gratuitos disponibles. No se usará uno de pago.');}}
  settings=await window.pad.cleanSettings({auto:$('clean-auto').checked});
 });
 for(const id of ['clean-strict','clean-fade','clean-padding','clean-audio-language'])$(id).onchange=safe(async()=>{settings=await window.pad.cleanSettings({strict:$('clean-strict').checked,fadeMs:Number($('clean-fade').value),paddingMs:Number($('clean-padding').value),audioLanguage:$('clean-audio-language').value});});
 const stages={queued:'En cola',transcribing:'Transcribiendo',planning:'Planificando con OpenCode',rendering:'Separando voz y creando Clean',review:'Transcripción lista · marcar cortes',done:'Clean creada · revisar',cancelled:'Cancelado',error:'No se pudo crear Clean'};
 function renderJobs(){
  $('clean-jobs').replaceChildren(...[...jobs.values()].slice(-10).reverse().map(job=>{
   const row=document.createElement('div');row.className='clean-job';const info=document.createElement('div'),name=document.createElement('strong'),detail=document.createElement('small');name.textContent=job.name;detail.textContent=t(stages[job.stage]||job.stage)+(job.error?' · '+t(job.error):'');info.append(name,detail);row.append(info);
   if(job.stage==='review'){const review=document.createElement('button');review.textContent=t('Revisar');review.onclick=safe(async()=>{manualJobId=job.id;reportTrack=null;showReport(await window.pad.cleanTranscript(job.id));});row.append(review);}
   if(!['done','review','cancelled','error'].includes(job.stage)){const bar=document.createElement('progress');bar.max=100;bar.value=job.progress||0;row.append(bar);const cancel=document.createElement('button');labelIcon(cancel,'x');cancel.setAttribute('aria-label',t('Cancelar'));cancel.onclick=safe(()=>window.pad.cleanCancel(job.id));row.append(cancel);}return row;
  }));
  const active=[...jobs.values()].filter(j=>!['done','review','cancelled','error'].includes(j.stage));$('clean-activity').hidden=!active.length;$('clean-activity').textContent=active.length?t('Creando {count} versión(es) Clean…',{count:active.length}):'';
 }
 window.pad.onClean(safe(async job=>{jobs.set(job.id,job);renderJobs();if(job.stage==='review'){manualJobId=job.id;reportTrack=null;showReport(await window.pad.cleanTranscript(job.id));}if(job.stage==='done'){await refresh();toast(t('Versión Clean creada. El original sigue intacto; revisa el resultado.'));}if(job.stage==='error')toast(t('No se pudo crear Clean. Tu original sigue intacto.')+' '+t(job.error||''));}));
 async function startClean(track){
  if(track.kind==='spotify')throw new Error('La censura solo procesa archivos locales importados.');
  await status();tools=await window.pad.cleanTools();if(!tools.python||!tools.opencode){await preferences();throw new Error('Prepara las herramientas de audio e instala OpenCode primero.');}
  if(!settings.model)await loadModels();const job=await window.pad.cleanStart(track.id);jobs.set(job.id,job);renderJobs();toast(t('Original conservado. La versión Clean se creará por separado.'));
 }
 function openActions(track){currentTrack=track;$('actions-title').textContent=track.name;$('action-clean').hidden=$('action-manual').hidden=track.kind==='spotify';$('action-review').hidden=!track.cleanOf;$('actions-info').textContent=track.kind==='spotify'?t('Acceso externo: reproduce en Spotify, sin descargar audio.'):(track.cleanOf?t('Versión Clean automática: revisa los cortes antes de usarla.'):t('El original nunca se reemplaza.'));$('sound-actions').showModal();}
 $('actions-close').onclick=()=>$('sound-actions').close();
 $('action-edit').onclick=()=>{$('sound-actions').close();openEdit(currentTrack);};
 $('action-clean').onclick=safe(async()=>{$('sound-actions').close();await startClean(currentTrack);});
 function showReport(data){report=data;$('clean-word-list').replaceChildren(...report.words.map((word,index)=>{const label=document.createElement('label'),checkbox=document.createElement('input'),span=document.createElement('span');checkbox.type='checkbox';checkbox.value=index;checkbox.checked=(report.selected||[]).includes(index);span.textContent=word.start.toFixed(2)+'s · '+word.word;label.append(checkbox,span);return label;}));$('clean-review-note').textContent=report.uncertain?.length?t('Hay fragmentos de transcripción incierta. Escucha y revisa antes de usarla.'):t('Marca las palabras que quieres retirar. El acompañamiento continúa.');if(!$('clean-review').open)$('clean-review').showModal();}
 $('action-review').onclick=safe(async()=>{$('sound-actions').close();manualJobId=null;reportTrack=currentTrack;showReport(await window.pad.cleanReport(currentTrack.id));});
 $('action-manual').onclick=safe(async()=>{$('sound-actions').close();tools=await window.pad.cleanTools();if(!tools.python){await preferences();throw new Error('Prepara las herramientas de audio primero.');}await window.pad.cleanTranscribe(currentTrack.id);toast(t('Transcribiendo localmente. Después podrás marcar los cortes sin usar OpenCode.'));});
 $('clean-review-close').onclick=()=>$('clean-review').close();
 $('clean-review-save').onclick=safe(async()=>{const selected=[...$('clean-word-list').querySelectorAll('input:checked')].map(i=>Number(i.value));if(manualJobId)await window.pad.cleanManualSave(manualJobId,selected);else await window.pad.cleanRevise(reportTrack.id,selected);$('clean-review').close();toast(t('Se creará otra versión; no se reemplazará ninguna.'));});
 function renderSpotify(){
  $('spotify-state').textContent=spotifyCurrent.available?[spotifyCurrent.title,spotifyCurrent.artist].filter(Boolean).join(' · '):t('Abre la app de Spotify y reproduce una canción.');
  const key=spotifyCurrent.title+'\n'+spotifyCurrent.artist;const exists=getState().tracks.some(track=>track.kind==='spotify'&&track.name===spotifyCurrent.title&&track.artist===spotifyCurrent.artist);
  $('spotify-suggestion').hidden=!spotifyCurrent.available||!spotifyCurrent.playing||dismissed.has(key)||exists;
  $('spotify-now').textContent=[spotifyCurrent.title,spotifyCurrent.artist].filter(Boolean).join(' · ');
 }
 window.pad.onSpotify(data=>{spotifyCurrent=data;renderSpotify();});
 $('spotify-enable').onchange=safe(async()=>{const result=await window.pad.spotifyEnable($('spotify-enable').checked);spotifyCurrent=result.current;renderSpotify();});
 function addSpotify(){const selected=spotifyCurrent.available?spotifyCurrent:{};$('spotify-name').value=selected.title||'';$('spotify-artist').value=selected.artist||'';$('spotify-link').value='';$('spotify-dialog').showModal();}
 $('spotify-suggest-add').onclick=$('spotify-add-link').onclick=addSpotify;
 $('spotify-dismiss').onclick=()=>{dismissed.add(spotifyCurrent.title+'\n'+spotifyCurrent.artist);renderSpotify();};
 $('spotify-close').onclick=()=>$('spotify-dialog').close();
 $('spotify-form').onsubmit=safe(async e=>{e.preventDefault();await window.pad.spotifyAdd({name:$('spotify-name').value,artist:$('spotify-artist').value,link:$('spotify-link').value.trim()});$('spotify-dialog').close();await refresh();renderSpotify();toast(t('Acceso guardado. La reproducción permanece en Spotify.'));});
 window.addEventListener('language-changed',()=>{renderJobs();renderSpotify();});
 status().catch(()=>{});window.pad.spotifyStatus().then(result=>{spotifyCurrent=result.current;renderSpotify();}).catch(()=>{});
 return {openActions,renderSpotify};
}
