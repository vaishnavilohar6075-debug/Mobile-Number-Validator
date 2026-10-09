const GR=[
  ['Name','#38bdf8','Letters and single spaces'],
  ['Mobile Number','#2dd4bf','10 digits, starts with 6-9'],
  ['Email','#a78bfa','local@domain.tld'],
  ['PIN Code','#fb923c','6 digits, first digit 1-9'],
  ['Date of Birth','#f472b6','DD/MM/YYYY']
];

const L=c=>/[A-Za-z]/.test(c),D=c=>/\d/.test(c),AN=c=>/[A-Za-z0-9]/.test(c),L_D_US=c=>AN(c)||c==='_'||c==='-',eq=x=>c=>c===x,P=eq('|');
let st=[],E=[];
const ns=(g,i,dy)=>{st.push({g,i:i??st.filter(s=>s.g===g).length,dy});return st.length-1},ed=(a,b,l,t)=>E.push([a,b,l,t]);

// Lane 0: Name (q0 to q2)
const q0=ns(0,0,0),q1=ns(0,1,0),q2=ns(0,1,55);
ed(0,1,'letter',L);
ed(1,1,'letter',L);
ed(1,2,'space',eq(' '));
ed(2,1,'letter',L);
ed(1,3,'|',P);

// Lane 1: Mobile Number (q3 to q13: 10 digits)
for(let k=0;k<11;k++)ns(1,k,0);
ed(3,4,'6-9',c=>/[6-9]/.test(c));
for(let k=4;k<13;k++)ed(k,k+1,'digit',D);
ed(13,14,'|',P);

// Lane 2: Email (q14 to q22)
ns(2,0,0); // q14: e0
ns(2,1,0); // q15: e1
ns(2,1,55); // q16: e_dot
ns(2,2,0); // q17: e2 (@)
ns(2,3,0); // q18: e3 (domain label)
ns(2,3,55); // q19: e_hyphen
ns(2,4,0); // q20: e4 (dot in domain)
ns(2,5,0); // q21: e5 (1st letter after dot)
ns(2,6,0); // q22: e6 (2+ letters: valid TLD)
ed(14,15,'a-z0-9_-',L_D_US);
ed(15,15,'a-z0-9_-',L_D_US);
ed(15,16,'.',eq('.'));
ed(16,15,'a-z0-9_-',L_D_US);
ed(15,17,'@',eq('@'));
ed(17,18,'a-z0-9',AN);
ed(18,18,'a-z0-9',AN);
ed(18,19,'-',eq('-'));
ed(19,19,'-',eq('-'));
ed(19,18,'a-z0-9',AN);
ed(18,20,'.',eq('.'));
ed(20,21,'letter',L);
ed(20,18,'digit',D);
ed(21,22,'letter',L);
ed(21,18,'digit',D);
ed(21,19,'-',eq('-'));
ed(22,22,'letter',L);
ed(22,18,'digit',D);
ed(22,19,'-',eq('-'));
ed(22,20,'.',eq('.'));
ed(22,23,'|',P);

// Lane 3: PIN Code (q23 to q29: 6 digits)
for(let k=0;k<7;k++)ns(3,k,0);
ed(23,24,'1-9',c=>/[1-9]/.test(c));
for(let k=24;k<29;k++)ed(k,k+1,'digit',D);
ed(29,30,'|',P);

// Lane 4: Date of Birth (q30 to q40: DD/MM/YYYY)
for(let k=0;k<11;k++)ns(4,k,0);
ed(30,31,'digit',D);
ed(31,32,'digit',D);
ed(32,33,'/',eq('/'));
ed(33,34,'digit',D);
ed(34,35,'digit',D);
ed(35,36,'/',eq('/'));
ed(36,37,'digit',D);
ed(37,38,'digit',D);
ed(38,39,'digit',D);
ed(39,40,'digit',D);

const ACC=40;
const $=id=>document.getElementById(id);
const X=s=>95+st[s].i*82,Y=s=>660-st[s].g*140+(st[s].dy||0);
const pos=s=>s==='d'?{x:1080,y:380}:{x:X(s),y:Y(s)};
const q=n=>n==='d'?'qd':'q'+n;

