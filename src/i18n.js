import en from './locales/en.json' with {type:'json'};
let language=navigator.language.toLowerCase().startsWith('es')?'es':'en';
const textNodes=[],attributes=[];
export function t(source,values={}){let text=language==='en'?(en[source]??source):source;return text.replace(/\{(\w+)\}/g,(match,key)=>values[key]??match);}
export function captureDocument(){
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
 while(walker.nextNode()){const node=walker.currentNode;if(node.textContent.trim()&&!['SCRIPT','STYLE'].includes(node.parentElement?.tagName))textNodes.push([node,node.textContent]);}
 document.querySelectorAll('*').forEach(el=>{for(const name of ['title','placeholder','aria-label'])if(el.hasAttribute(name))attributes.push([el,name,el.getAttribute(name)]);});
}
export function setLanguage(value){language=value==='es'?'es':'en';document.documentElement.lang=language;
 for(const [node,source] of textNodes)if(node.isConnected){const key=source.trim();node.textContent=source.replace(key,t(key));}
 for(const [el,name,source] of attributes)if(el.isConnected)el.setAttribute(name,t(source));
 document.getElementById('language').value=language;
 window.dispatchEvent(new CustomEvent('language-changed'));
}
export function getLanguage(){return language;}
