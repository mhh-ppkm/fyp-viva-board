window.VivaBoard={boot(D,PH,ctx){
const STAFF={};D.staff.forEach(s=>STAFF[s.id]=s);
const BYCODE={};D.staff.forEach(s=>BYCODE[s.code]=s.id);
const BASE={};D.vivas.forEach(v=>BASE[v.id]=v);
const ROOMS=['MEK1','MEK2','MEK3','Seminar Room','Conference Room','Business Unit Room'];
const DAYS=[
 {d:'2026-07-14',dn:'Selasa',lab:'Tue 14 Jul',win:[[840,1020]],rule:'Afternoon only (2–5 pm)'},
 {d:'2026-07-15',dn:'Rabu',lab:'Wed 15 Jul',win:[[540,780],[840,1020]],rule:'Full day (9 am–1 pm, 2–5 pm)'},
 {d:'2026-07-16',dn:'Khamis',lab:'Thu 16 Jul',win:[[840,1020]],rule:'Afternoon only (2–5 pm)'},
 {d:'2026-07-17',dn:'Jumaat',lab:'Fri 17 Jul',win:[[540,720],[870,1050]],rule:'Morning until 12 pm; 2.30–5.30 pm',fri:true},
 {d:'2026-07-20',dn:'Isnin',lab:'Mon 20 Jul',win:[[540,780],[840,1020]],rule:'Full day (9 am–1 pm, 2–5 pm)'},
 {d:'2026-07-21',dn:'Selasa',lab:'Tue 21 Jul',win:[[540,780],[840,1020]],rule:'Replacement day',rep:true},
 {d:'2026-07-22',dn:'Rabu',lab:'Wed 22 Jul',win:[[540,780],[840,1020]],rule:'Replacement day',rep:true}];
const DAY={};DAYS.forEach(x=>DAY[x.d]=x);
// Unavailability recorded in the "Viva Planning" sheet
const BASE_BLOCKS=[
 {id:'p1',lect:'a31',date:'2026-07-14',s:480,e:1080,reason:'Not scheduled on this day (Viva Planning sheet)',base:true},
 {id:'p2',lect:'a32',date:'2026-07-14',s:480,e:1080,reason:'Not scheduled on this day (Viva Planning sheet)',base:true},
 {id:'p3',lect:'a29',date:'2026-07-17',s:480,e:1080,reason:'Not scheduled on this day (Viva Planning sheet)',base:true},
 {id:'p4',lect:'a17',date:'2026-07-17',s:480,e:1080,reason:'Not scheduled on this day (Viva Planning sheet)',base:true},
 {id:'p5',lect:'a42',date:'2026-07-17',s:480,e:1080,reason:'Not scheduled on this day (Viva Planning sheet)',base:true}];
const T0=480,T1=1080; // 8.00 am – 6.00 pm

let changes={}, dbBlocks=[], dbLog=[], db=null, user=null, canWrite=false, clerk=false, myId=null, names={};
let sel=null, day=DAYS[1].d, issFilter='all', mode='lect', stu=null;
const BYPROJ={};D.vivas.forEach(v=>BYPROJ[v.code.toUpperCase()]=v.id);
try{const h=decodeURIComponent((location.hash||'').slice(1)).toUpperCase();if(BYCODE[h])sel=BYCODE[h];else if(BYPROJ[h]){mode='stu';stu=BYPROJ[h]}}catch(e){}
if(!sel&&!stu){try{if(localStorage.getItem('viva.mode')==='stu'){mode='stu';const s=localStorage.getItem('viva.stu');if(s&&BASE[s])stu=s}}catch(e){}}
if(!sel&&mode==='lect'){try{const s=localStorage.getItem('viva.sel');if(s&&STAFF[s])sel=s;}catch(e){}}
try{const s=localStorage.getItem('viva.day');if(s&&DAY[s])day=s;}catch(e){}

const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function fmt(m){let h=Math.floor(m/60),mm=m%60,ap=h>=12?'pm':'am';let hh=h>12?h-12:(h===0?12:h);return hh+'.'+String(mm).padStart(2,'0')+' '+ap}
function fmtR(s,e){const a=fmt(s),b=fmt(e);return a.slice(-2)===b.slice(-2)?a.slice(0,-3)+' – '+b:a+' – '+b}
function full(id){const s=STAFF[id];return s?(s.pre?s.pre+' ':'')+s.name:'(unknown)'}
function code(id){return STAFF[id]?STAFF[id].code:'?'}
function ava(id,cls){const p=PH[id];const c=cls?' '+cls:'';return p?`<img class="ava${c}" src="${p}" alt="">`:`<span class="ava${c}">${esc(code(id).slice(0,3))}</span>`}
function cur(id){const b=BASE[id],c=changes[id];return c?Object.assign({},b,{date:c.date,s:c.s,e:c.e,venue:c.venue,exa:c.exa||b.exa,chg:c}):b}
function all(){return D.vivas.map(v=>cur(v.id))}
function hasPick(){return mode==='stu'?!!stu:!!sel}
function isMine(v){return mode==='stu'?v.id===stu:!!(sel&&(v.sup===sel||v.exa===sel))}
const RTAG={'MEK1':'M1','MEK2':'M2','MEK3':'M3','Seminar Room':'SR','Conference Room':'CR','Business Unit Room':'BU','MET 3':'MT3','Vibration Lab':'VIB','Viva Room, BU':'VRB'};
function rIdx(r){const i=ROOMS.indexOf(r);return i<0?6:i}
function rShort(r){return RTAG[r]||String(r).split(/[\s,]+/).filter(Boolean).map(w=>/^\d/.test(w)?w:w[0]).join('').slice(0,3).toUpperCase()}
function rtag(r,cls){return `<span class="rtag rm-${rIdx(r)}${cls?' '+cls:''}" title="${esc(r)}">${esc(rShort(r))}</span>`}
function moved(v){return v.date!==v.odate||v.s!==v.os||v.venue!==v.ovenue}
function blocks(){return BASE_BLOCKS.concat(dbBlocks)}
function ov(a,b){return a.date===b.date&&a.s<b.e&&b.s<a.e}
function inWin(v){const w=DAY[v.date]?DAY[v.date].win:[];return w.some(([a,b])=>v.s>=a&&v.e<=b)}

// ---------- checks ----------
function issuesFor(list){
  const out=[];
  for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){
    const a=list[i],b=list[j];if(!ov(a,b))continue;
    if(a.venue===b.venue)out.push({sev:'bad',type:'Room clash',ids:[a.id,b.id],msg:`${a.venue} is booked twice`,det:`${DAY[a.date].lab} · ${a.name} (${fmtR(a.s,a.e)}) and ${b.name} (${fmtR(b.s,b.e)})`});
    const sh=[a.sup,a.exa].filter(x=>x===b.sup||x===b.exa);
    [...new Set(sh)].forEach(l=>out.push({sev:'bad',type:'Lecturer clash',ids:[a.id,b.id],lect:l,msg:`${code(l)} · ${full(l)} is in two vivas at once`,det:`${DAY[a.date].lab} · ${fmtR(a.s,a.e)} ${a.venue} (${a.sup===l?'SV':'EX'}) overlaps ${fmtR(b.s,b.e)} ${b.venue} (${b.sup===l?'SV':'EX'})`}));
  }
  const bl=blocks();
  list.forEach(v=>{
    bl.forEach(k=>{if((k.lect===v.sup||k.lect===v.exa)&&k.date===v.date&&v.s<k.e&&k.s<v.e)
      out.push({sev:'bad',type:'Unavailable',ids:[v.id],lect:k.lect,msg:`${code(k.lect)} is marked unavailable`,det:`${DAY[v.date].lab} ${fmtR(v.s,v.e)} · ${v.name} · ${k.reason||''}`});});
    if(!inWin(v)){const agreed=!!(v.note||v.chg);
      out.push({sev:agreed?'info':'warn',type:agreed?'Agreed exception':'Outside planned hours',ids:[v.id],msg:`${v.name} at ${fmtR(v.s,v.e)}`,det:`${DAY[v.date].lab} allows ${DAY[v.date].rule}`+(agreed?' · change was requested and recorded':'')});}
  });
  return out;
}
let ISS=[],ISSBY={};
function recompute(){ISS=issuesFor(all());ISSBY={};ISS.forEach(x=>x.ids.forEach(id=>{const c=ISSBY[id]||(ISSBY[id]={bad:0,warn:0,info:0,list:[]});c[x.sev]++;c.list.push(x);}));}
function sevOf(id){const c=ISSBY[id];return c?(c.bad?'bad':c.warn?'warn':''):''}

// ---------- render ----------
function render(){recompute();renderKpis();renderPicker();renderMine();renderTabs();renderGrid();renderIssues();renderBlocks();renderList();renderLog();renderClerkbar();}
function renderKpis(){
  const L=all();const mv=L.filter(moved).length;const bad=ISS.filter(x=>x.sev==='bad').length,warn=ISS.filter(x=>x.sev==='warn').length;
  const lects=new Set();L.forEach(v=>{lects.add(v.sup);lects.add(v.exa)});
  $('kpis').innerHTML=`
  <div class="kpi"><div class="l">Students</div><div class="v mono">${L.length}</div><div class="s">${new Set(L.map(v=>v.date)).size} viva days</div></div>
  <div class="kpi"><div class="l">Lecturers</div><div class="v mono">${lects.size}</div><div class="s">as SV or examiner</div></div>
  <div class="kpi"><div class="l">Rooms</div><div class="v mono">${ROOMS.length}</div><div class="s">+ ${new Set(L.map(v=>v.venue).filter(r=>!ROOMS.includes(r))).size} other venues</div></div>
  <div class="kpi"><div class="l">Rescheduled</div><div class="v mono">${mv}</div><div class="s">from original slot</div></div>
  <button type="button" class="kpi ${bad?'bad':''}" data-go="bad"><div class="l">Clashes</div><div class="v mono">${bad}</div><div class="s">${bad?'need fixing':'none found'}</div></button>
  <button type="button" class="kpi ${warn?'warn':''}" data-go="warn"><div class="l">Warnings</div><div class="v mono">${warn}</div><div class="s">outside planned hours</div></button>`;
}
function renderPicker(){
  document.querySelectorAll('#modeSeg button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mode===mode));
  $('lectBox').hidden=mode!=='lect';$('stuBox').hidden=mode!=='stu';
  if(mode==='stu'){renderStuRes();return}
  const s=$('lectSel');
  if(!s.options.length){
    const arr=D.staff.slice().sort((a,b)=>a.code.localeCompare(b.code));
    s.innerHTML='<option value="">— Choose your name —</option>'+arr.map(x=>`<option value="${x.id}">${esc(x.code)} — ${esc((x.pre?x.pre+' ':'')+x.name)}</option>`).join('');
  }
  s.value=sel||'';
  const id=sel;
  if(!id){$('idcard').innerHTML='<p class="note">Your photo, contact details and all your vivas (as supervisor and examiner) appear here. Tip: bookmark the page after choosing — the link remembers your code.</p>';return}
  const st=STAFF[id];const L=all().filter(v=>v.sup===id||v.exa===id);
  const nsv=L.filter(v=>v.sup===id).length,nex=L.length-nsv;const nbad=L.filter(v=>sevOf(v.id)==='bad').length;
  $('idcard').innerHTML=`<div class="idcard">${ava(id,'xl')}<div class="meta"><div class="pre">${esc(st.pre||st.pos)}</div><div class="nm">${esc(st.name)}</div><div class="post">${esc(st.post||st.pos)}</div></div></div>
   <div class="counts"><span class="chip sv">Supervisor · ${nsv}</span><span class="chip ex">Examiner · ${nex}</span>${nbad?`<span class="chip bad">${nbad} clash${nbad>1?'es':''}</span>`:'<span class="chip ok">No clashes</span>'}</div>
   <div class="contact"><div>Email: <span>${esc(st.email)}</span></div>${st.tel?`<div>Tel: <span>${esc(st.tel)}</span></div>`:''}</div>
   <div class="toolbar"><button class="btn sm" type="button" id="btnCopy">Copy my schedule</button><button class="btn sm" type="button" id="btnClear">Clear</button></div>`;
}
function partner(v,id){const other=v.sup===id?v.exa:v.sup;const role=v.sup===id?'Examiner':'Supervisor';return `${ava(other,'xs')}<span>${role}: ${esc(code(other))} · ${esc(full(other))}</span>`}
function renderMine(){
  const el=$('mylist');
  if(mode==='stu'){renderStudent(el);return}
  if(!sel){el.innerHTML=`<div class="empty">Choose a lecturer on the left to list every viva they sit in, day by day.</div>`;return}
  const L=all().filter(v=>v.sup===sel||v.exa===sel).sort((a,b)=>a.date.localeCompare(b.date)||a.s-b.s);
  if(!L.length){el.innerHTML=`<div class="empty">${esc(full(sel))} has no viva assigned in EMD/EPD 462 this semester.</div>`;return}
  const by={};L.forEach(v=>(by[v.date]=by[v.date]||[]).push(v));
  el.innerHTML=Object.keys(by).map(d=>`<div class="myday"><h4>${DAY[d].dn} · ${DAY[d].lab} · ${by[d].length} viva${by[d].length>1?'s':''}</h4>`+by[d].map(v=>{
    const sv=v.sup===sel,sev=sevOf(v.id);
    return `<div class="mrow ${sev==='bad'?'c-bad':''}"><div><div class="t">${fmtR(v.s,v.e)}</div><div class="room">${rtag(v.venue)}<span>${esc(v.venue)}</span></div></div>
     <div style="min-width:0"><div class="st">${esc(v.name)} <span class="mono note">${esc(v.code)}</span></div><div class="with">${partner(v,sel)}</div></div>
     <div class="side"><span class="chip ${sv?'sv':'ex'}">${sv?'Supervisor':'Examiner'}</span>${moved(v)?'<span class="chip muted">Moved</span>':''}${sev==='bad'?'<span class="chip bad">Clash</span>':''}${clerk?`<button class="btn sm" type="button" data-edit="${v.id}">Amend</button>`:''}</div></div>`}).join('')+'</div>').join('');
}
function renderTabs(){
  const L=all();
  $('tabs').innerHTML=DAYS.map(x=>{const n=L.filter(v=>v.date===x.d).length;const b=L.filter(v=>v.date===x.d&&sevOf(v.id)==='bad').length;const m=hasPick()?L.filter(v=>v.date===x.d&&isMine(v)).length:0;
    return `<button type="button" class="tab" role="tab" aria-selected="${x.d===day}" data-day="${x.d}"><span class="dn">${x.dn}${x.rep?' · ganti':''}</span><span class="dd">${x.lab}</span><span class="dc">${n} viva${n!==1?'s':''}${m?(mode==='stu'?' · your viva':` · ${m} mine`):''}${b?` · <b style="color:var(--bad)">${b} clash</b>`:''}</span></button>`}).join('');
  const x=DAY[day];
  $('dayinfo').innerHTML=`<span><b>${x.dn}, ${x.lab} 2026</b> · ${esc(x.rule)}</span><span class="legend">
   <span><i class="sw" style="background:var(--sv)"></i>SV supervisor</span><span><i class="sw" style="background:var(--ex)"></i>EX examiner</span>
   <span><i class="sw" style="border:1px dashed var(--line-strong)"></i>Moved</span><span><i class="sw" style="background:var(--bad)"></i>Clash</span><span><i class="sw" style="background:repeating-linear-gradient(135deg,var(--line-strong) 0 2px,transparent 2px 4px)"></i>Outside planned hours</span></span>
   ${hasPick()?`<span class="chip sv" style="background:var(--accent-soft);color:var(--accent)">Highlighting ${esc(mode==='stu'?BASE[stu].code:code(sel))}</span>`:''}`;
}
const MQ=window.matchMedia?window.matchMedia('(max-width:640px)'):{matches:false};
function renderAgenda(L,x,cols){
  const lunchAt=x.fri?750:780;
  $('gridwrap').innerHTML='<div class="agenda">'+cols.map(c=>{const R=L.filter(v=>v.venue===c).sort((a,b)=>a.s-b.s);
    if(!R.length)return `<div class="aroom rmb rm-${rIdx(c)}"><h3><span class="rt">${rtag(c)}${esc(c)}</span><small>no viva</small></h3></div>`;
    let h=`<div class="aroom rmb rm-${rIdx(c)}"><h3><span class="rt">${rtag(c)}${esc(c)}</span><small>${R.length} viva${R.length>1?'s':''}</small></h3>`,lunchDone=false;
    R.forEach(v=>{if(!lunchDone&&v.s>=lunchAt){h+=`<div class="alunch">${x.fri?'SOLAT JUMAAT':'LUNCH'}</div>`;lunchDone=true}
      const sev=sevOf(v.id),mine=isMine(v);
      h+=`<button type="button" class="aitem ${sev==='bad'?'c-bad':''} ${hasPick()?(mine?'hl':'dim'):''}" data-open="${v.id}"><span class="at">${fmtR(v.s,v.e).replace(' – ','<br>– ')}${sev==='bad'?'<br><span class="tag cf">CLASH</span>':moved(v)?'<br><span class="tag mv">MOVED</span>':''}</span>
       <span><span class="an">${esc(v.name)}</span> <span class="mono note">${esc(v.code)}</span><span class="ap">${ava(v.sup,'xs')}<b class="s">SV ${esc(code(v.sup))}</b>${ava(v.exa,'xs')}<b class="e">EX ${esc(code(v.exa))}</b></span></span></button>`});
    return h+'</div>'}).join('')+'</div>';
}
function renderGrid(){
  const L=all().filter(v=>v.date===day);const x=DAY[day];
  if(MQ.matches){const ex=[...new Set(L.map(v=>v.venue).filter(r=>!ROOMS.includes(r)))];renderAgenda(L,x,ROOMS.concat(ex));return}
  const extra=[...new Set(L.map(v=>v.venue).filter(r=>!ROOMS.includes(r)))];const cols=ROOMS.concat(extra);
  const ppm=1.45,H=(T1-T0)*ppm;
  const offs=[];let p=T0;x.win.forEach(([a,b])=>{if(a>p)offs.push([p,a]);p=b});if(p<T1)offs.push([p,T1]);
  const lunch=x.fri?[750,870]:[780,840];
  let h=`<div class="grid" style="grid-template-columns:58px repeat(${cols.length},minmax(168px,1fr))">`;
  h+=`<div class="ghead timeh">Time</div>`+cols.map(c=>{const n=L.filter(v=>v.venue===c).length;return `<div class="ghead rmh rm-${rIdx(c)}">${rtag(c)}<span>${esc(c)}</span><small>${n}</small></div>`}).join('');
  h+=`<div class="tcol" style="height:${H}px;position:sticky">`;for(let t=T0;t<=T1;t+=60)h+=`<span style="top:${(t-T0)*ppm+(t===T0?8:0)}px">${fmt(t).replace('.00','')}</span>`;h+='</div>';
  const bl=blocks().filter(k=>k.date===day&&sel&&k.lect===sel);
  cols.forEach(c=>{
    h+=`<div class="col rmc rm-${rIdx(c)}" style="height:${H}px">`;
    offs.forEach(([a,b])=>h+=`<div class="off" style="top:${(a-T0)*ppm}px;height:${(b-a)*ppm}px"></div>`);
    h+=`<div class="lunch" style="top:${(lunch[0]-T0)*ppm}px;height:${(lunch[1]-lunch[0])*ppm}px">${x.fri?'SOLAT JUMAAT':'LUNCH'}</div>`;
    L.filter(v=>v.venue===c).forEach(v=>{
      const sev=sevOf(v.id);const mine=isMine(v);
      const cls=['blk','rmb','rm-'+rIdx(v.venue),moved(v)?'moved':'',sev==='bad'?'c-bad':sev==='warn'?'c-warn':'',hasPick()?(mine?'hl':'dim'):''].join(' ');
      h+=`<button type="button" class="${cls}" data-open="${v.id}" style="top:${(v.s-T0)*ppm+1}px;height:${(v.e-v.s)*ppm-2}px" title="${esc(v.name)} · SV ${esc(full(v.sup))} · EX ${esc(full(v.exa))}">
        <span class="bt"><span>${fmtR(v.s,v.e)}</span><span>${sev==='bad'?'<span class="tag cf">CLASH</span>':moved(v)?'<span class="tag mv">MOVED</span>':esc(v.code)}</span></span>
        <span class="bn">${esc(v.name)}</span>
        <span class="bp">${ava(v.sup,'xs')}<b class="s">SV ${esc(code(v.sup))}</b>${ava(v.exa,'xs')}<b class="e">EX ${esc(code(v.exa))}</b></span></button>`;
    });
    h+='</div>';
  });
  h+='</div>';
  $('gridwrap').innerHTML=h;
  if(bl.length){/* show selected lecturer's unavailability in first column header note */}
}
function renderIssues(){
  const f=issFilter;const L=ISS.filter(x=>f==='all'?x.sev!=='info'||true:x.sev===f).sort((a,b)=>({bad:0,warn:1,info:2}[a.sev]-{bad:0,warn:1,info:2}[b.sev]));
  document.querySelectorAll('#issSeg button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.f===f));
  $('issues').innerHTML=L.length?L.map(x=>`<div class="iss"><span class="chip ${x.sev==='bad'?'bad':x.sev==='warn'?'warn':'muted'}">${esc(x.type)}</span><div style="min-width:0"><div class="msg">${esc(x.msg)}</div><div class="det">${esc(x.det)}</div></div>
    <div class="toolbar">${x.ids.map(id=>`<button class="btn sm" type="button" data-open="${id}">${clerk?'Fix ':'View '}${esc(BASE[id].code)}</button>`).join('')}</div></div>`).join(''):`<div class="empty">${f==='bad'?'No clashes. Every lecturer and room is in one place at a time.':'Nothing to show.'}</div>`;
}
function renderBlocks(){
  $('btnBlock').hidden=!clerk;
  const B=blocks().slice().sort((a,b)=>a.date.localeCompare(b.date)||a.s-b.s);
  $('blocks').innerHTML=B.length?B.map(k=>`<div class="iss"><span class="who">${ava(k.lect,'sm')}<span class="n"><b>${esc(code(k.lect))}</b><br>${esc(full(k.lect))}</span></span>
   <div><div class="msg">${DAY[k.date]?DAY[k.date].lab:k.date} · ${k.s<=480&&k.e>=1080?'whole day':fmtR(k.s,k.e)}</div><div class="det">${esc(k.reason||'')}${k.base?'':' · added on this board'}</div></div>
   <div>${clerk&&!k.base?`<button class="btn sm danger" type="button" data-unblock="${esc(k.id)}">Remove</button>`:''}</div></div>`).join(''):'<div class="empty">No unavailability recorded.</div>';
}
function renderList(){
  const fd=$('fDay');if(!fd.options.length)fd.innerHTML='<option value="">All days</option>'+DAYS.map(x=>`<option value="${x.d}">${x.lab}</option>`).join('');
  const q=$('q').value.trim().toLowerCase();const dsel=fd.value;
  const L=all().filter(v=>(!dsel||v.date===dsel)&&(!q||[v.name,v.code,code(v.sup),code(v.exa),full(v.sup),full(v.exa),v.venue].join(' ').toLowerCase().includes(q))).sort((a,b)=>a.date.localeCompare(b.date)||a.s-b.s||ROOMS.indexOf(a.venue)-ROOMS.indexOf(b.venue));
  $('list').innerHTML=`<thead><tr><th>No</th><th>Student</th><th>Code</th><th>Supervisor</th><th>Examiner</th><th>Date</th><th>Time</th><th>Venue</th><th>Status</th>${clerk?'<th></th>':''}</tr></thead><tbody>`+
  L.map(v=>{const sev=sevOf(v.id);return `<tr class="${sev==='bad'?'c-bad':''}"><td class="mono">${v.no}</td><td>${esc(v.name)}</td><td class="mono">${esc(v.code)}</td>
   <td><span class="who">${ava(v.sup,'sm')}<span class="n">${esc(full(v.sup))}</span></span></td><td><span class="who">${ava(v.exa,'sm')}<span class="n">${esc(full(v.exa))}</span></span></td>
   <td class="mono" style="white-space:nowrap">${DAY[v.date].lab}</td><td class="mono" style="white-space:nowrap">${fmtR(v.s,v.e)}</td><td><span class="vcell">${rtag(v.venue)}${esc(v.venue)}</span></td>
   <td>${sev==='bad'?'<span class="chip bad">Clash</span>':sev==='warn'?'<span class="chip warn">Check hours</span>':moved(v)?`<span class="chip muted" title="Was ${DAY[v.odate].lab} ${fmtR(v.os,v.oe)} ${esc(v.ovenue)}">Moved</span>`:'<span class="chip ok">OK</span>'}</td>
   ${clerk?`<td><button class="btn sm" type="button" data-edit="${v.id}">Amend</button></td>`:''}</tr>`}).join('')+'</tbody>';
  if(!L.length)$('list').innerHTML+=`<tbody><tr><td colspan="9"><div class="empty">No student matches “${esc(q)}”.</div></td></tr></tbody>`;
}
function nameOf(uid){return uid||'A clerk'}
function renderLog(){
  const live=dbLog.slice().sort((a,b)=>(b.at||'').localeCompare(a.at||'')).map(l=>{const v=BASE[l.vivaId];
    const sl=x=>x?`${DAY[x.date]?DAY[x.date].lab:x.date} ${fmtR(x.s,x.e)} · ${x.venue}${x.exa?' · EX '+code(x.exa):''}`:'';
    return `<div class="logi"><div class="h">${esc(l.kind==='block'?'Unavailability':l.kind==='unblock'?'Unavailability removed':v?v.name+' ('+v.code+')':'')}</div>
    <div>${l.kind==='move'||l.kind==='revert'?`${esc(sl(l.from))} → <b>${esc(sl(l.to))}</b>`:esc(l.text||'')}</div>
    <div class="d">${esc(l.reason||'')}${l.req?' · requested by '+esc(l.req):''} · ${esc(nameOf(l.by))} · ${l.at?new Date(l.at).toLocaleString('en-MY',{dateStyle:'medium',timeStyle:'short'}):''}</div></div>`}).join('');
  const sheet=D.vivas.filter(v=>v.note).map(v=>`<div class="logi"><div class="h">${esc(v.name)} (${esc(v.code)})</div><div>Was ${DAY[v.odate].lab} ${fmtR(v.os,v.oe)} · ${esc(v.ovenue)}</div><div class="d">Rev1 note: ${esc(v.note.replace(/^\*/,''))}</div></div>`).join('');
  $('log').innerHTML=(live?`<h3 style="font-size:13px;margin:0 0 4px">Amended on this board</h3>${live}`:'<p class="note">No amendments made on this board yet. Changes made in clerk mode appear here with who made them and why.</p>')+
   `<h3 style="font-size:13px;margin:16px 0 4px">Recorded in the Rev1 spreadsheet</h3>${sheet}`;
}
function renderClerkbar(){
  const b=$('clerkbar');b.hidden=!clerk;
  if(clerk)b.innerHTML=`<div class="clerkbar"><span><b>Clerk mode is on.</b> Click any viva to move it, change the room or swap the examiner. Every change is saved for all viewers and logged.</span><button class="btn sm" type="button" id="clerkOff">Turn off</button></div>`;
}

// ---------- drawer ----------
function close(){$('overlay').innerHTML=''}
function times(){const o=[];for(let t=480;t<=1050;t+=15)o.push(t);return o}
function freeSlots(v,exa){
  const L=all().filter(x=>x.id!==v.id);const bl=blocks();const out=[];
  DAYS.forEach(dd=>dd.win.forEach(([a,b])=>{for(let s=a;s+60<=b;s+=30){const c={date:dd.d,s,e:s+60};
    if(L.some(x=>ov(x,c)&&[x.sup,x.exa].some(p=>p===v.sup||p===exa)))continue;
    if(bl.some(k=>(k.lect===v.sup||k.lect===exa)&&k.date===dd.d&&c.s<k.e&&k.s<c.e))continue;
    const room=[v.venue].concat(ROOMS).find(r=>!L.some(x=>x.venue===r&&ov(x,c)));if(!room)continue;
    out.push(Object.assign(c,{venue:room}));}}));
  return out;
}
function openViva(id){
  const v=cur(id);const iss=(ISSBY[id]&&ISSBY[id].list)||[];
  const pair=`<div class="panelpair"><div class="pp">${ava(v.sup,'sm')}<div><div class="r" style="color:var(--sv)">Supervisor</div><div class="n">${esc(full(v.sup))}</div></div></div><div class="pp">${ava(v.exa,'sm')}<div><div class="r" style="color:var(--ex)">Examiner</div><div class="n">${esc(full(v.exa))}</div></div></div></div>`;
  if(!clerk){
    $('overlay').innerHTML=`<div class="scrim" data-close></div><aside class="drawer" role="dialog" aria-label="Viva details"><header><div><div class="eyebrow">${esc(v.code)} · No. ${v.no}</div><h3>${esc(v.name)}</h3></div><button class="btn sm" type="button" data-close>Close</button></header>
     <div class="body">${pair}<div class="check ${iss.some(x=>x.sev==='bad')?'bad':'ok'}"><b>${DAY[v.date].dn}, ${DAY[v.date].lab} · ${fmtR(v.s,v.e)} · ${esc(v.venue)}</b>${moved(v)?`<span>Originally ${DAY[v.odate].lab} ${fmtR(v.os,v.oe)} · ${esc(v.ovenue)}</span>`:''}</div>
     ${iss.map(x=>`<div class="check ${x.sev==='bad'?'bad':x.sev==='warn'?'warn':'ok'}"><b>${esc(x.type)}</b><span>${esc(x.det)}</span></div>`).join('')}
     ${v.note?`<p class="note">Rev1 note: ${esc(v.note)}</p>`:''}${v.chg&&v.chg.reason?`<p class="note">Last amendment: ${esc(v.chg.reason)}</p>`:''}
     ${canWrite?'<p class="note">Turn on Clerk mode at the top of the page to amend this viva.</p>':''}</div></aside>`;
    return;
  }
  const exOpts=D.staff.slice().sort((a,b)=>a.code.localeCompare(b.code)).filter(s=>s.id!==v.sup).map(s=>`<option value="${s.id}" ${s.id===v.exa?'selected':''}>${esc(s.code)} — ${esc(s.name)}</option>`).join('');
  const venues=[...new Set(ROOMS.concat(all().map(x=>x.venue)))];
  $('overlay').innerHTML=`<div class="scrim" data-close></div><aside class="drawer" role="dialog" aria-label="Amend viva"><header><div><div class="eyebrow">Amend · ${esc(v.code)} · No. ${v.no}</div><h3>${esc(v.name)}</h3></div><button class="btn sm" type="button" data-close>Close</button></header>
   <div class="body">${pair}
   <div class="fgrid">
    <div class="field"><label for="eDate">Date</label><select class="inp" id="eDate">${DAYS.map(x=>`<option value="${x.d}" ${x.d===v.date?'selected':''}>${x.dn} · ${x.lab}</option>`).join('')}</select></div>
    <div class="field"><label for="eVenue">Venue</label><select class="inp" id="eVenue">${venues.map(r=>`<option ${r===v.venue?'selected':''}>${esc(r)}</option>`).join('')}<option value="__other">Other…</option></select></div>
    <div class="field"><label for="eStart">Start</label><select class="inp" id="eStart">${times().map(t=>`<option value="${t}" ${t===v.s?'selected':''}>${fmt(t)}</option>`).join('')}</select></div>
    <div class="field"><label for="eDur">Duration</label><select class="inp" id="eDur">${[45,60,75,90].map(m=>`<option value="${m}" ${m===v.e-v.s?'selected':''}>${m} min</option>`).join('')}</select></div>
    <div class="field" id="eOtherWrap" hidden style="grid-column:1/-1"><label for="eOther">Other venue name</label><input class="inp" id="eOther" placeholder="e.g. Vibration Lab"></div>
    <div class="field" style="grid-column:1/-1"><label for="eExa">Examiner (change only if the examiner is replaced)</label><select class="inp" id="eExa">${exOpts}</select></div>
    <div class="field"><label for="eReq">Requested by</label><select class="inp" id="eReq"><option>Supervisor</option><option>Examiner</option><option>Student</option><option>FYP coordinator</option><option>Room booking</option><option>Other</option></select></div>
    <div class="field"><label for="eReason">Reason</label><input class="inp" id="eReason" placeholder="e.g. Examiner invigilating exam"></div>
   </div>
   <div id="eCheck"></div>
   <div><div class="field"><label>Free slots for both lecturers (click to use)</label></div><div class="sugg" id="eSugg"></div></div>
   <p class="note">Original slot: ${DAY[v.odate].lab} ${fmtR(v.os,v.oe)} · ${esc(v.ovenue)}${v.note?' · Rev1 note: '+esc(v.note):''}</p>
   </div><footer>${changes[id]?'<button class="btn danger" type="button" id="eRevert">Undo board amendment</button>':''}<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" id="eSave">Save change</button></footer></aside>`;
  const prop=()=>{let ven=$('eVenue').value;if(ven==='__other')ven=$('eOther').value.trim()||'Other venue';const s=+$('eStart').value;return {id,date:$('eDate').value,s,e:s+(+$('eDur').value),venue:ven,exa:$('eExa').value}};
  const check=()=>{
    $('eOtherWrap').hidden=$('eVenue').value!=='__other';
    const p=prop();const L=all().map(x=>x.id===id?Object.assign({},x,p,{chg:{}}):x);
    const iss=issuesFor(L).filter(x=>x.ids.includes(id));
    $('eCheck').innerHTML=iss.filter(x=>x.sev!=='info').length?iss.filter(x=>x.sev!=='info').map(x=>`<div class="check ${x.sev}"><b>${esc(x.type)}</b><span>${esc(x.msg)} · ${esc(x.det)}</span></div>`).join(''):'<div class="check ok"><b>No clash</b><span>Both lecturers and the room are free at this time.</span></div>';
    const fs=freeSlots(cur(id),p.exa);
    $('eSugg').innerHTML=fs.length?fs.slice(0,40).map((f,i)=>`<button type="button" data-fs="${i}">${DAY[f.date].lab.slice(0,6)} · ${fmt(f.s)} · ${esc(f.venue)}</button>`).join(''):'<span class="note">No common free hour inside the planned hours. Try another examiner or an exception slot.</span>';
    $('eSugg').onclick=e=>{const b=e.target.closest('[data-fs]');if(!b)return;const f=fs[+b.dataset.fs];$('eDate').value=f.date;$('eStart').value=f.s;$('eDur').value=60;$('eVenue').value=f.venue;check();};
  };
  ['eDate','eVenue','eStart','eDur','eExa','eOther'].forEach(k=>$(k).addEventListener('input',check));
  check();
  $('eSave').onclick=async()=>{const p=prop();const reason=$('eReason').value.trim();
    if(!reason){$('eReason').focus();toast('Add a short reason so colleagues know why it moved.');return}
    const from=cur(id);const to={date:p.date,s:p.s,e:p.e,venue:p.venue,exa:p.exa};
    const at=new Date().toISOString();
    try{await db.collection('changes').doc(id).set(Object.assign({},to,{reason,req:$('eReq').value,by:myId||'',at}));
      await db.collection('log').add({kind:'move',vivaId:id,from:{date:from.date,s:from.s,e:from.e,venue:from.venue,exa:from.exa},to,reason,req:$('eReq').value,by:myId||'',at});
      close();toast('Saved. Everyone with this page open sees the new slot.');}catch(e){toast(saveErr(e))}};
  if($('eRevert'))$('eRevert').onclick=async()=>{const from=cur(id),b=BASE[id];
    try{await db.collection('changes').doc(id).delete();await db.collection('log').add({kind:'revert',vivaId:id,from:{date:from.date,s:from.s,e:from.e,venue:from.venue,exa:from.exa},to:{date:b.date,s:b.s,e:b.e,venue:b.venue,exa:b.exa},reason:'Amendment undone',by:myId||'',at:new Date().toISOString()});close();toast('Back to the Rev1 slot.');}catch(e){toast(saveErr(e))}};
}
function openBlock(){
  const opts=D.staff.slice().sort((a,b)=>a.code.localeCompare(b.code)).map(s=>`<option value="${s.id}" ${s.id===sel?'selected':''}>${esc(s.code)} — ${esc(s.name)}</option>`).join('');
  $('overlay').innerHTML=`<div class="scrim" data-close></div><aside class="drawer" role="dialog" aria-label="Add unavailability"><header><div><div class="eyebrow">Lecturer availability</div><h3>Mark a lecturer unavailable</h3></div><button class="btn sm" type="button" data-close>Close</button></header>
  <div class="body"><div class="fgrid">
   <div class="field" style="grid-column:1/-1"><label for="bL">Lecturer</label><select class="inp" id="bL">${opts}</select></div>
   <div class="field" style="grid-column:1/-1"><label for="bD">Date</label><select class="inp" id="bD">${DAYS.map(x=>`<option value="${x.d}">${x.dn} · ${x.lab}</option>`).join('')}</select></div>
   <div class="field"><label for="bS">From</label><select class="inp" id="bS">${times().map(t=>`<option value="${t}" ${t===480?'selected':''}>${fmt(t)}</option>`).join('')}<option value="1080">6.00 pm</option></select></div>
   <div class="field"><label for="bE">Until</label><select class="inp" id="bE">${times().map(t=>`<option value="${t}">${fmt(t)}</option>`).join('')}<option value="1080" selected>6.00 pm</option></select></div>
   <div class="field" style="grid-column:1/-1"><label for="bR">Reason</label><input class="inp" id="bR" placeholder="e.g. Invigilating EMT211 exam"></div></div>
   <div id="bCheck"></div></div>
  <footer><button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" id="bSave">Save</button></footer></aside>`;
  const chk=()=>{const k={lect:$('bL').value,date:$('bD').value,s:+$('bS').value,e:+$('bE').value};
    const hit=all().filter(v=>(v.sup===k.lect||v.exa===k.lect)&&v.date===k.date&&v.s<k.e&&k.s<v.e);
    $('bCheck').innerHTML=hit.length?`<div class="check warn"><b>${hit.length} viva${hit.length>1?'s':''} will be flagged</b>${hit.map(v=>`<span>${fmtR(v.s,v.e)} · ${esc(v.venue)} · ${esc(v.name)}</span>`).join('')}<span>Move them after saving using the Fix buttons in “Clashes and checks”.</span></div>`:'<div class="check ok"><b>No viva affected</b></div>'};
  ['bL','bD','bS','bE'].forEach(k=>$(k).addEventListener('input',chk));chk();
  $('bSave').onclick=async()=>{const k={lect:$('bL').value,date:$('bD').value,s:+$('bS').value,e:+$('bE').value,reason:$('bR').value.trim()||'Unavailable',by:myId||'',at:new Date().toISOString()};
    if(k.e<=k.s){toast('“Until” must be later than “From”.');return}
    try{await db.collection('blocks').add(k);await db.collection('log').add({kind:'block',text:`${code(k.lect)} unavailable ${DAY[k.date].lab} ${fmtR(k.s,k.e)}`,reason:k.reason,by:k.by,at:k.at});close();toast('Saved. Affected vivas are now flagged.');}catch(e){toast(saveErr(e))}};
}
function saveErr(e){return e&&(e.code==='permission-denied'||e.code==='not_granted')?'You have view access only. Ask the FYP coordinator for clerk access to amend the board.':'Could not save ('+(e&&e.message||'network')+'). Try again.'}
let tt;function toast(m){let t=document.querySelector('.toast');if(!t){t=document.createElement('div');t.className='toast';t.setAttribute('role','status');document.body.appendChild(t)}t.textContent=m;clearTimeout(tt);tt=setTimeout(()=>t.remove(),3500)}


function stuMatches(q){q=q.trim().toLowerCase();if(q.length<2)return[];
  const words=q.split(/\s+/);return D.vivas.filter(v=>v.code.toLowerCase().startsWith(q)||words.every(w=>v.name.toLowerCase().includes(w))).slice(0,8)}
function renderStuRes(){const q=$('stuQ').value;const M=stuMatches(q);
  $('stuRes').innerHTML=q.trim().length<2?'<p class="note">Type at least two letters of your name, or your project code (your supervisor\'s code plus a number, e.g. MHH1).</p>':
   M.length?M.map(v=>{const c=cur(v.id);return `<button type="button" data-stu="${v.id}" aria-current="${v.id===stu}"><b>${esc(v.name)}</b><span>${esc(v.code)} · ${DAY[c.date].lab.slice(4)}</span></button>`}).join(''):'<p class="note">No student matches that. Check the spelling or try your project code.</p>';}
function pcard(id,role,cls){const s=STAFF[id];return `<div class="pcard">${ava(id,'lg')}<div style="min-width:0"><div class="r" style="color:var(--${cls})">${role}</div><div class="n">${esc(full(id))}</div><div class="m">${esc(s?s.email:'')}</div></div></div>`}
function renderStudent(el){
  if(!stu){el.innerHTML='<div class="empty">Type your name or project code on the left. Your viva date, time, room, supervisor and examiner appear here.</div>';return}
  const v=cur(stu),x=DAY[v.date],iss=(ISSBY[stu]&&ISSBY[stu].list)||[];const bad=iss.filter(i=>i.sev==='bad');
  el.innerHTML=`<div class="stucard"><div><div class="eyebrow">${esc(v.code)} · No. ${v.no}</div><div class="who2">${esc(v.name)}</div></div>
   <div class="slot3"><div><div class="l">Date</div><div class="v">${x.lab}</div><div class="s">${x.dn}, 2026</div></div><div><div class="l">Time</div><div class="v mono">${fmtR(v.s,v.e)}</div><div class="s">${v.e-v.s} minutes</div></div><div><div class="l">Venue</div><div class="v" style="display:flex;gap:8px;align-items:center">${rtag(v.venue,"lg")}${esc(v.venue)}</div><div class="s">School of Mechanical Engineering</div></div></div>
   ${moved(v)?`<div class="check warn"><b>Your slot has changed</b><span>Originally ${DAY[v.odate].lab} ${fmtR(v.os,v.oe)} · ${esc(v.ovenue)}. Please follow the new slot above.</span></div>`:''}
   ${bad.length?`<div class="check bad"><b>This slot is being reviewed</b><span>The coordinator is fixing a clash in this slot. Check this page again before your viva.</span></div>`:''}
   <div class="panel2">${pcard(v.sup,'Supervisor','sv')}${pcard(v.exa,'Examiner','ex')}</div>
   <div class="toolbar"><button class="btn sm" type="button" id="btnCopyStu">Copy my viva details</button><button class="btn sm" type="button" id="btnClearStu">Clear</button></div>
   <p class="note">Tip: bookmark this page now. The link ends with #${esc(v.code)} and opens straight to your slot. If the clerk moves your viva, this page shows the new slot.</p></div>`;
}
function setStu(id){stu=id||null;try{localStorage.setItem('viva.mode','stu');stu?localStorage.setItem('viva.stu',stu):localStorage.removeItem('viva.stu')}catch(_){}
  try{history.replaceState(null,'',stu?'#'+BASE[stu].code:location.pathname+location.search)}catch(_){}
  if(stu)day=cur(stu).date;render();}
function setMode(m){mode=m;try{localStorage.setItem('viva.mode',m)}catch(_){}
  if(m==='stu'){setStu(stu)}else{setSel(sel)}}
// ---------- export ----------
function csv(){
  const rows=[['No','Student Name','Project Code','Supervisor','Examiner','Date','Day','Time','Venue','Status','Remark']];
  all().sort((a,b)=>a.no-b.no).forEach(v=>{const sev=sevOf(v.id);rows.push([v.no,v.name,v.code,full(v.sup),full(v.exa),v.date.split('-').reverse().join('/'),DAY[v.date].dn,fmtR(v.s,v.e),v.venue,sev==='bad'?'CLASH':moved(v)?'Rescheduled':'As planned',(v.chg&&v.chg.reason)||v.note||''])});
  return rows.map(r=>r.map(c=>{c=String(c);return /[",\n]/.test(c)?'"'+c.replace(/"/g,'""')+'"':c}).join(',')).join('\r\n');
}
function myText(){
  const L=all().filter(v=>v.sup===sel||v.exa===sel).sort((a,b)=>a.date.localeCompare(b.date)||a.s-b.s);
  return `Jadual Viva FYP EMD/EPD 462 — ${full(sel)} (${code(sel)})\n`+L.map(v=>`${DAY[v.date].dn} ${DAY[v.date].lab} · ${fmtR(v.s,v.e)} · ${v.venue} · ${v.sup===sel?'SV':'EX'} · ${v.name} (${v.code}) · with ${code(v.sup===sel?v.exa:v.sup)}`).join('\n');
}

// ---------- events ----------
document.addEventListener('click',async e=>{
  const t=e.target;
  if(t.closest('[data-close]')){close();return}
  const o=t.closest('[data-open]');if(o){openViva(o.dataset.open);return}
  const ed=t.closest('[data-edit]');if(ed){openViva(ed.dataset.edit);return}
  const d=t.closest('[data-day]');if(d){day=d.dataset.day;try{localStorage.setItem('viva.day',day)}catch(_){};renderTabs();renderGrid();return}
  const g=t.closest('[data-go]');if(g){issFilter=g.dataset.go;renderIssues();$('issuesPanel').scrollIntoView({behavior:'smooth',block:'start'});return}
  const f=t.closest('#issSeg button');if(f){issFilter=f.dataset.f;renderIssues();return}
  const ub=t.closest('[data-unblock]');if(ub&&db){const k=dbBlocks.find(x=>x.id===ub.dataset.unblock);try{await db.collection('blocks').doc(ub.dataset.unblock).delete();await db.collection('log').add({kind:'unblock',text:k?`${code(k.lect)} ${DAY[k.date]?DAY[k.date].lab:''} ${fmtR(k.s,k.e)}`:'',reason:'Removed',by:myId||'',at:new Date().toISOString()});toast('Removed.')}catch(err){toast(saveErr(err))}return}
  if(t.closest('#btnCopy')){const txt=myText();try{await navigator.clipboard.writeText(txt);toast('Schedule copied. Paste it into WhatsApp or email.')}catch(_){toast('Copy is blocked here. Select the list on the right instead.')}return}
  if(t.closest('#btnClear')){setSel(null);return}
  const md=t.closest('[data-mode]');if(md){setMode(md.dataset.mode);return}
  const sb=t.closest('[data-stu]');if(sb){setStu(sb.dataset.stu);renderStuRes();return}
  if(t.closest('#btnClearStu')){$('stuQ').value='';setStu(null);return}
  if(t.closest('#btnCopyStu')){const v=cur(stu);const txt=`Viva FYP EMD/EPD 462 — ${v.name} (${v.code})\n${DAY[v.date].dn}, ${DAY[v.date].lab} 2026 · ${fmtR(v.s,v.e)} · ${v.venue}\nSupervisor: ${full(v.sup)}\nExaminer: ${full(v.exa)}`;try{await navigator.clipboard.writeText(txt);toast('Copied. Paste it into your notes or WhatsApp.')}catch(_){toast('Copy is blocked here. Take a screenshot instead.')}return}
  if(t.closest('#btnClerk')){clerk=!clerk;$('btnClerk').classList.toggle('on',clerk);render();return}
  if(t.closest('#clerkOff')){clerk=false;$('btnClerk').classList.remove('on');render();return}
  if(t.closest('#btnBlock')){openBlock();return}
  if(t.closest('#btnCsv')){const blob=new Blob(['\ufeff'+csv()],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='EMDEPD462_Viva_Schedule_'+new Date().toISOString().slice(0,10)+'.csv';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);return}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
function setSel(id){sel=id||null;mode='lect';try{localStorage.setItem('viva.mode','lect');sel?localStorage.setItem('viva.sel',sel):localStorage.removeItem('viva.sel')}catch(_){}
  try{history.replaceState(null,'',sel?'#'+code(sel):location.pathname+location.search)}catch(_){}
  if(sel){const n=all().filter(v=>v.sup===sel||v.exa===sel).map(v=>v.date).sort();if(n.length&&!n.includes(day)){day=n[0]}}
  render();}
$('lectSel').addEventListener('change',e=>setSel(e.target.value));
try{MQ.addEventListener('change',renderGrid)}catch(_){}
$('q').addEventListener('input',renderList);$('fDay').addEventListener('change',renderList);
window.addEventListener('hashchange',()=>{const h=decodeURIComponent(location.hash.slice(1)).toUpperCase();if(BYCODE[h]&&BYCODE[h]!==sel)setSel(BYCODE[h]);else if(BYPROJ[h]&&BYPROJ[h]!==stu){mode='stu';setStu(BYPROJ[h])}});
$('stuQ').addEventListener('input',renderStuRes);
$('stuQ').addEventListener('keydown',e=>{if(e.key==='Enter'){const M=stuMatches($('stuQ').value);if(M.length===1){setStu(M[0].id);renderStuRes()}}});

if(sel&&mode==='lect'){const n=all().filter(v=>v.sup===sel||v.exa===sel).map(v=>v.date).sort();if(n.length&&!n.includes(day))day=n[0]}
if(mode==='stu'&&stu){day=cur(stu).date;$('stuQ').value=BASE[stu].code}
render();

// ---------- live data (Firebase) ----------
db=ctx.db; myId=ctx.me; canWrite=ctx.canWrite; $('btnClerk').hidden=!canWrite;
{const live=()=>{$('syncDot').className='dot live';$('syncTxt').textContent='Live · synced'};
 const err=e=>{$('syncDot').className='dot err';$('syncTxt').textContent='Sync paused';console.error(e)};
 db.collection('changes').onSnapshot(s=>{const c={};s.docs.forEach(x=>{const v=x.data();if(v&&BASE[x.id])c[x.id]=v});changes=c;live();render();},err);
 db.collection('blocks').onSnapshot(s=>{dbBlocks=s.docs.map(x=>Object.assign({id:x.id},x.data())).filter(k=>k.lect&&k.date);live();render();},err);
 db.collection('log').orderBy('at','desc').limit(300).onSnapshot(s=>{dbLog=s.docs.map(x=>x.data());renderLog();},err);}

}};