// SVG diagram generation
(function(){
 let h='<defs><marker id="ar" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0L8,4L0,8z" fill="#8a9bbd"/></marker></defs>';
 GR.forEach((g,i)=>{
  const y=660-i*140,ids=st.map((s,k)=>s.g===i?k:-1).filter(k=>k>=0);
  h+=`<rect x="4" y="${y-62}" width="1000" height="135" rx="12" fill="${g[1]}" fill-opacity=".06" stroke="${g[1]}" stroke-opacity=".35"/>
  <text class="lbl" x="14" y="${y-44}" fill="${g[1]}">${g[0]}</text>
  <text class="ch" x="14" y="${y-30}" fill="#8a9bbd" style="text-anchor:start">q${ids[0]} to q${ids.at(-1)}</text>`;
 });
 const chip=(x,y,l,c)=>{
  const w=l.length*6+10;
  return`<rect x="${x-w/2}" y="${y-8}" width="${w}" height="15" rx="4" fill="var(--nd)" stroke="${c}"/><text class="ch" x="${x}" y="${y+3}" fill="${c}">${l.replace(/</g,'&lt;')}</text>`;
 };
 E.forEach(([a,b,l],k)=>{
  const A=pos(a),B=pos(b),c=GR[st[a].g][1];let dd,lx,ly;
  if(l==='|'){
   const mid=A.y-75;
   dd=`M${A.x+23},${A.y} H${A.x+42} V${mid} H${B.x} V${B.y+16}`;
   lx=(A.x+42+B.x)/2;ly=mid;
  }else if(a===b){
   dd=`M${A.x-10},${A.y-15} C${A.x-28},${A.y-50} ${A.x+28},${A.y-50} ${A.x+10},${A.y-15}`;
   lx=A.x;ly=A.y-54;
  }else if(A.y===B.y&&B.x>A.x){
   if(B.x-A.x>85){
    const arcY=A.y-35;
    dd=`M${A.x+15},${A.y-15} Q${(A.x+B.x)/2},${arcY-20} ${B.x-15},${B.y-15}`;
    lx=(A.x+B.x)/2;ly=arcY;
   }else{
    dd=`M${A.x+23},${A.y} L${B.x-25},${B.y}`;lx=(A.x+B.x)/2;ly=A.y-24;
   }
  }else if(A.y===B.y&&B.x<A.x){
   lx=(A.x+B.x)/2;
   dd=`M${A.x-8},${A.y+15} Q${lx},${A.y+65} ${B.x+8},${B.y+15}`;
   ly=A.y+42;
  }else if(B.y>A.y){
   if(A.x===B.x){dd=`M${A.x-8},${A.y+15} L${B.x-8},${B.y-17}`;lx=A.x-32;ly=(A.y+B.y)/2;}
   else{dd=`M${A.x},${A.y+15} Q${A.x},${B.y} ${B.x-20},${B.y}`;lx=(A.x+B.x)/2;ly=(A.y+B.y)/2+10;}
  }else{
   if(A.x===B.x){dd=`M${A.x+8},${A.y-15} L${B.x+8},${B.y+17}`;lx=A.x+32;ly=(A.y+B.y)/2;}
   else{dd=`M${A.x},${A.y-15} Q${A.x},${B.y} ${B.x-20},${B.y}`;lx=(A.x+B.x)/2;ly=(A.y+B.y)/2-10;}
  }
  h+=`<path id="e${k}" class="ed" stroke="${c}" d="${dd}" marker-end="url(#ar)"/>`+chip(lx,ly,l,c);
 });
 h+=`<path id="dl" d="M0,0L0,0"/>`;
 const sp=pos(0);
 h+=`<line x1="25" y1="${sp.y}" x2="${sp.x-25}" y2="${sp.y}" stroke="#22c55e" stroke-width="2.5" marker-end="url(#ar)"/>`+chip(40,sp.y-14,'START','#22c55e');
 st.forEach((s,k)=>{
  const o=pos(k),c=k===0?'#22c55e':GR[s.g][1];
  if(k===ACC)h+=`<rect x="${o.x-27}" y="${o.y-19}" width="54" height="38" rx="11" fill="none" stroke="#facc15" stroke-width="2.5"/>`;
  h+=`<rect class="nd" id="s${k}" x="${o.x-23}" y="${o.y-15}" width="46" height="30" rx="8" stroke="${c}" ${k===0?'style="fill:color-mix(in srgb,#22c55e 25%,var(--nd))"':''}/><text class="nt" x="${o.x}" y="${o.y}">q${k}</text>`;
 });
 const a=pos(ACC);
 h+=`<text class="lbl" x="${a.x+34}" y="${a.y-2}" fill="#facc15">ACCEPT (q${ACC})</text><text class="ch" x="${a.x+34}" y="${a.y+12}" fill="#8a9bbd" style="text-anchor:start">all 5 fields valid</text>`;
 h+=`<rect class="nd" id="sd" x="1050" y="358" width="68" height="44" rx="10" stroke="#ef4444" style="fill:color-mix(in srgb,#ef4444 18%,var(--nd))"/><text class="nt" x="1084" y="376" style="fill:#ef4444">qd</text><text class="ch" x="1084" y="392" fill="#ef4444">dead state</text><text class="ch" x="1084" y="418" fill="#8a9bbd">loops on all symbols</text>`;
 h+=`<circle id="tok" r="7" cx="0" cy="0" style="transform:translate(${sp.x}px,${sp.y-24}px)"/>`;
 $('svg').innerHTML=h;
})();

