import {t as tr,captureDocument,setLanguage,getLanguage} from './i18n.js';
// Audio engine: one source per clip, two independently routed stereo buses.
export class SoundEngine {
  constructor(onChange,onError) {this.onChange=onChange;this.onError=onError;this.active=new Map();this.master=.8;this.voiceVolume=.8;this.sendVolume=.1;this.monitor=true;this.broadcast=false;this.speakerId='default';this.cableId='';}
  async init() {
    if(this.ctx){await this.ctx.resume();return;}
    this.ctx=new AudioContext({sampleRate:48000,latencyHint:'interactive'});
    this.music=this.ctx.createGain();this.music.gain.value=this.master;
    this.monitorGain=this.ctx.createGain();this.callGain=this.ctx.createGain();this.voiceGain=this.ctx.createGain();this.voiceGain.gain.value=this.voiceVolume;
    this.music.connect(this.monitorGain);this.music.connect(this.callGain);this.voiceGain.connect(this.callGain);
    this.voiceMeter=this.ctx.createAnalyser();this.voiceMeter.fftSize=256;this.voiceGain.connect(this.voiceMeter);
    this.meter=this.ctx.createAnalyser();this.meter.fftSize=256;this.music.connect(this.meter);
    this.outputs=[];
    for(const bus of [this.monitorGain,this.callGain]) {
      const compressor=this.ctx.createDynamicsCompressor();compressor.threshold.value=-6;compressor.knee.value=6;compressor.ratio.value=20;compressor.attack.value=.003;compressor.release.value=.12;
      const dest=this.ctx.createMediaStreamDestination();bus.connect(compressor);compressor.connect(dest);
      const audio=new Audio();audio.srcObject=dest.stream;this.outputs.push(audio);
    }
    await this.route();await this.ctx.resume();
  }
  async route() {
    if(!this.ctx)return;
    this.monitorGain.gain.value=0;this.callGain.gain.value=0;
    if(this.monitor){await this.outputs[0].setSinkId(this.speakerId||'default');await this.outputs[0].play();this.monitorGain.gain.value=1;}else this.outputs[0].pause();
    if(this.broadcast&&this.cableId){await this.outputs[1].setSinkId(this.cableId);await this.outputs[1].play();this.callGain.gain.value=this.sendVolume;}else this.outputs[1].pause();
  }
  setVolume(v){this.master=v;if(this.music)this.music.gain.setTargetAtTime(v,this.ctx.currentTime,.015);}
  setVoiceVolume(v){this.voiceVolume=v;if(this.voiceGain)this.voiceGain.gain.setTargetAtTime(v,this.ctx.currentTime,.015);}
  setSendVolume(v){this.sendVolume=v;if(this.callGain&&this.broadcast)this.callGain.gain.setTargetAtTime(v,this.ctx.currentTime,.015);}
  async play(track,exclusive=true) {
    await this.init();
    if(this.active.has(track.id)){this.stop(track.id);return;}
    if(exclusive)this.stopAll();
    const audio=new Audio(track.url);audio.loop=track.loop;audio.preload='auto';
    const source=this.ctx.createMediaElementSource(audio),gain=this.ctx.createGain();gain.gain.value=track.volume;
    source.connect(gain);gain.connect(this.music);
    this.active.set(track.id,{audio,source,gain,track});
    audio.onended=()=>this.stop(track.id);
    audio.onerror=()=>{this.stop(track.id);this.onError(tr('No se pudo reproducir {name}. Vuelve a importar el archivo.',{name:track.name}));};
    try{await audio.play();this.onChange();}catch(e){this.stop(track.id);throw e;}
  }
  update(track){const p=this.active.get(track.id);if(p){p.track=track;p.gain.gain.setTargetAtTime(track.volume,this.ctx.currentTime,.015);p.audio.loop=track.loop;}}
  stop(id){const p=this.active.get(id);if(!p)return;p.audio.pause();p.audio.onended=null;p.audio.onerror=null;p.audio.removeAttribute('src');p.audio.load();p.source.disconnect();p.gain.disconnect();this.active.delete(id);this.onChange();}
  stopAll(){for(const id of [...this.active.keys()])this.stop(id);}
  async microphone(enabled,id='default') {
    this.micStream?.getTracks().forEach(t=>t.stop());this.micSource?.disconnect();this.micStream=null;this.micSource=null;
    if(!enabled)return;
    await this.init();
    const stream=await navigator.mediaDevices.getUserMedia({audio:{deviceId:id==='default'?undefined:{exact:id},echoCancellation:false,noiseSuppression:false,autoGainControl:false},video:false});
    this.micStream=stream;this.micSource=this.ctx.createMediaStreamSource(stream);this.micSource.connect(this.voiceGain);
  }
  level(meter=this.meter){if(!meter)return 0;const values=new Uint8Array(meter.fftSize);meter.getByteTimeDomainData(values);let peak=0;for(const v of values)peak=Math.max(peak,Math.abs(v-128)/128);return peak;}
}
