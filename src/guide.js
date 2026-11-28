import {t as tr,captureDocument,setLanguage,getLanguage} from './i18n.js';
export function installGuide({engine,toast,setup,tracks}) {
 const $=id=>document.getElementById(id);let step=0,stream,recorder,timer,meterTimer,url,recordedTrack,starting=false,signalTimer,source,meter,peak=0;
 window.addEventListener('language-changed',()=>{if($('help').open)show();});
 const steps=[...document.querySelectorAll('.guide-step')];
 function show(){steps.forEach((el,i)=>el.hidden=i!==step);document.querySelectorAll('.guide-progress span').forEach((el,i)=>el.classList.toggle('active',i===step));$('guide-prev').disabled=step===0;$('guide-page').textContent=tr('{page} de 4',{page:step+1});$('guide-next').textContent=step===3?tr("¡Listo!"):tr("Continuar");}
 function cleanup(){clearTimeout(timer);clearInterval(signalTimer);source?.disconnect();if(recorder?.state==='recording')recorder.stop();stream?.getTracks().forEach(t=>t.stop());stream=null;if(recordedTrack)engine.stop(recordedTrack);recordedTrack=null;}
 async function open(){
  step=0;show();$('help').showModal();
  $('guide-track').replaceChildren(new Option(tr("Solo mi voz"),''),...tracks().filter(t=>t.kind!=='spotify').map(t=>new Option(t.name,t.id)));
  const devices=await navigator.mediaDevices.enumerateDevices();
  $('guide-input').replaceChildren(...devices.filter(d=>d.kind==='audioinput'&&!['default','communications'].includes(d.deviceId)).map(d=>new Option(d.label||tr("Micrófono"),d.deviceId)));
  const output=$('cable').selectedOptions[0]?.text||'';
  const input=devices.find(d=>d.kind==='audioinput'&&(/Steam Streaming Microphone/i.test(output)?/Steam Streaming Microphone/i.test(d.label):/CABLE Output/i.test(d.label)));
  if(input)$('guide-input').value=input.deviceId;
  for(const [guide,actual] of [['guide-voice','mic-volume'],['guide-music','master'],['guide-send','send-volume']])$(guide).value=$(actual).value;
  meterTimer=setInterval(()=>$('voice-level').style.width=Math.min(100,engine.level(engine.voiceMeter)*100)+'%',100);
 }
 $('quick-help').onclick=$('guide').onclick=()=>open().catch(e=>toast(e.message));
 $('close-help').onclick=()=>$('help').close();
 $('help').addEventListener('close',()=>{cleanup();clearInterval(meterTimer);$('guide-playback').pause();});
 $('guide-prev').onclick=()=>{cleanup();step=Math.max(0,step-1);show();};
 $('guide-next').onclick=()=>{cleanup();if(step===3)return $('help').close();step++;show();};
 $('guide-setup').onclick=async()=>{
  $('guide-setup').disabled=true;
  try{await setup();$('guide-route').textContent=$('broadcast').checked&&$('mic').checked?tr("Conectado: tu voz y la música están activas. Puedes continuar."):tr("No se completó la conexión. Revisa el aviso y los dispositivos en Ajustes.");}
  finally{$('guide-setup').disabled=false;}
 };
 for(const [guide,actual] of [['guide-voice','mic-volume'],['guide-music','master'],['guide-send','send-volume']])$(guide).oninput=()=>{$(actual).value=$(guide).value;$(actual).oninput();};
 $('guide-record').onclick=async()=>{
  if(starting)return;starting=true;$('guide-record').disabled=true;
  try{
   cleanup();$('guide-playback').pause();$('guide-playback').hidden=true;
   if(!$('broadcast').checked||!$('mic').checked)throw new Error(tr("Activa voz y música en el primer paso antes de grabar."));
   if(!$('guide-input').value)throw new Error(tr("Elige el micrófono virtual que usa el juego."));
   stream=await navigator.mediaDevices.getUserMedia({audio:{deviceId:{exact:$('guide-input').value},echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
   if(!$('help').open){cleanup();return;}
   const chunks=[];recorder=new MediaRecorder(stream);
   source=engine.ctx.createMediaStreamSource(stream);meter=engine.ctx.createAnalyser();source.connect(meter);peak=0;
   signalTimer=setInterval(()=>{peak=Math.max(peak,engine.level(meter));},50);
   recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
   recorder.onstop=()=>{
    clearInterval(signalTimer);source?.disconnect();stream?.getTracks().forEach(t=>t.stop());stream=null;
    if(recordedTrack)engine.stop(recordedTrack);recordedTrack=null;
    if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(new Blob(chunks,{type:recorder.mimeType}));
    $('guide-playback').src=url;$('guide-playback').hidden=false;
    $('guide-playback').dataset.bytes=String(chunks.reduce((sum,c)=>sum+c.size,0));
    $('record-status').textContent=peak>.005?tr("Prueba lista: recibimos señal del micrófono virtual. Escucha si tu voz y la música se entienden."):tr("Grabación lista, pero no detectamos señal clara. Revisa el envío, el micrófono y los volúmenes antes de jugar.");
    $('guide-record').disabled=false;starting=false;
   };
   recorder.start();
   const track=tracks().find(t=>t.id===$('guide-track').value);
   if(track){engine.stopAll();await engine.play({...track,loop:false},true);recordedTrack=track.id;}
   $('record-status').textContent=tr("Grabando 6 segundos… habla mientras suena la música.");
   timer=setTimeout(()=>{if(recorder?.state==='recording')recorder.stop();},6000);
  }catch(e){cleanup();$('record-status').textContent=e.message;$('guide-record').disabled=false;starting=false;}
 };
 $('guide-playback').onplay=()=>{
  // Listen through the physical output, never feed the recording back to the game.
  $('guide-playback').setSinkId($('speakers').value||'default').catch(e=>{ $('guide-playback').pause();toast(e.message); });
 };
}
