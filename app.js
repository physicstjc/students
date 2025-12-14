const emailDomain="@students.edu.sg";
const ui={
 signin:document.getElementById("signin"),
 signout:document.getElementById("signout"),
 status:document.getElementById("auth-status"),
 controls:document.getElementById("controls"),
 refresh:document.getElementById("refresh"),
 profile:document.getElementById("profile"),
 details:document.getElementById("details"),
 table:document.getElementById("table-container")
};
let idToken=null;
let accessToken=null;
let profile=null;
function hasConfig(){return typeof window!=="undefined"&&window.CONFIG&&window.CONFIG.CLIENT_ID&&window.CONFIG.SHEET_ID&&window.CONFIG.RANGE}
function setStatus(t,isError){ui.status.textContent=t;ui.status.className=isError?"status error":"status"}
function showSignedIn(){ui.signin.classList.add("hidden");ui.signout.classList.remove("hidden");ui.controls.classList.remove("hidden");ui.profile.classList.remove("hidden");ui.details.classList.remove("hidden");ui.table.classList.remove("hidden")}
function showSignedOut(){ui.signin.classList.remove("hidden");ui.signout.classList.add("hidden");ui.controls.classList.add("hidden");ui.profile.classList.add("hidden");ui.details.classList.add("hidden");ui.table.classList.add("hidden")}
function renderButton(){google.accounts.id.initialize({client_id:window.CONFIG.CLIENT_ID,callback:onCredential});google.accounts.id.renderButton(ui.signin,{theme:"filled",size:"large"})}
function onCredential(resp){idToken=resp.credential;const payload=parseJwt(idToken);const email=payload&&payload.email;const name=payload&&payload.name;profile={email,name};if(!email||!email.endsWith(emailDomain)){setStatus("Access restricted to "+emailDomain,true);idToken=null;profile=null;return}setStatus("Signed in as "+email,false);showSignedIn();requestAccessToken()}
function parseJwt(t){const parts=t.split(".");if(parts.length!==3)return null;try{const json=atob(parts[1].replace(/-/g,"+").replace(/_/g,"/"));return JSON.parse(json)}catch(e){return null}}
function requestAccessToken(){const client=google.accounts.oauth2.initTokenClient({client_id:window.CONFIG.CLIENT_ID,scope:"https://www.googleapis.com/auth/spreadsheets.readonly",prompt:"consent",callback:(t)=>{accessToken=t.access_token;setStatus("Authenticated",false);loadData()}});client.requestAccessToken()}
async function loadData(){if(!accessToken){setStatus("Authentication required",true);return}try{const url="https://sheets.googleapis.com/v4/spreadsheets/"+window.CONFIG.SHEET_ID+"/values/"+encodeURIComponent(window.CONFIG.RANGE)+"?majorDimension=ROWS";const r=await fetch(url,{headers:{Authorization:"Bearer "+accessToken}});if(!r.ok){setStatus("Failed to load data",true);return}const data=await r.json();const rows=data.values||[];if(rows.length===0){renderTable([]);setStatus("No data",false);return}const header=rows[0];const emailIdx=header.findIndex(h=>normalizeKey(h)==="email");if(emailIdx===-1){setStatus("Sheet must include an Email column",true);return}const filtered=rows.slice(1).filter(row=>row[emailIdx]&&String(row[emailIdx]).toLowerCase()===profile.email.toLowerCase());renderProfile(header,filtered);renderDetails(header,filtered);renderTable([header,...filtered]);setStatus("Loaded",false)}catch(e){setStatus("Error loading data",true)}}
function renderTable(rows){if(!rows||rows.length===0){ui.table.innerHTML="";return}const header=rows[0];const body=rows.slice(1);const html=["<table>","<thead><tr>",...header.map(h=>"<th>"+escapeHtml(h)+"</th>"),"</tr></thead>","<tbody>",...body.map(r=>"<tr>"+header.map((_,i)=>"<td>"+formatCell(header[i],r[i])+("</td>")).join("")+"</tr>"),"</tbody>","</table>"].join("");ui.table.innerHTML=html}
function normalizeKey(s){return String(s||"").trim().toLowerCase()}
function headerIndex(header,key){return header.findIndex(h=>normalizeKey(h)===key)}
function renderProfile(header,rows){if(!rows||rows.length===0){ui.profile.innerHTML="";return}const row=rows[0]||[];const name=row[headerIndex(header,"name")]||profile.name||"";const klass=row[headerIndex(header,"class")]||"";const summary=row[headerIndex(header,"summary")]||"";const html=["<h2>Student</h2>","<div class=\"meta\">",name?"<div><strong>Name:</strong> "+escapeHtml(name)+"</div>":"",klass?"<div><strong>Class:</strong> "+escapeHtml(klass)+"</div>":"","</div>",summary?"<div style=\"margin-top:8px\"><strong>Summary:</strong> "+escapeHtml(summary)+"</div>":""].join("");ui.profile.innerHTML=html}
function renderDetails(header,rows){if(!rows||rows.length===0){ui.details.innerHTML="";return}const reserved=new Set(["email","name","class","summary"]);const row=rows[0]||[];const items=[];for(let i=0;i<header.length;i++){const key=normalizeKey(header[i]);if(reserved.has(key))continue;const label=escapeHtml(header[i]);const value=escapeHtml(row[i]||"");if(label){items.push("<div class=\"item\"><div class=\"label\">"+label+"</div><div class=\"value\">"+value+"</div></div>")}}ui.details.innerHTML=items.join("")}
function escapeHtml(s){return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}
function formatCell(header,val){const key=String(header||"").toLowerCase();const v=escapeHtml(val||"");if(key==="grade"){return "<span class=\"badge "+(toNumber(v)>=50?"ok":"warn")+"\">"+v+"</span>"}return v}
function toNumber(s){const n=parseFloat(String(s||"").replace(/[^0-9.\-]/g,""));return isNaN(n)?0:n}
ui.signout.addEventListener("click",()=>{google.accounts.id.disableAutoSelect();idToken=null;accessToken=null;profile=null;showSignedOut();setStatus("Signed out",false)});
ui.refresh.addEventListener("click",()=>loadData());
window.addEventListener("load",()=>{if(!hasConfig()){setStatus("Configure client and sheet in config.js",true);return}renderButton()});