import {t} from './i18n.js';
function encodeWav(buffer){
 const channels=buffer.numberOfChannels,frames=buffer.length,bytes=frames*channels*4;
 if(bytes>256*1024*1024)throw new Error(t('El audio decodificado supera el límite de 256 MB.'));
 const result=new ArrayBuffer(44+bytes),view=new DataView(result);let p=0;
 const str=s=>{for(const c of s)view.setUint8(p++,c.charCodeAt(0));},u16=n=>{view.setUint16(p,n,true);p+=2;},u32=n=>{view.setUint32(p,n,true);p+=4;};
 str('RIFF');u32(bytes+36);str('WAVEfmt ');u32(16);u16(3);u16(channels);u32(buffer.sampleRate);u32(buffer.sampleRate*channels*4);u16(channels*4);u16(32);str('data');u32(bytes);
 const out=new Float32Array(result,44),data=Array.from({length:channels},(_,i)=>buffer.getChannelData(i));
 for(let f=0;f<frames;f++)for(let c=0;c<channels;c++)out[f*channels+c]=data[c][f];
 return new Uint8Array(result);
}
export async function importSources(sources,onProgress){
 if(!sources)return null;
 const context=new AudioContext({sampleRate:48000});let added=0;const errors=[];
 try{for(let i=0;i<sources.length;i++){
  const source=sources[i];onProgress({current:i+1,total:sources.length,name:source.name});
  try{const response=await fetch(source.url);if(!response.ok)throw new Error(t('No se pudo leer el archivo de audio.'));const buffer=await context.decodeAudioData(await response.arrayBuffer());await window.pad.storeAudio(source.token,encodeWav(buffer));added++;}
  catch(e){errors.push(source.name+': '+t('No se pudo decodificar. Prueba MP3, WAV, FLAC, OGG o M4A.')+' '+e.message);}
 }}finally{await context.close();onProgress(null);await window.pad.clearSources();}
 return {state:await window.pad.state(),added,errors};
}