// Deterministic DFA simulation engine
function stepDFA(s,ch){
 if(s==='d')return{next:'d',edgeIdx:-1};
 const k=E.findIndex(e=>e[0]===s&&e[3](ch));
 return{next:k<0?'d':E[k][1],edgeIdx:k};
}

function runDFA(str,startState=0){
 let s=startState;
 const path=[s];
 const edges=[];
 for(let idx=0;idx<str.length;idx++){
  const ch=str[idx];
  const{next,edgeIdx}=stepDFA(s,ch);
  edges.push(edgeIdx);
  s=next;
  path.push(s);
 }
 return{path,edges,finalState:s};
}

// Calendar correctness validation (combined with DFA format validation)
function cal(v){
 if(!v)return'Date is empty';
 const parts=v.split('/');
 if(parts.length!==3)return'Format must be DD/MM/YYYY';
 const[dd,mm,y]=parts.map(Number);
 if(isNaN(dd)||isNaN(mm)||isNaN(y))return'Invalid numeric date components';
 if(y<1900||y>2099)return`Year ${y} must be between 1900 and 2099`;
 if(mm<1||mm>12)return`Month ${mm} does not exist (must be 01-12)`;
 const lp=(y%4===0&&y%100!==0)||(y%400===0);
 const dm=[31,lp?29:28,31,30,31,30,31,31,30,31,30,31];
 if(dd<1||dd>dm[mm-1]){
  if(mm===2)return`Day ${dd} invalid: February in ${y} ${lp?'is a leap year (max 29)':'is not a leap year (max 28)'}`;
  return`Day ${dd} does not exist in month ${mm} (max ${dm[mm-1]} days)`;
 }
 return null;
}

