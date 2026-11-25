/* A stand-in for the Supabase client, kept in localStorage, used only by the tests.
   It covers what the app calls: sign up / in / out, password, email confirmation links,
   the records table (sync), profiles and shared_programs (client exercise pages). */
(function(){
const LS='fakeServer';const st=()=>JSON.parse(localStorage.getItem(LS)||'{"users":[],"records":[],"profiles":[],"t":0}');const put=s=>localStorage.setItem(LS,JSON.stringify(s));
let session=JSON.parse(localStorage.getItem('fakeSession')||'null');const subs=[];
const emit=(ev,s)=>setTimeout(()=>subs.forEach(f=>f(ev,s)),0);
const now=s=>{s.t++;return new Date(1700000000000+s.t*1000).toISOString()};
function shares(){let del=false,filters=[],single=false;const api={
  upsert(o){const s=st();s.shares=s.shares||{};for(const x of[].concat(o)){if(!session)return Promise.resolve({error:{message:'not signed in'}});const old=s.shares[x.token];if(old&&old.user_id!==session.user.id)return Promise.resolve({error:{message:'RLS'}});s.shares[x.token]={done:{},...old,...x,user_id:session.user.id}}put(s);window.__shareUps=(window.__shareUps||0)+1;return Promise.resolve({error:null})},
  delete(){del=true;return api},select(){return api},eq(c,v){filters.push(x=>x[c]===v);return api},maybeSingle(){single=true;return api},
  then(res){const s=st();s.shares=s.shares||{};const L=Object.values(s.shares).filter(x=>session&&x.user_id===session.user.id&&filters.every(f=>f(x)));
    if(del){for(const x of L)delete s.shares[x.token];put(s);window.__shareDels=(window.__shareDels||0)+L.length;return res({error:null})}
    res(single?{data:L[0]?{...L[0]}:null,error:null}:{data:L,error:null})}};return api}
function q(table){if(table==='shared_programs')return shares();let rows=null,filters=[],ord=null,rng=null,single=false;const api={
  upsert(r){const s=st();for(const x of r){if(x.user_id!==session.user.id)return Promise.resolve({error:{message:'RLS'}});const i=s.records.findIndex(y=>y.user_id===x.user_id&&y.kind===x.kind&&y.id===x.id);const rec={...x,updated_at:now(s)};if(i>=0)s.records[i]=rec;else s.records.push(rec)}put(s);window.__upserts=(window.__upserts||0)+r.length;return Promise.resolve({error:null})},
  select(){return api},gt(c,v){filters.push(x=>x[c]>v);return api},eq(c,v){filters.push(x=>x[c]===v);return api},order(){ord=1;return api},range(a,b){rng=[a,b];return api},maybeSingle(){single=true;return api},
  then(res){const s=st();let L=(table==='records'?s.records.filter(x=>x.user_id===session.user.id):s.profiles).filter(x=>filters.every(f=>f(x)));if(ord)L.sort((a,b)=>a.updated_at.localeCompare(b.updated_at));if(rng)L=L.slice(rng[0],rng[1]+1);res(single?{data:L[0]||null,error:null}:{data:L.map(x=>({...x})),error:null})}};return api}
window.supabase={createClient:()=>({
  auth:{getSession:async()=>({data:{session}}),onAuthStateChange:f=>{subs.push(f);return{data:{subscription:{unsubscribe(){}}}}},
    signUp:async({email,password,options})=>{const s=st();if(s.users.find(u=>u.email===email))return{error:{message:'User already registered'}};const u={id:'u-'+s.users.length,email,password,confirmed:localStorage.getItem('fakeConfirm')!=='1',name:options.data.name};window.__redirect=options.emailRedirectTo;s.users.push(u);s.profiles.push({id:u.id,name:options.data.name,plan:'trial',trial_ends:new Date(Date.now()+30*864e5).toISOString()});put(s);if(!u.confirmed)return{data:{session:null,user:{id:u.id}},error:null};session={user:{id:u.id,email,user_metadata:{name:u.name}}};localStorage.setItem('fakeSession',JSON.stringify(session));emit('SIGNED_IN',session);return{data:{session},error:null}},
    signInWithPassword:async({email,password})=>{const u=st().users.find(u=>u.email===email&&u.password===password);if(!u)return{error:{message:'Invalid login credentials'}};if(!u.confirmed)return{error:{message:'Email not confirmed'}};const same=session&&session.user.id===u.id;session={user:{id:u.id,email,user_metadata:{name:u.name}}};if(same){localStorage.setItem('fakeSession',JSON.stringify(session));return{data:{session},error:null}}localStorage.setItem('fakeSession',JSON.stringify(session));emit('SIGNED_IN',session);return{data:{session},error:null}},
    signOut:async()=>{session=null;localStorage.removeItem('fakeSession');emit('SIGNED_OUT',null);return{error:null}},
    updateUser:async({password})=>{const s=st();s.users.find(u=>u.id===session.user.id).password=password;put(s);return{error:null}},resend:async()=>{window.__resent=(window.__resent||0)+1;return{error:null}},setSession:async({access_token})=>{const s=st();const u=s.users.find(u=>u.id===access_token);if(!u)return{error:{message:'Invalid token'}};u.confirmed=true;put(s);session={user:{id:u.id,email:u.email,user_metadata:{name:u.name}}};localStorage.setItem('fakeSession',JSON.stringify(session));emit('SIGNED_IN',session);return{data:{session},error:null}},signInWithOtp:async()=>({error:null}),verifyOtp:async()=>({error:{message:'Token has expired or is invalid'}})},
  from:q,
  rpc:async(n)=>{const s=st();s.records=s.records.filter(x=>x.user_id!==session.user.id);s.users=s.users.filter(u=>u.id!==session.user.id);put(s);return{error:null}}})};
})();
