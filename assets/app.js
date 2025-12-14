function init(){const b=document.getElementById("gsi-button");if(!window.google||!window.google.accounts||!window.google.accounts.id){setStatus("Loading Google authentication...");return}google.accounts.id.initialize({client_id:window.CONFIG.CLIENT_ID,callback:onCredential,auto_select:false});google.accounts.id.renderButton(b,{theme:"filled_black",size:"large",width:320});setStatus("")}
function onCredential(r){try{const p=parseJwt(r.credential);const email=p.email||"";const name=p.name||p.given_name||"";if(!email){setStatus("Unable to read email from Google.");return}setStatus("Signing in..."); fetchAndShowServerValidated(r.credential,name||email)}catch(e){setStatus("Sign in failed.")}}
function parseJwt(t){const s=t.split(".");const d=(v)=>decodeURIComponent(atob(v.replace(/-/g,"+").replace(/_/g,"/")).split("").map(function(c){return"%"+('00'+c.charCodeAt(0).toString(16)).slice(-2)}).join(""));return JSON.parse(d(s[1]))}
async function fetchAndShow(email,name){setStatus("Loading your data...");let data=null;try{data=await fetchJson(withParams(window.CONFIG.APPS_SCRIPT_URL,{email:email,sheetId:window.CONFIG.SHEET_ID,range:window.CONFIG.RANGE}))}catch(e){}
if(!data){try{data=await fetchJson(window.CONFIG.APPS_SCRIPT_URL)}catch(e){}}
let row=null, headers=null;const parsed=parseData(data);headers=parsed.headers;const rows=parsed.rows;if(headers&&rows&&headers.length&&rows.length){const normHeaders=headers.map(normalizeHeader);let idx=normHeaders.findIndex(h=>h==="email");const emailLower=String(email).trim().toLowerCase();let match=null;if(idx!==-1){match=rows.find(r=>String(r[idx]).trim().toLowerCase()===emailLower)}else{match=rows.find(r=>r.some(c=>String(c).trim().toLowerCase()===emailLower));if(!match){idx=0;match=rows.find(r=>String(r[0]).trim().toLowerCase()===emailLower)}}if(match){row=toObject(headers,match)}}
if(!row&&Array.isArray(data)&&data.length&&typeof data[0]==='object'&&!Array.isArray(data[0])){const obj=data.find(x=>String((x.Email||x.email||"")).trim().toLowerCase()===String(email).trim().toLowerCase());if(obj){row=obj;headers=Object.keys(obj)}}
if(!row&&data&&data.values&&Array.isArray(data.values)&&data.values.length){const vals=data.values;const hdr=vals[0];headers=hdr;const normHeaders=hdr.map(normalizeHeader);let idx=normHeaders.findIndex(h=>h==="email");const emailLower=String(email).trim().toLowerCase();let match=null;if(idx!==-1){match=vals.slice(1).find(r=>String(r[idx]).trim().toLowerCase()===emailLower)}else{match=vals.slice(1).find(r=>r.some(c=>String(c).trim().toLowerCase()===emailLower));if(!match){idx=0;match=vals.slice(1).find(r=>String(r[0]).trim().toLowerCase()===emailLower)}}if(match){row=toObject(hdr,match)}}
if(!row){setStatus("Access denied. Your email is not listed.");toggleView(false);return}
document.getElementById("welcome").textContent="Welcome, "+(name||email);
renderTable(row);
toggleView(true);setStatus("");document.getElementById("logout").onclick=function(){google.accounts.id.disableAutoSelect();toggleView(false);setStatus("")}}
function withParams(url,obj){const u=new URL(url);Object.keys(obj).forEach(k=>{if(obj[k]!==undefined&&obj[k]!==null)u.searchParams.set(k,obj[k])});return u.toString()}
async function fetchJson(url){const res=await fetch(url,{method:"GET"});if(!res.ok)throw new Error("bad status");const ct=res.headers.get("content-type")||"";if(ct.includes("application/json"))return res.json();const text=await res.text();try{return JSON.parse(text)}catch(e){return {}}}
function parseData(data){if(!data)return{headers:null,rows:null};if(Array.isArray(data)&&data.length){if(Array.isArray(data[0])){return{headers:data[0],rows:data.slice(1)}}}
if(data&&data.data&&Array.isArray(data.data)){const d=data.data;if(Array.isArray(d[0])){return{headers:d[0],rows:d.slice(1)}}}
if(data&&data.rows&&Array.isArray(data.rows)&&data.headers&&Array.isArray(data.headers)){return{headers:data.headers,rows:data.rows}}
return{headers:null,rows:null}}
function toObject(headers,row){const o={};for(let i=0;i<headers.length;i++){o[String(headers[i]).trim()]=row[i]}return o}
function normalizeHeader(h){return String(h).trim().toLowerCase().replace(/[^a-z0-9]/g,'')}
function renderTable(row){const table=document.getElementById("data-table");const keys=Object.keys(row);const vals=keys.map(k=>row[k]);const thead='<thead><tr>'+keys.map(k=>'<th>'+escapeHtml(k)+'</th>').join('')+'</tr></thead>';const tbody='<tbody><tr>'+vals.map(v=>'<td>'+escapeHtml(String(v??''))+'</td>').join('')+'</tr></tbody>';table.innerHTML=thead+tbody}
function escapeHtml(s){return s.replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]})}
function toggleView(showData){document.getElementById("login-view").classList.toggle("hidden",showData);document.getElementById("data-view").classList.toggle("hidden",!showData)}
function setStatus(t){document.getElementById("status").textContent=t}
async function fetchAndShowServerValidated(idToken,displayName){setStatus("Loading your data...");let url=withParams(window.CONFIG.APPS_SCRIPT_URL,{sheetId:window.CONFIG.SHEET_ID,range:window.CONFIG.RANGE,client_id:window.CONFIG.CLIENT_ID});let resp=null;try{resp=await fetch(url,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:"id_token="+encodeURIComponent(idToken)})}catch(e){}
if(!resp){setStatus("Access denied. Your email is not listed.");toggleView(false);return}
let data=null;try{const ct=resp.headers.get("content-type")||"";data=ct.includes("application/json")?await resp.json():JSON.parse(await resp.text())}catch(e){data=null}
if(!data||data.error){setStatus(data&&data.error?data.error:"Access denied. Your email is not listed.");toggleView(false);return}
let headers=null;let rowObj=null;
if(Array.isArray(data.headers)&&Array.isArray(data.row)){headers=data.headers;rowObj=toObject(headers,data.row)}
else if(data.row&&typeof data.row==='object'&&!Array.isArray(data.row)){rowObj=data.row;headers=Object.keys(rowObj)}
else if(Array.isArray(data.values)&&data.values.length>=2){headers=data.values[0];rowObj=toObject(headers,data.values[1])}
if(!rowObj){setStatus("Access denied. Your email is not listed.");toggleView(false);return}
document.getElementById("welcome").textContent="Welcome, "+(data.name||displayName||data.email||"");
renderTable(rowObj);
toggleView(true);setStatus("");document.getElementById("logout").onclick=function(){google.accounts.id.disableAutoSelect();toggleView(false);setStatus("")}}
window.addEventListener("DOMContentLoaded",init)
