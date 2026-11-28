const fs=require('node:fs/promises'),path=require('node:path'),{spawn}=require('node:child_process');
function normalizeSpotifyLink(value){
 if(typeof value!=='string')throw new Error('Invalid Spotify link.');
 const uri=/^spotify:track:([a-zA-Z0-9]{22})$/.exec(value.trim());if(uri)return 'spotify:track:'+uri[1];
 let url;try{url=new URL(value.trim())}catch{throw new Error('Paste a Spotify track link.');}
 const track=/^\/(?:intl-[a-z]{2}\/)?track\/([a-zA-Z0-9]{22})\/?$/.exec(url.pathname);
 if(url.protocol!=='https:'||url.hostname!=='open.spotify.com'||!track||url.username||url.password)throw new Error('Use an https://open.spotify.com/track/ link.');
 return 'spotify:track:'+track[1];
}
function spotifyKey(title,artist){return `${String(title).trim().toLowerCase()}\n${String(artist).trim().toLowerCase()}`;}
class SpotifyIntegration {
 constructor({root,source,onUpdate}){this.root=root;this.source=source;this.onUpdate=onUpdate;this.current={available:false};this.child=null;}
 async script(){const target=path.join(this.root,'spotify-session.ps1');await fs.copyFile(path.join(this.source,'spotify-session.ps1'),target);return target;}
 async start(){if(this.child)return;const script=await this.script();const child=spawn('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',script,'-Action','watch'],{windowsHide:true});this.child=child;let buffer='';
  child.stdout.on('data',d=>{buffer+=d.toString();if(buffer.length>16384)buffer='';const lines=buffer.split(/\r?\n/);buffer=lines.pop();for(const line of lines)try{const data=JSON.parse(line);if(data.title)data.title=String(data.title).slice(0,300);if(data.artist)data.artist=String(data.artist).slice(0,300);this.current=data;this.onUpdate(data);}catch{}});
  child.stderr.on('data',()=>{});
  child.on('error',e=>{this.current={available:false,error:e.message};this.onUpdate(this.current);});child.on('close',()=>{if(this.child===child){this.child=null;this.current={available:false};this.onUpdate(this.current);}});
 }
 stop(){this.child?.kill();this.child=null;this.current={available:false};}
 async resume(){const script=await this.script();return new Promise((resolve,reject)=>{const child=spawn('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',script,'-Action','resume'],{windowsHide:true});let output='';const timer=setTimeout(()=>{child.kill();reject(new Error('Spotify media control timed out.'));},10000);child.stdout.on('data',d=>output+=d);child.on('error',e=>{clearTimeout(timer);reject(e)});child.on('close',code=>{clearTimeout(timer);try{if(code!==0)throw new Error('Could not control Spotify.');resolve(JSON.parse(output.trim()))}catch(e){reject(e)}});});}
}
module.exports={normalizeSpotifyLink,spotifyKey,SpotifyIntegration};
