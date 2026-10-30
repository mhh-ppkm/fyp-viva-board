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

// USM email + password; the address is confirmed once through a verification email
let gmode='in', verifyMode=false;
function setG(m){gmode=m;document.querySelectorAll('.gseg button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.g===m));
  $('gatePass2Wrap').hidden=m!=='new';$('btnIn').textContent=m==='new'?'Create account':'Sign in';$('btnForgot').hidden=m==='new';
  $('gatePass').autocomplete=m==='new'?'new-password':'current-password'}
document.querySelectorAll('.gseg button').forEach(b=>b.onclick=()=>setG(b.dataset.g));
const msg=t=>{$('gateMsg').textContent=t};
const nice=e=>({'auth/invalid-credential':'Wrong email or password. If you have not made an account yet, choose "Create account".','auth/wrong-password':'Wrong password. Use "Forgot password" to reset it.','auth/user-not-found':'No account for this email yet. Choose "Create account".','auth/email-already-in-use':'This email already has an account. Choose "Sign in", or "Forgot password" if you do not remember it.','auth/weak-password':'Choose a password with at least 6 characters.','auth/too-many-requests':'Too many attempts. Wait a few minutes and try again.','auth/quota-exceeded':'The daily email limit is reached. Try again tomorrow.'}[e.code]||e.message);
$('gateForm').addEventListener('submit',async ev=>{ev.preventDefault();
  if(verifyMode){await auth.currentUser.reload();if(auth.currentUser.emailVerified){await auth.currentUser.getIdToken(true);location.reload()}else msg('Not confirmed yet. Click the link in the email first (check Junk), then try again.');return}
  const em=$('gateEmail').value.trim().toLowerCase(),pw=$('gatePass').value;
  if(!okDomain(em)){msg('Use your USM email (@usm.my or @student.usm.my).');return}
  $('btnIn').disabled=true;
  try{
    if(gmode==='new'){
      if(pw!==$('gatePass2').value){msg('The two passwords do not match.');return}
      const c=await auth.createUserWithEmailAndPassword(em,pw);
      await c.user.sendEmailVerification({url:location.origin+location.pathname});
      msg(`Account created. We sent a confirmation email to ${em}. Click the link in it (check Junk too), then come back and sign in.`);
      setG('in');
    }else{await auth.signInWithEmailAndPassword(em,pw)}
  }catch(e){msg(nice(e))}finally{$('btnIn').disabled=false}});
$('btnForgot').onclick=async()=>{const em=$('gateEmail').value.trim().toLowerCase();
  if(!okDomain(em)){msg('Type your USM email first, then click "Forgot password".');return}
  try{await auth.sendPasswordResetEmail(em,{url:location.origin+location.pathname});msg(`Password reset email sent to ${em}. Check your inbox and Junk folder.`)}catch(e){msg(nice(e))}};
$('btnResend').onclick=async()=>{try{await auth.currentUser.sendEmailVerification({url:location.origin+location.pathname});msg('Confirmation email sent again. Click the link in it, then press "I have confirmed".')}catch(e){msg(nice(e))}};
$('btnOut').onclick=()=>auth.signOut().then(()=>location.reload());

auth.onAuthStateChanged(async u=>{
  user=u;
  if(!u){$('gate').hidden=false;$('app').hidden=true;$('btnOut').hidden=true;$('gateForm').hidden=false;$('btnResend').hidden=true;return}
  if(!okDomain(u.email)){$('gateMsg').textContent=`${u.email} is not a USM account. Use your @usm.my or @student.usm.my email.`;await auth.signOut();return}
  if(!u.emailVerified){await u.reload();}
  if(!auth.currentUser.emailVerified){
    $('gate').hidden=false;$('app').hidden=true;$('btnOut').hidden=false;
    msg(`Please confirm your email first. We sent a link to ${u.email} (check Junk). After clicking it, press "I have confirmed".`);
    $('btnResend').hidden=false;$('btnForgot').hidden=true;$('btnIn').textContent='I have confirmed';
    verifyMode=true;$('gateEmail').closest('.field').hidden=true;$('gatePass').closest('.field').hidden=true;document.querySelector('.gseg').hidden=true;$('gatePass').required=false;$('gateEmail').required=false;
    return;}
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