// Field evaluation using the DFA engine as source of truth
function evaluateField(g,val){
 if(!val||val.length===0)return{ok:false,empty:true,msg:`${GR[g][0]} is required`};
 if(g===0){
  const res=runDFA(val,0);
  if(res.finalState===1)return{ok:true,msg:'Valid name format'};
  if(res.finalState===2)return{ok:false,msg:'Trailing space is not allowed'};
  if(val.startsWith(' '))return{ok:false,msg:'Leading space is not allowed'};
  if(/  +/.test(val))return{ok:false,msg:'Consecutive spaces are not allowed'};
  if(/\d/.test(val))return{ok:false,msg:'Digits are not allowed in name'};
  if(/[^A-Za-z ]/.test(val))return{ok:false,msg:'Special characters are not allowed'};
  return{ok:false,msg:'Invalid name format'};
 }
 if(g===1){
  const res=runDFA(val,3);
  if(res.finalState===13)return{ok:true,msg:'Valid 10-digit mobile number'};
  if(/[^\d]/.test(val))return{ok:false,msg:'Only digits 0-9 are allowed'};
  if(!/^[6-9]/.test(val))return{ok:false,msg:`Must start with 6, 7, 8, or 9 (starts with "${val[0]}")`};
  if(val.length<10)return{ok:false,msg:`Must be exactly 10 digits (${val.length} digits entered)`};
  if(val.length>10)return{ok:false,msg:`Too long: must be 10 digits (${val.length} digits entered)`};
  return{ok:false,msg:'Invalid mobile number'};
 }
 if(g===2){
  const res=runDFA(val,14);
  if(res.finalState===22)return{ok:true,msg:'Valid email address'};
  if(!val.includes('@'))return{ok:false,msg:"Missing '@' symbol"};
  const parts=val.split('@');
  if(parts.length>2)return{ok:false,msg:"Multiple '@' symbols not allowed"};
  const[local,dom]=parts;
  if(!local)return{ok:false,msg:"Local part before '@' cannot be empty"};
  if(!dom)return{ok:false,msg:"Domain part after '@' cannot be empty"};
  if(local.startsWith('.'))return{ok:false,msg:"Leading dot not allowed in email username"};
  if(local.endsWith('.'))return{ok:false,msg:"Trailing dot before '@' not allowed"};
  if(val.includes('..'))return{ok:false,msg:"Consecutive dots '..' not allowed"};
  if(!dom.includes('.'))return{ok:false,msg:"Domain must contain a dot (e.g. .com)"};
  if(dom.startsWith('.')||dom.endsWith('.'))return{ok:false,msg:"Domain cannot start or end with a dot"};
  const tld=dom.split('.').pop();
  if(tld.length<2||!/^[A-Za-z]+$/.test(tld))return{ok:false,msg:`TLD '.${tld}' must be at least 2 letters`};
  return{ok:false,msg:'Invalid email address'};
 }
 if(g===3){
  const res=runDFA(val,23);
  if(res.finalState===29)return{ok:true,msg:'Valid 6-digit PIN code'};
  if(/[^\d]/.test(val))return{ok:false,msg:'Only digits 0-9 allowed in PIN'};
  if(val.startsWith('0'))return{ok:false,msg:'First digit cannot be 0 (must be 1-9)'};
  if(val.length<6)return{ok:false,msg:`Must be exactly 6 digits (${val.length} digits entered)`};
  if(val.length>6)return{ok:false,msg:`Too long: must be 6 digits (${val.length} digits entered)`};
  return{ok:false,msg:'Invalid PIN code'};
 }
 if(g===4){
  const res=runDFA(val,30);
  if(res.finalState!==40){
   if(!val.includes('/'))return{ok:false,msg:'Format must be DD/MM/YYYY with slashes (e.g. 15/08/2003)'};
   if(val.length!==10)return{ok:false,msg:'Format must be DD/MM/YYYY (10 characters)'};
   return{ok:false,msg:'Format must be DD/MM/YYYY'};
  }
  const calErr=cal(val);
  if(calErr)return{ok:false,msg:`Calendar error: ${calErr}`};
  return{ok:true,msg:'Valid date of birth'};
 }
 return{ok:false,msg:'Unknown field'};
}

// UI State & Lifecycle
const FIELDS=['inp-name','inp-mobile','inp-email','inp-pin','inp-dob'];
const getVals=()=>FIELDS.map(id=>$(id).value.trim());
const setVals=arr=>FIELDS.forEach((id,k)=>{$(id).value=arr[k]??'';});
const S={i:0,t:null,simState:'IDLE'};

function stopTimer(){
 if(S.t){clearInterval(S.t);S.t=null;}
}

const dl=()=>Math.round(1600/$('spd').value);

