/* OVERLOAD encrypted sync client. Server receives ciphertext only. */
(() => {
 'use strict';
 const encoder=new TextEncoder(),decoder=new TextDecoder();
 const API='/v1/sync',DB='overload-local-snapshots',STORE='snapshots';
 const b64url=bytes=>{let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')};
 const unb64url=value=>Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(value.length/4)*4,'=')),c=>c.charCodeAt(0));
 const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
 async function digest(value){return new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value)))}
 async function derive(phrase){
  if(typeof phrase!=='string'||phrase.trim().length<32)throw new Error('Your recovery key must contain at least 32 characters.');
  const clean=phrase.trim();
  const syncId=hex(await digest('OVERLOAD_SYNC_ID_V1:'+clean));
  const material=await crypto.subtle.importKey('raw',encoder.encode(clean),'PBKDF2',false,['deriveKey']);
  const encryptionKey=await crypto.subtle.deriveKey({name:'PBKDF2',salt:encoder.encode('OVERLOAD_ENCRYPTION_V1'),iterations:310000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  return {syncId,encryptionKey};
 }
 function openDb(){
  return new Promise((resolve,reject)=>{
   if(!('indexedDB' in window)){resolve(null);return}
   const request=indexedDB.open(DB,1);
   request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'id',autoIncrement:true})};
   request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
  });
 }
 async function archiveLocal(payload){
  try{
   const db=await openDb();if(!db)return false;
   await new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);
    store.add({createdAt:new Date().toISOString(),payload});
    const count=store.count();count.onsuccess=()=>{const excess=count.result-19;if(excess>0){const cursor=store.openCursor();let removed=0;cursor.onsuccess=()=>{const c=cursor.result;if(!c||removed>=excess)return;c.delete();removed++;c.continue()}}};
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
   });
   db.close();return true;
  }catch(error){console.warn('OVERLOAD local snapshot could not be archived',error);return false}
 }
 async function request(phrase,action,data={}){
  const {syncId}=await derive(phrase);
  const response=await fetch(API,{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+phrase},body:JSON.stringify({action,syncId,...data}),cache:'no-store'});
  const body=await response.json().catch(()=>({}));
  if(response.status===404&&action==='get')return null;
  if(response.status===409)throw Object.assign(new Error(body.error||'A newer cloud version exists. Resolve the sync conflict before uploading.'),{code:'CONFLICT',revision:body.revision});
  if(!response.ok)throw new Error(body.error||'Encrypted cloud sync is unavailable ('+response.status+').');
  return body;
 }
 async function encrypt(phrase,payload){
  const {encryptionKey}=await derive(phrase),iv=crypto.getRandomValues(new Uint8Array(12));
  const clear=encoder.encode(JSON.stringify(payload));
  const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},encryptionKey,clear);
  const encoded=b64url(new Uint8Array(cipher)),chunks=[];for(let i=0;i<encoded.length;i+=180000)chunks.push(encoded.slice(i,i+180000));
  if(chunks.length>48)throw new Error('Your backup is too large for encrypted cloud sync. Export a local JSON backup as an additional copy.');\n  return {iv:b64url(iv),chunks};
 }
 async function decrypt(phrase,remote){
  const {encryptionKey}=await derive(phrase);
  const joined=Array.isArray(remote.chunks)?remote.chunks.join(''):'';
  if(!joined||joined.length>180000*48)throw new Error('Cloud backup is empty or exceeds the supported size.');\n  const clear=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64url(remote.iv)},encryptionKey,unb64url(joined));
  const payload=JSON.parse(decoder.decode(clear));
  const validation=window.OverloadBackup?.validateBackup(payload);
  if(!validation?.valid)throw new Error(validation?.error||'Cloud backup failed integrity validation.');
  return payload;
 }
 async function get(phrase){return request(phrase,'get')}
 async function upload(phrase,payload,expectedRevision){
  const encrypted=await encrypt(phrase,payload);
  return request(phrase,'put',{revision:expectedRevision,...encrypted});
 }
 function generateRecoveryKey(){return b64url(crypto.getRandomValues(new Uint8Array(32)))}
 window.OverloadSync=Object.freeze({archiveLocal,generateRecoveryKey,get,upload,decrypt});
})();
