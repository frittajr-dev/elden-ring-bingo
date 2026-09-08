import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import { getDatabase, ref, get, set, update, onValue, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js';
import { firebaseConfig } from './firebase-config.js';
import { TASKS } from './tasks.js';

const $ = s => document.querySelector(s);
const palette = ['#69b7ff','#ff78c6','#77df8d'];
let app, auth, db, user, roomCode='', meName='', roomData=null, unsubscribe=null, timerHandle=null;

const params = new URLSearchParams(location.search);
if(params.get('overlay')==='1') document.body.classList.add('overlay','compact');
$('#playerName').value = params.get('name') || localStorage.getItem('erb_name') || '';
$('#roomCode').value = (params.get('room') || '').toUpperCase();

function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2200)}
function status(msg){$('#status').textContent=msg}
function cleanCode(v){return v.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8)}
function randomCode(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';return Array.from({length:6},()=>chars[Math.floor(Math.random()*chars.length)]).join('')}
function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function configLooksReady(){return firebaseConfig.apiKey && !firebaseConfig.apiKey.includes('HIER_EINTRAGEN') && firebaseConfig.databaseURL && !firebaseConfig.databaseURL.includes('HIER_EINTRAGEN')}

async function init(){
  if(!configLooksReady()){status('Bitte zuerst firebase-config.js ausfüllen. Die genaue Anleitung steht in README.md.');return}
  app=initializeApp(firebaseConfig); auth=getAuth(app); db=getDatabase(app);
  await signInAnonymously(auth);
  onAuthStateChanged(auth,u=>{user=u;if(params.get('room')&&params.get('name')) joinRoom(true)});
}

async function createRoom(){
  if(!user) return toast('Firebase noch nicht bereit.');
  meName=$('#playerName').value.trim(); if(!meName) return toast('Bitte Namen eingeben.');
  const hours=Math.max(1,Math.min(12,Number($('#duration').value)||12));
  roomCode=cleanCode($('#roomCode').value)||randomCode();
  const r=ref(db,`rooms/${roomCode}`); if((await get(r)).exists()) return toast('Raumcode existiert schon. Anderen wählen.');
  const order=shuffle([...Array(100).keys()]);
  await set(r,{createdAt:serverTimestamp(),hostUid:user.uid,durationMs:hours*3600000,startedAt:null,order,players:{[user.uid]:{name:meName,joinedAt:serverTimestamp()}}});
  $('#roomCode').value=roomCode; localStorage.setItem('erb_name',meName); subscribeRoom(); toast(`Raum ${roomCode} erstellt.`)
}

async function joinRoom(auto=false){
  if(!user) return;
  meName=(params.get('name')||$('#playerName').value).trim(); roomCode=cleanCode(params.get('room')||$('#roomCode').value);
  if(!meName||!roomCode){if(!auto)toast('Name und Raumcode eingeben.');return}
  const r=ref(db,`rooms/${roomCode}`); const snap=await get(r); if(!snap.exists())return toast('Raum nicht gefunden.');
  const data=snap.val(); const players=data.players||{};
  if(!players[user.uid] && Object.keys(players).length>=3) return toast('Dieser Raum hat bereits 3 Spieler.');
  await set(ref(db,`rooms/${roomCode}/players/${user.uid}`),{name:meName,joinedAt:serverTimestamp()});
  localStorage.setItem('erb_name',meName); subscribeRoom(); if(!auto)toast(`Raum ${roomCode} beigetreten.`)
}

function subscribeRoom(){
  if(unsubscribe)unsubscribe();
  unsubscribe=onValue(ref(db,`rooms/${roomCode}`),snap=>{if(!snap.exists())return;roomData=snap.val();render()});
  $('#setup').hidden=true;$('#game').hidden=false;$('#roomLabel').textContent=roomCode;$('#meLabel').textContent=meName;
}

async function startGame(){
  if(!roomData||roomData.hostUid!==user.uid)return;
  if(roomData.startedAt)return toast('Spiel läuft bereits.');
  await update(ref(db,`rooms/${roomCode}`),{startedAt:serverTimestamp()});
}

async function claimCell(boardIndex){
  if(!roomData?.startedAt) return toast('Der Host muss das Spiel zuerst starten.');
  if(isEnded()) return toast('Das Bingo ist beendet.');
  const taskId=roomData.order[boardIndex];
  const cRef=ref(db,`rooms/${roomCode}/cells/${boardIndex}`);
  const res=await runTransaction(cRef,current=>{
    if(current!==null) return;
    return {ownerUid:user.uid,ownerName:meName,taskId,difficulty:TASKS[taskId].d,claimedAt:Date.now()};
  });
  if(res.committed) toast(`Feld #${boardIndex+1} gehört jetzt dir.`); else toast('Zu spät – dieses Feld wurde schon geclaimt.');
}

function isEnded(){
  if(!roomData)return false; const full=Object.keys(roomData.cells||{}).length>=100;
  return full || (roomData.startedAt && Date.now()>=roomData.startedAt+roomData.durationMs);
}
function linesFor(uid,cells){
  let lines=0; const own=i=>cells?.[i]?.ownerUid===uid;
  for(let r=0;r<10;r++)if([...Array(10)].every((_,c)=>own(r*10+c)))lines++;
  for(let c=0;c<10;c++)if([...Array(10)].every((_,r)=>own(r*10+c)))lines++;
  if([...Array(10)].every((_,i)=>own(i*10+i)))lines++;
  if([...Array(10)].every((_,i)=>own(i*10+(9-i))))lines++;
  return lines;
}
function scoreFor(uid){
  const cells=roomData.cells||{}; let base=0, extreme=0, count=0;
  Object.values(cells).forEach(c=>{if(c.ownerUid===uid){base+=Number(c.difficulty)||0;count++;if(c.difficulty===3)extreme++;}});
  const bingos=linesFor(uid,cells); return {base,bingos,total:base+bingos*5,extreme,count};
}
function playerColor(uid){const ids=Object.keys(roomData.players||{});return palette[Math.max(0,ids.indexOf(uid))%palette.length]}

function render(){
  const players=roomData.players||{}; const cells=roomData.cells||{}; const started=!!roomData.startedAt;
  $('#startBtn').hidden=!(roomData.hostUid===user?.uid && !started); if(!$('#setup').hidden) $('#startBtn').hidden=true;
  document.body.classList.toggle('ended',isEnded());
  const scoreRows=Object.entries(players).map(([uid,p])=>({uid,name:p.name,...scoreFor(uid)})).sort((a,b)=>b.total-a.total||b.extreme-a.extreme||b.bingos-a.bingos);
  $('#scores').innerHTML=scoreRows.map((s,i)=>`<div class="score-card" style="--player:${playerColor(s.uid)}"><div class="name">${i===0&&started?'♛ ':''}${esc(s.name)}</div><div class="pts">${s.total} P</div><div class="meta">Felder ${s.count} · Basis ${s.base} · Bingos ${s.bingos} (+${s.bingos*5}) · Extrem ${s.extreme}</div></div>`).join('');
  $('#board').innerHTML='';
  roomData.order.forEach((taskId,i)=>{const task=TASKS[taskId],claim=cells[i],el=document.createElement('div');el.className=`cell d${task.d}${claim?' claimed':''}`;el.style.setProperty('--owner',claim?playerColor(claim.ownerUid):'#777');el.dataset.owner=claim?.ownerName||'';el.innerHTML=`<div class="points">${task.d}P</div><div class="task">${esc(task.t)}</div><div class="num">#${i+1}</div>`;if(!claim)el.onclick=()=>claimCell(i);$('#board').appendChild(el)});
  updateTimer();
}
function updateTimer(){
  clearInterval(timerHandle); const draw=()=>{
    if(!roomData?.startedAt){$('#timer').textContent='WARTET';return}
    const left=Math.max(0,roomData.startedAt+roomData.durationMs-Date.now()); const h=Math.floor(left/3600000),m=Math.floor(left%3600000/60000),s=Math.floor(left%60000/1000);$('#timer').textContent=`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    if(left===0)document.body.classList.add('ended');
  };draw();timerHandle=setInterval(draw,1000)
}
function esc(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

$('#createBtn').onclick=createRoom;$('#joinBtn').onclick=()=>joinRoom(false);$('#startBtn').onclick=startGame;
$('#compactBtn').onclick=()=>document.body.classList.toggle('compact');
$('#overlayBtn').onclick=async()=>{const url=new URL(location.href);url.searchParams.set('room',roomCode);url.searchParams.set('name',meName);url.searchParams.set('overlay','1');await navigator.clipboard.writeText(url.toString());toast('Overlay-Link kopiert. Im selben Browserprofil öffnen.')};
$('#roomCode').addEventListener('input',e=>e.target.value=cleanCode(e.target.value));
init();