function update(){
 const vals=getVals();
 const fullRecord=vals.join('|');
 const comb=vals.some(x=>x)?vals.join(' | '):'(empty)';
 if($('comb-str'))$('comb-str').textContent=comb;

 const sep0=vals[0].length;
 const sep1=sep0+1+vals[1].length;
 const sep2=sep1+1+vals[2].length;
 const sep3=sep2+1+vals[3].length;

 function getFieldForCharIndex(idx){
  if(idx<=sep0)return 0;
  if(idx<=sep1)return 1;
  if(idx<=sep2)return 2;
  if(idx<=sep3)return 3;
  return 4;
 }

 const activeField=getFieldForCharIndex(S.i);
 const{path,edges,finalState}=runDFA(fullRecord,0);
 const curState=S.simState==='IDLE'?0:(path[S.i]??path.at(-1));
 const isDead=(curState==='d');
 const activeEdge=(S.simState!=='IDLE'&&S.i>0&&edges[S.i-1]>=0&&!isDead)?edges[S.i-1]:-1;

 const sT=$('stat');
 const pl=$('pill');

 // 1. Simulation Controls & Main Status Panels
 if(S.simState==='IDLE'){
  pl.className='pill neutral';
  pl.textContent='READY';
  sT.className='stat';
  sT.textContent='Ready — click Run to start';
  $('why').textContent='Simulation has not started.';
  $('tape').innerHTML='<span class="hint">Input tape will appear here when simulation starts.</span>';
  $('path').textContent='Path: -';
  $('xp').innerHTML='<span class="hint">Transitions will be explored during simulation.</span>';
 }else if(S.simState==='RUNNING'||S.simState==='PAUSED'){
  const isPaused=S.simState==='PAUSED';
  pl.className='pill';
  pl.textContent=(isPaused?'PAUSED: ':'READING: ')+GR[activeField][0].toUpperCase();
  sT.className='stat';
  sT.textContent=isPaused?'Paused':`Reading ${Math.min(S.i+1,fullRecord.length)} of ${fullRecord.length}...`;
  $('why').textContent=isPaused
   ?`Paused at character ${S.i} of ${fullRecord.length} (state ${q(curState)}). Click Run to resume.`
   :`Current state: ${q(curState)}${curState!=='d'?' ('+GR[st[curState].g][0]+')':' (dead state qd)'}`;

  $('tape').innerHTML=[...fullRecord].map((c,j)=>{
   const s=path[j+1];
   const isErr=(s==='d');
   const col=(s==='d'?'#ef4444':(s!==undefined&&st[s]?GR[st[s].g][1]:'#8a9bbd'));
   const statusCls=isErr&&j<S.i?'err':(j<S.i?'done':(j===S.i?'cur':''));
   return`<div class="cell ${statusCls}" style="--c:${col}">${c===' '?'&#9251;':c}</div>`;
  }).join('');

  const ps=path.slice(0,S.i+1).map(q);
  $('path').textContent='Path: '+(ps.length>16?'... → ':'')+ps.slice(-16).join(' → ');

  const live=curState==='d'?(path.slice(0,S.i+1).filter(x=>x!=='d').at(-1)??0):curState;
  const outList=E.filter(e=>e[0]===live).map(e=>{
   const nextSt=e[1];
   const col=GR[st[nextSt].g][1];
   return`<span style="border-color:${col}">${e[2].replace(/</g,'&lt;')} → q${nextSt}</span>`;
  }).join('');
  $('xp').innerHTML=`<div class="hint" style="margin-bottom:4px">From ${q(live)}:</div>${outList}<span style="border-color:#ef4444;color:#ef4444">any other → qd</span>`;
 }else if(S.simState==='DONE'){
  const recordCalErr=cal(vals[4]);
  const isAllValid=(finalState===ACC&&!recordCalErr&&vals.every(v=>v.length>0));

  if(isAllValid){
   pl.className='pill ok';
   pl.textContent='ACCEPTED';
   sT.className='stat ok';
   sT.textContent='ACCEPTED';
   $('why').textContent=`All five fields accepted. The DFA stopped in accepting state q${ACC} (calendar valid).`;
  }else{
   pl.className='pill bad';
   pl.textContent='REJECTED';
   sT.className='stat bad';
   sT.textContent='REJECTED';
   const fails=GR.map((g,idx)=>{
    const r=evaluateField(idx,vals[idx]);
    return!r.ok?`${g[0]}: ${r.msg}`:null;
   }).filter(Boolean);
   if(!fails.length){
    if(finalState==='d')fails.push('Record structure invalid: misplaced or missing field separators');
    else if(finalState!==ACC)fails.push(`Record incomplete: ended in q${finalState}, expected accepting state q${ACC}`);
   }
   $('why').textContent=fails.join(' | ');
  }

  $('tape').innerHTML=[...fullRecord].map((c,j)=>{
   const s=path[j+1];
   const isErr=(s==='d');
   const col=(s==='d'?'#ef4444':(s!==undefined&&st[s]?GR[st[s].g][1]:'#8a9bbd'));
   return`<div class="cell ${isErr?'err':'done'}" style="--c:${col}">${c===' '?'&#9251;':c}</div>`;
  }).join('');

  const ps=path.map(q);
  $('path').textContent='Path: '+(ps.length>16?'... → ':'')+ps.slice(-16).join(' → ');

  const live=finalState==='d'?(path.filter(x=>x!=='d').at(-1)??0):finalState;
  const outList=E.filter(e=>e[0]===live).map(e=>{
   const nextSt=e[1];
   const col=GR[st[nextSt].g][1];
   return`<span style="border-color:${col}">${e[2].replace(/</g,'&lt;')} → q${nextSt}</span>`;
  }).join('');
  $('xp').innerHTML=`<div class="hint" style="margin-bottom:4px">From ${q(live)}:</div>${outList}<span style="border-color:#ef4444;color:#ef4444">any other → qd</span>`;
 }

 // 2. Field Validation Status Cards
 let h='';
 for(let g=0;g<5;g++){
  const val=vals[g];
  const displayVal=val?val:'<span style="color:var(--mu)">(empty)</span>';
  let badge='PENDING',badgeCls='pending',reasonCls='info',reasonText='',borderCol='var(--bd)';

  if(S.simState==='IDLE'){
   badge='PENDING';
   badgeCls='pending';
   reasonCls='info';
   reasonText=`Waiting for simulation • Format: ${GR[g][2]}`;
   borderCol='var(--bd)';
  }else if(S.simState==='RUNNING'||S.simState==='PAUSED'){
   if(g===activeField){
    badge='READING';
    badgeCls='rd';
    reasonCls='info';
    reasonText='Processing character by character...';
    borderCol='#38bdf8';
   }else if(g>activeField){
    badge='PENDING';
    badgeCls='pending';
    reasonCls='info';
    reasonText='Waiting for simulation...';
    borderCol='var(--bd)';
   }else{
    const res=evaluateField(g,val);
    badge=res.ok?'VALID':'INVALID';
    badgeCls=res.ok?'dn':'iv';
    reasonCls=res.ok?'ok':'err';
    reasonText=res.ok?`✓ ${res.msg}`:`✗ Reason: ${res.msg}`;
    borderCol=res.ok?'var(--gr)':'var(--rd)';
   }
  }else if(S.simState==='DONE'){
   const res=evaluateField(g,val);
   badge=res.ok?'VALID':'INVALID';
   badgeCls=res.ok?'dn':'iv';
   reasonCls=res.ok?'ok':'err';
   reasonText=res.ok?`✓ ${res.msg}`:`✗ Reason: ${res.msg}`;
   borderCol=res.ok?'var(--gr)':'var(--rd)';
  }

  h+=`<div class="fl" style="border-left:4px solid ${borderCol}">
   <div class="fl-dot" style="background:${GR[g][1]}"></div>
   <div class="fl-content">
    <div class="fl-header">
     <span class="fl-title" style="color:${GR[g][1]}">${GR[g][0]}</span>
     <span class="bdg ${badgeCls}">${badge}</span>
    </div>
    <div class="fl-val">${displayVal}</div>
    <div class="fl-reason ${reasonCls}">${reasonText}</div>
   </div>
  </div>`;
 }
 $('bld').innerHTML=h;

 // 3. DFA Diagram Highlights
 document.querySelectorAll('.nd.on').forEach(e=>e.classList.remove('on'));
 document.querySelectorAll('.ed.hot').forEach(e=>e.classList.remove('hot'));

 if(S.simState!=='IDLE'){
  const targetNodeId=curState==='d'?'sd':'s'+curState;
  const nodeEl=$(targetNodeId);
  if(nodeEl)nodeEl.classList.add('on');
  if(activeEdge>=0&&$('e'+activeEdge))$('e'+activeEdge).classList.add('hot');
  const o=pos(curState);
  $('tok').style.transform=`translate(${o.x}px,${o.y-24}px)`;
  if(curState==='d'){
   const live=path.slice(0,S.i+1).filter(x=>x!=='d').at(-1)??0;
   const lv=pos(live);
   $('dl').setAttribute('d',`M${lv.x},${lv.y} L1050,380`);
  }else{
   $('dl').setAttribute('d','M0,0L0,0');
  }
 }else{
  const sp=pos(0);
  $('tok').style.transform=`translate(${sp.x}px,${sp.y-24}px)`;
  $('dl').setAttribute('d','M0,0L0,0');
 }
}

