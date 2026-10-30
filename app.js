// Sign-in, roles, schedule loading and admin tools. The board itself lives in board.js.
(function(){
const $=id=>document.getElementById(id);
const cfg=window.VIVA_CONFIG;
function toast(m){let t=document.querySelector('.toast');if(!t){t=document.createElement('div');t.className='toast';t.setAttribute('role','status');document.body.appendChild(t)}t.textContent=m;clearTimeout(toast.t);toast.t=setTimeout(()=>t.remove(),4000)}
if(!cfg||!cfg.firebase||String(cfg.firebase.apiKey).startsWith('PASTE')){$('gateMsg').textContent='Setup is not finished: paste the Firebase config into config.js (see README).';$('gateForm').hidden=true;return}
firebase.initializeApp(cfg.firebase);
const auth=firebase.auth(), db=firebase.firestore();
const okDomain=e=>!!e&&cfg.allowedDomains.some(d=>e.toLowerCase().endsWith('@'+d));
let booted=false, role=null, user=null;

// Passwordless sign-in: email link to the USM mailbox (USM email is Microsoft 365, not Google)
const LINK_KEY='viva.emailForSignIn';
const linkSettings={url:location.origin+location.pathname,handleCodeInApp:true};
let finishFn=null;
$('gateForm').addEventListener('submit',async e=>{e.preventDefault();
  const em=$('gateEmail').value.trim().toLowerCase();
  if(finishFn){finishFn(em);return}
  if(!okDomain(em)){$('gateMsg').textContent='Use your USM email (@usm.my or @student.usm.my).';return}
  $('btnIn').disabled=true;
  try{await auth.sendSignInLinkToEmail(em,linkSettings);try{localStorage.setItem(LINK_KEY,em)}catch(_){}
    $('gateMsg').textContent=`Sign-in link sent to ${em}. Open your USM inbox (check Junk too) and click the link. You can close this tab.`;}
  catch(err){$('gateMsg').textContent='Could not send the link: '+err.message}
  finally{$('btnIn').disabled=false}});
if(auth.isSignInWithEmailLink(location.href)){
  let em=null;try{em=localStorage.getItem(LINK_KEY)}catch(_){}
  const finish=async email=>{try{await auth.signInWithEmailLink(email,location.href);try{localStorage.removeItem(LINK_KEY)}catch(_){}
      history.replaceState(null,'',location.origin+location.pathname)}
    catch(err){finishFn=null;$('btnIn').textContent='Email me a sign-in link';$('gateMsg').textContent='This sign-in link has expired or was already used. Request a new one below. ('+err.code+')'}};
  if(em)finish(em);
  else{$('gateMsg').textContent='You opened the link on a different device or browser. Type the same USM email again to finish signing in.';
    $('btnIn').textContent='Finish sign-in';
    finishFn=finish;}
}
$('btnOut').onclick=()=>auth.signOut().then(()=>location.reload());

auth.onAuthStateChanged(async u=>{
  user=u;
  if(!u){$('gate').hidden=false;$('app').hidden=true;$('btnOut').hidden=true;$('gateForm').hidden=false;return}
  if(!okDomain(u.email)){$('gateMsg').textContent=`${u.email} is not a USM account. Use your @usm.my or @student.usm.my email.`;await auth.signOut();return}
  $('gateForm').hidden=true;$('gateHint').hidden=true;
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
   <div class="field"><label for="rEmail">Give clerk access (USM email)</label><div class="row"><input class="inp" id="rEmail" placeholder="name@usm.my" style="flex:1"><select class="inp" id="rRole" style="width:auto"><option value="clerk">Clerk</option><option value="admin">Admin</option></select><button class="btn" type="button" id="rAdd">Add</button></div></div>
   <div id="rList"><p class="note">Loading…</p></div>
  </div></aside>`;
  ov.querySelectorAll('[data-x]').forEach(b=>b.onclick=()=>ov.innerHTML='');
  const list=async()=>{const s=await db.collection('roles').get();$('rList').innerHTML=s.docs.map(d=>`<div class="iss"><span class="chip ${d.data().role==='admin'?'sv':'ex'}">${d.data().role}</span><div class="msg">${d.id}</div><div>${d.id===user.email.toLowerCase()?'':`<button class="btn sm danger" type="button" data-rm="${d.id}">Remove</button>`}</div></div>`).join('')||'<p class="note">No roles yet.</p>';
    $('rList').querySelectorAll('[data-rm]').forEach(b=>b.onclick=async()=>{await db.doc('roles/'+b.dataset.rm).delete();list()})};
  list().catch(e=>$('rList').innerHTML=`<p class="note">${e.message}</p>`);
  $('rAdd').onclick=async()=>{const e=$('rEmail').value.trim().toLowerCase();if(!okDomain(e)){toast('Enter a USM email address.');return}
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
