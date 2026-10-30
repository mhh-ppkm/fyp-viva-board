// Sign-in, roles, schedule loading and admin tools. The board itself lives in board.js.
(function(){
const $=id=>document.getElementById(id);
const cfg=window.VIVA_CONFIG;
function toast(m){let t=document.querySelector('.toast');if(!t){t=document.createElement('div');t.className='toast';t.setAttribute('role','status');document.body.appendChild(t)}t.textContent=m;clearTimeout(toast.t);toast.t=setTimeout(()=>t.remove(),4000)}
if(!cfg||!cfg.firebase||String(cfg.firebase.apiKey).startsWith('PASTE')){$('gateMsg').textContent='Setup is not finished: paste the Firebase config into config.js (see README).';$('gateRow').hidden=true;return}
firebase.initializeApp(cfg.firebase);
const auth=firebase.auth(), db=firebase.firestore();
let booted=false, role=null, user=null;

// Google (Gmail) sign-in. Popup first; if the browser blocks popups (some phone in-app browsers), fall back to a full-page redirect.
const msg=t=>{$('gateMsg').textContent=t};
const gp=new firebase.auth.GoogleAuthProvider();gp.setCustomParameters({prompt:'select_account'});
$('btnIn').onclick=async()=>{$('btnIn').disabled=true;
  try{await auth.signInWithPopup(gp)}
  catch(e){if(['auth/popup-blocked','auth/operation-not-supported-in-this-environment','auth/cancelled-popup-request'].includes(e.code)){await auth.signInWithRedirect(gp);return}
    if(e.code!=='auth/popup-closed-by-user')msg('Sign-in failed: '+(e.code==='auth/unauthorized-domain'?'add mhh-ppkm.github.io to Firebase → Authentication → Settings → Authorized domains.':e.message))}
  finally{$('btnIn').disabled=false}};
auth.getRedirectResult().catch(e=>msg('Sign-in failed: '+e.message));
$('btnOut').onclick=()=>auth.signOut().then(()=>location.reload());

auth.onAuthStateChanged(async u=>{
  user=u;
  if(!u){$('gate').hidden=false;$('app').hidden=true;$('btnOut').hidden=true;$('gateRow').hidden=false;$('gateHint').hidden=false;return}
  if(!u.emailVerified||!u.providerData.some(p=>p.providerId==='google.com')){await auth.signOut();return}
  $('gateRow').hidden=true;$('gateHint').hidden=true;
  $('btnOut').hidden=false;
  try{const r=await db.doc('roles/'+u.email.toLowerCase()).get();role=r.exists?r.data().role:null}catch(_){role=null}
  $('btnAdmin').hidden=role!=='admin';
  let staff,vivas,photos;
  try{
    const [a,b,c]=await Promise.all(['staff','vivas','photos'].map(k=>db.doc('base/'+k).get()));
    staff=a.exists&&a.data().list; vivas=b.exists&&b.data().list; photos=c.exists?c.data().map:{};
  }catch(e){$('gate').hidden=false;$('gateMsg').textContent='Could not load the schedule ('+e.code+'). Check that firestore.rules has been published.';return}
  if(!staff||!vivas){
    $('gate').hidden=false;
    $('gateMsg').textContent=role==='admin'?'No schedule loaded yet. Click Admin to import viva-seed.json.':'The coordinator has not published the schedule yet.';
    return;
  }
  $('gate').hidden=true;$('app').hidden=false;
  if(!booted){booted=true;window.VivaBoard.boot({staff,vivas},photos||{},{db,me:u.displayName||u.email,canWrite:role==='clerk'||role==='admin'})}
});

// ---------- admin: import schedule + manage clerks ----------
$('btnAdmin').onclick=async()=>{
  const ov=$('overlay');
  ov.innerHTML=`<div class="scrim" data-x></div><aside class="drawer" role="dialog" aria-label="Admin"><header><div><div class="eyebrow">Coordinator only</div><h3>Admin</h3></div><button class="btn sm" type="button" data-x>Close</button></header>
  <div class="body adm">
   <div class="field"><label for="impFile">Import or replace the schedule (viva-seed.json)</label><input class="inp" type="file" id="impFile" accept=".json,application/json">
   <p class="note">Replaces the base schedule, lecturer list and photos. Clerk amendments and the change log are kept. To start a new semester clean, also tick the box below.</p>
   <label class="note"><input type="checkbox" id="impWipe"> Also clear all amendments, unavailability and the change log</label>
   <div class="row"><button class="btn primary" type="button" id="impGo">Import</button></div></div>
   <div class="field"><label for="rEmail">Give clerk access (their Gmail address)</label><div class="row"><input class="inp" id="rEmail" placeholder="name@gmail.com" style="flex:1"><select class="inp" id="rRole" style="width:auto"><option value="clerk">Clerk</option><option value="admin">Admin</option></select><button class="btn" type="button" id="rAdd">Add</button></div></div>
   <div id="rList"><p class="note">Loading…</p></div>
  </div></aside>`;
  ov.querySelectorAll('[data-x]').forEach(b=>b.onclick=()=>ov.innerHTML='');
  const list=async()=>{const s=await db.collection('roles').get();$('rList').innerHTML=s.docs.map(d=>`<div class="iss"><span class="chip ${d.data().role==='admin'?'sv':'ex'}">${d.data().role}</span><div class="msg">${d.id}</div><div>${d.id===user.email.toLowerCase()?'':`<button class="btn sm danger" type="button" data-rm="${d.id}">Remove</button>`}</div></div>`).join('')||'<p class="note">No roles yet.</p>';
    $('rList').querySelectorAll('[data-rm]').forEach(b=>b.onclick=async()=>{await db.doc('roles/'+b.dataset.rm).delete();list()})};
  list().catch(e=>$('rList').innerHTML=`<p class="note">${e.message}</p>`);
  $('rAdd').onclick=async()=>{const e=$('rEmail').value.trim().toLowerCase();if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)){toast('Enter a full email address, e.g. name@gmail.com.');return}
    await db.doc('roles/'+e).set({role:$('rRole').value,addedBy:user.email,at:new Date().toISOString()});$('rEmail').value='';toast('Access given. They see Clerk mode after reloading the page.');list()};
  $('impGo').onclick=async()=>{const f=$('impFile').files[0];if(!f){toast('Choose viva-seed.json first.');return}
    let j;try{j=JSON.parse(await f.text())}catch(_){toast('That file is not valid JSON.');return}
    if(!Array.isArray(j.staff)||!Array.isArray(j.vivas)){toast('The file needs "staff" and "vivas" lists.');return}
    try{
      await db.doc('base/staff').set({list:j.staff});await db.doc('base/vivas').set({list:j.vivas});await db.doc('base/photos').set({map:j.photos||{}});
      if($('impWipe').checked){for(const c of ['changes','blocks','log']){const s=await db.collection(c).get();const b=db.batch();s.docs.forEach(d=>b.delete(d.ref));await b.commit()}}
      toast('Imported. Reloading…');setTimeout(()=>location.reload(),1200);
    }catch(e){toast('Import failed: '+e.message)}};
};
})();