// Tick step for timer
function tick(){
 const fullRecord=getVals().join('|');
 const N=fullRecord.length;
 if(S.i>=N){
  stopTimer();
  S.simState='DONE';
  update();
  return;
 }
 S.i++;
 if(S.i>=N){
  stopTimer();
  S.simState='DONE';
 }
 update();
}

// Controls
$('run').onclick=()=>{
 const fullRecord=getVals().join('|');
 if(S.simState==='PAUSED'){
  S.simState='RUNNING';
  S.t=setInterval(tick,dl());
  update();
  return;
 }
 stopTimer();
 S.i=0;
 S.simState='RUNNING';
 S.t=setInterval(tick,dl());
 update();
};

$('pause').onclick=()=>{
 if(S.simState==='RUNNING'){
  stopTimer();
  S.simState='PAUSED';
  update();
 }
};

$('step').onclick=()=>{
 stopTimer();
 const fullRecord=getVals().join('|');
 const N=fullRecord.length;
 if(S.simState==='IDLE'||S.simState==='DONE'){
  S.i=0;
 }
 if(S.i<N){
  S.i++;
  if(S.i>=N)S.simState='DONE';
  else S.simState='PAUSED';
 }else{
  S.simState='DONE';
 }
 update();
};

$('rst').onclick=()=>{
 stopTimer();
 setVals(['','','','','']);
 S.i=0;
 S.simState='IDLE';
 update();
};

$('spd').oninput=()=>{
 $('spv').textContent=(dl()/1000).toFixed(2)+'s/char';
 if(S.simState==='RUNNING'){
  stopTimer();
  S.t=setInterval(tick,dl());
 }
};

FIELDS.forEach(id=>{
 $(id).oninput=()=>{
  stopTimer();
  S.i=0;
  S.simState='IDLE';
  update();
 };
 $(id).onkeydown=e=>{
  if(e.key==='Enter')$('run').click();
 };
});

// Info Panels
const lg=(c,t)=>`<div class="lg"><span class="sw" style="--c:${c}"></span>${t}</div>`;
$('info').innerHTML=`<div class="pn"><h3>Formal Definition</h3><p><code>M = (Q, Σ, δ, q0, F)</code></p><p><code>Q = {q0, q1, ..., q${ACC}, qd} (${st.length+1} states)</code></p><p><code>Σ = {a-z, A-Z, 0-9, space, '.', '@', '-', '_', '/', '|'}</code></p><p><code>δ = ${E.length} defined transitions, all undefined lead to qd</code></p><p><code>q0 = q0, F = {q${ACC}}</code></p></div>
<div class="pn"><h3>Field Groups</h3>${GR.map((g,i)=>{const ids=st.map((s,k)=>s.g===i?k:-1).filter(k=>k>=0);return`<div class="sg" style="--c:${g[1]}"><b>${g[0]}</b><span>q${ids[0]} to q${ids.at(-1)}: ${g[2]}</span></div>`;}).join('')}</div>
<div class="pn"><h3>Legend</h3>${lg('#22c55e','Start state (q0)')}${lg('#facc15','Accepting state (q'+ACC+', double border)')}${lg('#fff','Active state')}${lg('#ef4444','Dead state qd (loops on all symbols)')}${lg('#38bdf8','Valid transition')}${lg('#ef4444','Dashed red = undefined symbol goes to qd')}<div class="lg"><b>|</b>&nbsp;Field separator (occurs in 4 required positions)</div></div>
<div class="pn"><h3>Input Symbols</h3><p><code>a-z, A-Z</code>: letters<br><code>0-9</code>: digits<br><code>space</code>: single space between words<br><code>. @ - _</code>: email symbols<br><code>/</code>: date separator<br><code>|</code>: field separator</p></div>`;

$('spv').textContent=(dl()/1000).toFixed(2)+'s/char';
update();
