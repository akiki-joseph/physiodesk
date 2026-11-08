/* PhysioDesk exercise animator.
   An anatomical mannequin drawn in SVG from joint angles. Three views:
   side (sagittal plane), front (frontal plane, also used lying down when seen from above),
   and a close-up hand for finger work. Each motion is a list of key poses that loop.
   Angles are absolute, in degrees: 0 points down, 90 points forward/outward, 180 points up. */
(function(){
'use strict';
const RAD=Math.PI/180, FLOOR=200;
const v=a=>[Math.sin(a*RAD),Math.cos(a*RAD)];
const add=(p,d,l)=>[p[0]+d[0]*l,p[1]+d[1]*l];
const lerp=(a,b,t)=>a+(b-a)*t;
const angLerp=(a,b,t)=>{let d=((b-a)%360+540)%360-180;return a+d*t};
const ANG=/^(T|H|u|f|t|s|p|k|w|dv|tw|rot|lv|tsx)/;
const ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
const fx=n=>(+n).toFixed(1);

/* ---------- base poses ---------- */
const SIDE={T:180,H:180,hx:0,cv:0,uN:4,fN:6,hN:0,uF:-4,fF:-2,hF:0,tN:0,sN:0,pN:90,kN:0,tF:0,sF:0,pF:90,kF:0,X:0,Y:0,pr:0,belly:0,sh:0};
const FRONT={T:180,N:0,hr:0,ts:1,sw:1,tw:0,uL:8,fL:6,uR:8,fR:6,fsL:1,fsR:1,tL:4,sL:2,tR:4,sR:2,lsL:1,lsR:1,ssL:1,ssR:1,pL:0,pR:0,rot:0,X:0,Y:0,sh:0,pt:0,belly:0};
const P={
 stand:{},
 sit:{T:180,uN:20,fN:80,uF:16,fF:78,tN:90,sN:0,tF:90,sF:2},
 sitTall:{T:182,uN:10,fN:30,uF:8,fF:28,tN:90,sN:0,tF:90,sF:2},
 sitLong:{T:175,uN:10,fN:20,uF:6,fF:20,tN:90,sN:90,pN:180,tF:90,sF:90,pF:180},
 supine:{T:-90,H:-90,uN:92,fN:92,uF:88,fF:88,tN:90,sN:90,pN:180,tF:90,sF:90,pF:180},
 hook:{T:-90,H:-90,uN:92,fN:92,uF:88,fF:88,tN:140,sN:40,pN:90,tF:136,sF:44,pF:90},
 prone:{T:90,H:90,uN:-88,fN:-88,uF:-92,fF:-92,tN:-90,sN:-90,pN:0,tF:-90,sF:-90,pF:0},
 proneElb:{T:110,H:120,uN:4,fN:88,uF:0,fF:86,tN:-90,sN:-90,pN:0,tF:-90,sF:-90,pF:0},
 quad:{T:104,H:110,uN:2,fN:2,hN:90,uF:-2,fF:-2,hF:90,tN:0,sN:-90,pN:-90,tF:0,sF:-90,pF:-90},
 kneel:{T:180,tN:0,sN:-90,pN:-90,tF:0,sF:-90,pF:-90},
 halfKneel:{T:180,tN:90,sN:0,pN:90,tF:-10,sF:-90,pF:-90,uN:10,uF:-6},
 lunge:{T:180,tN:70,sN:5,pN:90,tF:-25,sF:-80,pF:-60},
 squat:{T:150,H:160,uN:80,fN:84,uF:76,fF:80,tN:78,sN:-28,tF:74,sF:-30},
 bridge:{T:-68,H:-90,uN:110,fN:110,uF:106,fF:106,tN:104,sN:18,pN:90,tF:100,sF:22,pF:90},
 tabletop:{T:-90,H:-90,uN:180,fN:180,uF:176,fF:176,tN:180,sN:90,pN:180,tF:176,sF:88,pF:180},
};
const FP={
 stand:{},
 sit:{tL:4,tR:4,lsL:.35,lsR:.35,sL:2,sR:2},
 arms90:{uL:90,fL:90,uR:90,fR:90},
 lieSide:{rot:-90},
 lieBack:{rot:-90,sw:1},
};
const mk=(view,...ps)=>Object.assign({},view==='f'?FRONT:SIDE,...ps);

/* ---------- forward kinematics ---------- */
function fkSide(P){
  const J={},td=v(P.T),fr=[-td[1],td[0]];        // fr: the direction the chest faces
  J.hip=[0,0];
  J.chest=add(J.hip,td,27);
  J.neck=add(J.hip,td,54);
  J.sh=add(add(J.hip,td,47),fr,-1);
  if(P.pr)J.sh=add(J.sh,v(P.uN),P.pr);
  if(P.sh)J.sh=add(J.sh,td,P.sh);
  const hd=v(P.H),hf=[-hd[1],hd[0]];
  J.head=add(add(add(J.neck,hd,10),hf,P.hx),hd,0);
  J.nose=add(J.head,hf,10.5);
  for(const s of['N','F']){
    J['el'+s]=add(J.sh,v(P['u'+s]),30);J['wr'+s]=add(J['el'+s],v(P['f'+s]),26);J['ha'+s]=add(J['wr'+s],v(P['f'+s]+P['h'+s]),9);
    J['kn'+s]=add(J.hip,v(P['t'+s]),42);J['an'+s]=add(J['kn'+s],v(P['s'+s]),40);
    const pd=v(P['p'+s]);J['he'+s]=add(J['an'+s],pd,-4);J['ba'+s]=add(J['an'+s],pd,11);J['to'+s]=add(J['ba'+s],v(P['p'+s]+P['k'+s]),5);
  }
  J.td=td;J.fr=fr;J.hd=hd;J.hf=hf;
  return J;
}
function fkFront(P){
  const J={},td=v(P.T),pr=[-td[1],td[0]],L=50*P.ts;  // pr: toward the figure's left (viewer's right)
  J.hip=[0,P.pt?0:0];
  J.neck=add(J.hip,td,L+4);
  const top=add(J.hip,td,L-3),hw=13*P.sw;
  J.shL=add(add(top,pr,hw),td,P.sh-P.pt*0);J.shR=add(add(top,pr,-hw),td,P.sh);
  if(P.tw){J.shL=add(J.shL,pr,-Math.abs(P.tw)/12);J.shR=add(J.shR,pr,Math.abs(P.tw)/12)}
  J.hpL=add(J.hip,pr,8);J.hpR=add(J.hip,pr,-8);
  if(P.pt){J.hpL=add(J.hpL,td,P.pt);J.hpR=add(J.hpR,td,-P.pt)}
  const hd=v(P.T+P.N);J.head=add(J.neck,hd,10);J.hd=hd;J.hpr=[-hd[1],hd[0]];
  const limb=(a,side)=>v(P.T-180+(side==='L'?a:-a));
  for(const s of['L','R']){
    J['el'+s]=add(J['sh'+s],limb(P['u'+s],s),30);J['wr'+s]=add(J['el'+s],limb(P['f'+s],s),26*P['fs'+s]);J['ha'+s]=add(J['wr'+s],limb(P['f'+s],s),8*Math.max(.4,P['fs'+s]));
    J['kn'+s]=add(J['hp'+s],limb(P['t'+s],s),42*P['ls'+s]);J['an'+s]=add(J['kn'+s],limb(P['s'+s],s),40*P['ss'+s]);
    J['ft'+s]=add(J['an'+s],limb(P['s'+s]+90+(P['p'+s]||0),s),7);
  }
  J.td=td;J.pr=pr;
  J.rotated=!!P.rot;
  if(P.rot){const c=Math.cos(P.rot*RAD),sn=Math.sin(P.rot*RAD);for(const k in J){const q=J[k];if(Array.isArray(q)&&q.length===2&&typeof q[0]==='number')J[k]=[q[0]*c-q[1]*sn,q[0]*sn+q[1]*c]}}
  return J;
}

/* ---------- contacts: which points rest on the floor, a seat or a step ---------- */
function contactPts(J,names,view){
  const out=[];
  for(const n of names){
    const [nm,lvl]=Array.isArray(n)?n:[n,0];
    const pts=[];
    if(view==='s'){
      const back=[-J.fr[0],-J.fr[1]];
      if(nm==='feet')pts.push([J.heN,3.5],[J.toN,3],[J.heF,3.5],[J.toF,3],[J.baN,3.5],[J.baF,3.5]);
      else if(nm==='footN')pts.push([J.heN,3.5],[J.toN,3],[J.baN,3.5]);
      else if(nm==='footF')pts.push([J.heF,3.5],[J.toF,3],[J.baF,3.5]);
      else if(nm==='toes')pts.push([J.baN,3.5],[J.baF,3.5],[J.toN,3],[J.toF,3]);
      else if(nm==='heels')pts.push([J.heN,3.5],[J.heF,3.5]);
      else if(nm==='seat')pts.push([J.hip,9]);
      else if(nm==='back')pts.push([add(J.hip,back,9),0],[add(J.chest,back,11),0],[add(J.sh,back,9),0],[J.head,10.5]);
      else if(nm==='front')pts.push([add(J.hip,J.fr,9),0],[add(J.chest,J.fr,12),0],[J.head,10.5]);
      else if(nm==='knees')pts.push([J.knN,7],[J.knF,7]);
      else if(nm==='kneeF')pts.push([J.knF,7]);
      else if(nm==='kneeN')pts.push([J.knN,7]);
      else if(nm==='hands')pts.push([J.haN,3.5],[J.haF,3.5],[J.wrN,4],[J.wrF,4]);
      else if(nm==='elbows')pts.push([J.elN,5],[J.elF,5]);
      else if(nm==='legsBack')pts.push([J.knN,7],[J.knF,7],[J.anN,5],[J.anF,5]);
      else if(nm==='legsFront')pts.push([J.knN,7],[J.knF,7],[J.toN,3],[J.toF,3]);
      else if(nm==='heelsBack')pts.push([J.heN,4],[J.heF,4],[J.anN,5],[J.anF,5]);
      else if(J[nm])pts.push([J[nm],4]);
    }else{
      if(nm==='feet')pts.push([J.anL,5],[J.anR,5]);
      else if(nm==='footL')pts.push([J.anL,5]);
      else if(nm==='footR')pts.push([J.anR,5]);
      else if(nm==='seat')pts.push(J.rotated?[J.hpL,9]:[J.anL,5],J.rotated?[J.hpR,9]:[J.anR,5]);
      else if(nm==='body')['hip','hpL','hpR','shL','shR','head','kneeL','kneeR','anL','anR','knL','knR','elL','elR'].forEach(k=>J[k]&&pts.push([J[k],k==='head'?10:8]));
      else if(J[nm])pts.push([J[nm],5]);
    }
    for(const[pt,r]of pts)out.push({pt,r,l:lvl});
  }
  return out;
}

/* ---------- motion library ----------
   Each motion: v (view), k (key poses), on (contacts), props, hl (highlighted muscles),
   hold (pause at the end pose), z (zoom on a joint), fn (custom pose at phase p). */
const M={};
const def=(name,o)=>{M[name]=o};
const S=(...a)=>Object.assign({},...a);

// neck
def('nRot',{v:'f',k:[{},{hr:-1}],on:['seat'],props:['stool'],hl:['neck'],z:'head',both:true});
def('nFlex',{k:[S(P.sitTall),S(P.sitTall,{H:148})],on:['seat'],props:['chair'],hl:['neck'],z:'head'});
def('nExt',{k:[S(P.sitTall),S(P.sitTall,{H:206})],on:['seat'],props:['chair'],hl:['neck'],z:'head'});
def('nSide',{v:'f',k:[{},{N:24}],on:['seat'],props:['stool'],hl:['neck'],z:'head',both:true});
def('nTuck',{k:[S(P.sitTall),S(P.sitTall,{hx:-5})],on:['seat'],props:['chair'],hl:['neck'],z:'head'});
def('nTuckWall',{k:[{},{hx:-5}],on:['feet'],props:['wallBack'],hl:['neck'],z:'head'});
def('nNod',{k:[S(P.hook),S(P.hook,{H:-104})],on:['back','feet'],props:['mat'],hl:['neck'],z:'head'});
def('nHover',{k:[S(P.hook),S(P.hook,{H:-112})],on:['back','feet'],props:['mat'],hl:['neck'],z:'head',hold:true});
def('nProne',{k:[S(P.proneElb,{H:125}),S(P.proneElb,{H:100})],on:['elbows','legsBack'],props:['mat'],hl:['neck'],z:'head'});
def('nQuad',{k:[S(P.quad,{H:70}),S(P.quad,{H:104})],on:['hands','knees'],props:['mat'],hl:['neck'],z:'head'});
def('nIso',{k:[S(P.sitTall,{uN:120,fN:200}),S(P.sitTall,{uN:122,fN:202})],on:['seat'],props:['chair'],hl:['neck'],pulse:true,z:'head'});
def('nIsoF',{v:'f',k:[{uL:150,fL:205},{uL:150,fL:205,N:2}],on:['seat'],props:['stool'],hl:['neck'],pulse:true,z:'head'});
def('nStretch',{v:'f',k:[{uR:150,fR:230},{N:-26,uR:150,fR:236}],on:['seat'],props:['stool'],hl:['neck'],hold:true,z:'head'});
def('nTrace',{v:'f',fn:p=>({hr:.6*Math.sin(p*2*Math.PI),N:8*Math.sin(p*4*Math.PI)}),on:['seat'],props:['stool'],hl:['neck'],z:'head',cyc:true});
def('nArm',{k:[S(P.sitTall,{hx:-3}),S(P.sitTall,{hx:-3,uN:170,fN:170})],on:['seat'],props:['chair'],hl:['neck','shN']});

// thoracic and trunk mobility
def('tRot',{v:'f',k:[{uL:30,fL:-60,uR:30,fR:-60},{tw:60,hr:-.6,uL:30,fL:-60,uR:30,fR:-60}],on:['seat'],props:['stool'],hl:['chest'],both:true});
def('tRotStand',{v:'f',k:[{uL:30,fL:-60,uR:30,fR:-60},{tw:60,hr:-.6,uL:30,fL:-60,uR:30,fR:-60}],on:['feet'],hl:['chest'],both:true});
def('dowelRot',{v:'f',k:[{uL:90,fL:170,uR:90,fR:170},{tw:60,hr:-.5,uL:90,fL:170,uR:90,fR:170}],on:['feet'],props:['dowelSh'],hl:['chest'],both:true});
def('openBook',{v:'f',k:[{rot:90,uL:90,fL:90,uR:90,fR:90,tL:0,tR:0,lsL:.5,lsR:.5},{rot:90,uL:-80,fL:-80,uR:90,fR:90,tL:0,tR:0,lsL:.5,lsR:.5,hr:.6}],on:['body'],props:['mat'],hl:['chest','shL']});
def('thread',{k:[S(P.quad,{uN:170,fN:170,hN:0,H:130}),S(P.quad,{uN:-40,fN:-50,hN:0,T:100,H:60})],on:['knees',['handF',0]],props:['mat'],hl:['chest']});
def('quadRotHead',{k:[S(P.quad,{uN:130,fN:230,hN:0}),S(P.quad,{uN:175,fN:260,hN:0,H:135})],on:['knees',['handF',0]],props:['mat'],hl:['chest']});
def('tExtChair',{k:[S(P.sitTall,{uN:150,fN:240,uF:146,fF:236}),S(P.sitTall,{T:205,H:215,uN:160,fN:250,uF:156,fF:246})],on:['seat'],props:['chair'],hl:['chest']});
def('tExtFloor',{k:[S(P.hook,{uN:180,fN:180,uF:176,fF:176}),S(P.hook,{uN:250,fN:250,uF:246,fF:246,T:-97,H:-100})],on:['back','feet'],props:['mat','roll'],hl:['chest','shN']});
def('tFlexSit',{k:[S(P.sitTall,{uN:60,fN:110,uF:56,fF:106}),S(P.sitTall,{T:160,H:140,cv:-6,uN:60,fN:110,uF:56,fF:106})],on:['seat'],props:['chair'],hl:['chest']});
def('catCamel',{k:[S(P.quad,{cv:-9,H:80}),S(P.quad,{cv:7,H:125})],on:['hands','knees'],props:['mat'],hl:['chest','abs']});
def('windmill',{v:'f',k:[{rot:90,uL:100,fL:100,uR:100,fR:100,lsL:.5,lsR:.5},{rot:90,uL:200,fL:200,uR:100,fR:100,lsL:.5,lsR:.5},{rot:90,uL:-80,fL:-80,uR:100,fR:100,lsL:.5,lsR:.5,hr:.5}],on:['body'],props:['mat'],hl:['chest','shL']});
def('prayer',{k:[S(P.kneel,{uN:100,fN:200,uF:96,fF:196,T:150}),S(P.kneel,{T:118,H:110,uN:125,fN:215,uF:121,fF:211,tN:-30,tF:-30})],on:['knees','toes'],props:['bench'],hl:['chest','shN'],hold:true});
def('sideBend',{v:'f',k:[{uL:10,uR:10},{T:200,uL:170,fL:175,uR:10,N:8}],on:['seat'],props:['stool'],hl:['abs'],both:true});
def('sideBendStand',{v:'f',k:[{uL:10,uR:10},{T:200,uL:170,fL:175,uR:10,N:8}],on:['feet'],props:['wallSide'],hl:['abs'],both:true});
def('quadSide',{v:'f',k:[{ts:.28,uL:4,uR:4,lsL:1,lsR:1,ssL:.15,ssR:.15,N:0},{ts:.28,T:192,uL:-6,uR:14,tL:-8,tR:12,ssL:.15,ssR:.15,N:10}],on:['handL','handR','knL','knR'],props:['mat'],hl:['abs'],both:true});
def('proneLift',{k:[S(P.prone),S(P.prone,{T:104,H:110,uN:-70,fN:-70,uF:-74,fF:-74})],on:['legsBack',['hip',0]],props:['mat'],hl:['chest']});
def('wallAngel',{v:'f',k:[{uL:80,fL:170,uR:80,fR:170},{uL:150,fL:175,uR:150,fR:175}],on:['feet'],hl:['shL','shR']});
def('diagReach',{v:'f',k:[{uL:-20,fL:-30,uR:5},{tw:40,T:195,uL:150,fL:150,uR:5,hr:.4}],on:['seat'],props:['stool'],hl:['chest','shL'],both:true});

// lumbar and pelvis
def('pTilt',{k:[S(P.hook,{T:-88}),S(P.hook,{T:-94,tN:144,tF:140})],on:['back','feet'],props:['mat'],hl:['abs','glute']});
def('ltr',{v:'f',k:[{rot:-90,lsL:.55,lsR:.55,uL:40,uR:40,fL:40,fR:40},{rot:-90,lsL:.55,lsR:.55,tL:38,tR:-30,uL:40,uR:40,fL:40,fR:40}],on:['body'],props:['mat'],hl:['abs'],both:true});
def('k2c',{k:[S(P.hook),S(P.hook,{tN:212,sN:110,uN:150,fN:200})],on:['back',['footF',0]],props:['mat'],hl:['glute','lowback'],hold:true});
def('k2c2',{k:[S(P.hook),S(P.hook,{tN:212,sN:110,tF:208,sF:112,uN:150,fN:200,uF:146,fF:196})],on:['back'],props:['mat'],hl:['glute','lowback'],hold:true});
def('rockBack',{k:[S(P.quad),S(P.quad,{tN:120,tF:116,sN:-90,sF:-90,T:100,uN:60,fN:80,uF:56,fF:76,hN:30,hF:30})],on:['knees','toes'],props:['mat'],hl:['lowback','glute']});
def('child',{k:[S(P.quad),S(P.quad,{tN:130,tF:126,T:98,H:100,uN:100,fN:100,uF:96,fF:96,hN:0,hF:0})],on:['knees','toes'],props:['mat'],hl:['lowback'],hold:true});
def('proneOnElbows',{k:[S(P.prone),S(P.proneElb)],on:['legsBack',['hip',0]],props:['mat'],hl:['lowback'],hold:true});
def('pressUp',{k:[S(P.prone,{uN:-10,fN:80}),S(P.prone,{T:126,H:140,uN:0,fN:0,uF:-4,fF:-4,hN:90,hF:90})],on:['legsBack',['hip',0]],props:['mat'],hl:['lowback']});
def('standExt',{k:[S({uN:-40,fN:-120,uF:-44,fF:-124}),S({T:204,H:208,uN:-40,fN:-120,uF:-44,fF:-124,tN:4,tF:4})],on:['feet'],hl:['lowback']});
def('sitFlex',{k:[S(P.sit),S(P.sit,{T:118,H:100,uN:20,fN:10,uF:16,fF:6,cv:-8})],on:['seat'],props:['chair'],hl:['lowback'],hold:true});
def('sitRock',{k:[S(P.sitTall,{T:172,cv:-3}),S(P.sitTall,{T:188,cv:3})],on:['seat'],props:['chair'],hl:['lowback','abs']});
def('standTilt',{k:[S({T:176,tN:-4,tF:-4,uN:30,fN:150}),S({T:186,tN:5,tF:5,uN:30,fN:150})],on:['feet'],hl:['abs','glute']});
def('wallTilt',{k:[S({T:176,tN:-4,tF:-4}),S({T:186,tN:5,tF:5})],on:['feet'],props:['wallBack'],hl:['abs','glute']});
def('hinge',{k:[S({uN:-30,fN:-170,uF:30,fF:20}),S({T:108,H:112,tN:-12,sN:6,tF:-12,sF:6,uN:-60,fN:-170,uF:50,fF:10})],on:['feet'],props:['dowelBack'],hl:['lowback','ham']});

// trunk strength
def('brace',{k:[S(P.hook),S(P.hook,{belly:-3})],on:['back','feet'],props:['mat'],hl:['abs'],pulse:true});
def('braceSlide',{k:[S(P.hook),S(P.hook,{tN:95,sN:90,pN:170})],on:['back','feet'],props:['mat'],hl:['abs']});
def('fallout',{v:'f',k:[{rot:-90,lsL:.55,lsR:.55},{rot:-90,lsL:.55,lsR:.55,tL:40}],on:['body'],props:['mat'],hl:['abs'],both:true});
def('supMarch',{k:[S(P.hook),S(P.hook,{tN:180,sN:92,pN:180})],on:['back',['footF',0]],props:['mat'],hl:['abs','hipflex'],alt:true});
def('deadBug',{k:[S(P.tabletop),S(P.tabletop,{uN:258,fN:258,tF:112,sF:112,pF:200})],on:['back'],props:['mat'],hl:['abs'],alt:true});
def('deadBugTap',{k:[S(P.tabletop),S(P.tabletop,{tF:124,sF:40,pF:100})],on:['back'],props:['mat'],hl:['abs'],alt:true});
def('birdDog',{k:[S(P.quad),S(P.quad,{uN:100,fN:100,hN:0,tF:-92,sF:-92,pF:-30,H:100})],on:[['kneeN',0],['handF',0]],props:['mat'],hl:['abs','glute','lowback'],alt:true});
def('birdArm',{k:[S(P.quad),S(P.quad,{uN:100,fN:100,hN:0})],on:['knees',['handF',0]],props:['mat'],hl:['abs','shN'],alt:true});
def('birdLeg',{k:[S(P.quad),S(P.quad,{tF:-92,sF:-92,pF:-30})],on:[['kneeN',0],'hands'],props:['mat'],hl:['abs','glute'],alt:true});
def('birdSlide',{k:[S(P.quad),S(P.quad,{tF:-60,sF:-80,pF:-80})],on:[['kneeN',0],'hands','toes'],props:['mat'],hl:['abs','glute'],alt:true});
def('plankKnee',{k:[S(P.proneElb,{T:100,H:100,tN:-110,sN:-80,tF:-110,sF:-80}),S(P.proneElb,{T:100,H:100,tN:-110,sN:-80,tF:-110,sF:-80,belly:-2})],on:['elbows','knees'],props:['mat'],hl:['abs'],pulse:true});
def('plank',{k:[S(P.proneElb,{T:98,H:100,tN:-82,sN:-82,tF:-82,sF:-82,pN:-10,pF:-10}),S(P.proneElb,{T:98,H:100,tN:-82,sN:-82,tF:-82,sF:-82,pN:-10,pF:-10,belly:-2})],on:['elbows','toes'],props:['mat'],hl:['abs'],pulse:true});
def('sidePlankKnee',{v:'f',k:[{rot:80,uR:-8,fR:80,uL:10,lsL:.6,lsR:.6,tL:-5,tR:-5},{rot:72,uR:-8,fR:80,uL:10,lsL:.6,lsR:.6,tL:-5,tR:-5}],on:['elR','knR'],props:['mat'],hl:['abs']});
def('sidePlank',{v:'f',k:[{rot:84,uR:-10,fR:80,uL:10},{rot:76,uR:-10,fR:80,uL:10}],on:['elR','anR'],props:['mat'],hl:['abs']});
def('pallof',{k:[S({uN:40,fN:120,uF:36,fF:116}),S({uN:90,fN:90,uF:86,fF:86})],on:['feet'],props:['bandSide'],hl:['abs']});
def('pallofKneel',{k:[S(P.halfKneel,{uN:40,fN:120,uF:36,fF:116}),S(P.halfKneel,{uN:90,fN:90,uF:86,fF:86})],on:['footN',['kneeF',0]],props:['bandSide'],hl:['abs']});
def('bridgeAlt',{k:[S(P.bridge),S(P.bridge,{tN:150,sN:110,pN:180})],on:['back',['footF',0]],props:['mat'],hl:['glute','abs'],alt:true});

// shoulder range
def('pendulum',{fn:p=>S(P.stand,{T:118,H:120,uN:16*Math.sin(p*2*Math.PI),fN:16*Math.sin(p*2*Math.PI),uF:96,fF:20,tN:6,tF:-12}),on:['feet'],props:['table'],hl:['shN'],cyc:true});
def('tableSlide',{k:[S(P.sit,{uN:60,fN:86,hN:0}),S(P.sit,{T:140,H:140,uN:120,fN:120,hN:0})],on:['seat'],props:['chair','tableFront'],hl:['shN']});
def('supFlex',{k:[S(P.hook,{uN:180,fN:180,uF:176,fF:176}),S(P.hook,{uN:260,fN:260,uF:256,fF:256})],on:['back','feet'],props:['mat','stickHands'],hl:['shN']});
def('supFlexActive',{k:[S(P.hook),S(P.hook,{uN:255,fN:255})],on:['back','feet'],props:['mat'],hl:['shN']});
def('supStickER',{v:'f',k:[{rot:-90,uL:10,fL:-90,uR:10,fR:-90,fsL:.6,fsR:.6},{rot:-90,uL:10,fL:60,uR:10,fR:-90,fsL:1,fsR:.6}],on:['body'],props:['mat'],hl:['shL']});
def('stickAbd',{v:'f',k:[{uL:10,fL:10,uR:20,fR:40},{uL:150,fL:160,uR:60,fR:120}],on:['feet'],props:['stickFront'],hl:['shL']});
def('pulley',{v:'f',k:[{uL:10,fL:10,uR:150,fR:170},{uL:150,fL:170,uR:20,fR:20}],on:['seat'],props:['stool','pulley'],hl:['shL']});
def('wallWalk',{k:[S({uN:70,fN:80,hN:-10}),S({uN:160,fN:165,hN:0,T:182})],on:['feet'],props:['wallFront'],hl:['shN']});
def('wallWalkSide',{v:'f',k:[{uL:50,fL:60},{uL:150,fL:160,T:178}],on:['feet'],props:['wallR'],hl:['shL']});
def('activeFlex',{k:[S(),S({uN:168,fN:170})],on:['feet'],hl:['shN']});
def('scaption',{v:'f',k:[{},{uL:150,fL:155}],on:['feet'],hl:['shL']});
def('crossBody',{v:'f',k:[{},{uL:-80,fL:-90,uR:40,fR:-60}],on:['feet'],hl:['shL'],hold:true});
def('doorway',{k:[S({uN:-80,fN:180}),S({uN:-100,fN:175,T:172,tN:8,sN:-6})],on:['feet'],props:['door'],hl:['chest'],hold:true});
def('doorwayHigh',{k:[S({uN:-80,fN:120}),S({uN:-100,fN:125,T:172,tN:8,sN:-6})],on:['feet'],props:['door'],hl:['chest'],hold:true});
def('latStretch',{k:[S(P.kneel,{uN:150,fN:150,uF:146,fF:146,T:160}),S(P.kneel,{T:118,H:112,uN:130,fN:130,uF:126,fF:126,tN:-28,tF:-28})],on:['knees','toes'],props:['bench'],hl:['shN','chest'],hold:true});
def('erTable',{v:'f',k:[{uL:40,fL:40},{uL:40,fL:100,T:176}],on:['seat'],props:['stool'],hl:['shL'],hold:true});
def('handBehind',{k:[S({uN:-30,fN:-80}),S({uN:-40,fN:200})],on:['feet'],props:['towel'],hl:['shN'],hold:true});
def('sleeper',{v:'f',k:[{rot:-90,uR:90,fR:180,uL:20,fL:20,lsL:.6,lsR:.6,tL:20,tR:20},{rot:-90,uR:90,fR:100,uL:60,fL:120,lsL:.6,lsR:.6,tL:20,tR:20}],on:['body'],props:['mat'],hl:['shR'],hold:true});
def('walkBack',{k:[S({uN:100,fN:100}),S({T:104,H:110,uN:110,fN:110,tN:-24,sN:-6,tF:-24,sF:-6})],on:['feet'],props:['tableHand'],hl:['shN','chest'],hold:true});

// rotator cuff
def('iso',{v:'f',k:[{uL:10,fL:-60,fsL:.6},{uL:10,fL:-60,fsL:.6,sh:.5}],on:['feet'],props:['wallR'],hl:['shL'],pulse:true});
def('erSide',{v:'f',k:[{uL:6,fL:-10,fsL:.25,uR:6,fR:6},{uL:6,fL:80,fsL:1,uR:6,fR:6}],on:['feet'],props:['bandAnchorR'],hl:['shL']});
def('irSide',{v:'f',k:[{uL:6,fL:80,uR:6,fR:6},{uL:6,fL:-80,fsL:.9,uR:6,fR:6}],on:['feet'],props:['bandAnchorL'],hl:['shL','chest']});
def('erLying',{v:'f',k:[{rot:-90,uL:6,fL:-80,lsL:.6,lsR:.6,tL:20,tR:20},{rot:-90,uL:6,fL:40,lsL:.6,lsR:.6,tL:20,tR:20}],on:['body'],props:['mat'],hl:['shL']});
def('erProne',{k:[S(P.prone,{uN:0,fN:90}),S(P.prone,{uN:0,fN:170})],on:['legsBack',['hip',0]],props:['bench'],hl:['shN']});
def('er90',{v:'f',k:[{uL:90,fL:90,fsL:.25},{uL:90,fL:180,fsL:1}],on:['feet'],props:['bandAnchorR'],hl:['shL']});
def('ir90',{v:'f',k:[{uL:90,fL:180},{uL:90,fL:90,fsL:.25}],on:['feet'],props:['bandAnchorR'],hl:['shL','chest']});
def('frontRaise',{k:[S(),S({uN:92,fN:92})],on:['feet'],props:['dumbbellN'],hl:['shN']});
def('sideRaise',{v:'f',k:[{uL:6,uR:6},{uL:88,fL:88,uR:88,fR:88}],on:['feet'],props:['dumbbells'],hl:['shL','shR']});
def('scapRaise',{v:'f',k:[{uL:6,uR:6},{uL:80,fL:80,uR:80,fR:80,tw:0}],on:['feet'],props:['dumbbells'],hl:['shL','shR']});
def('bandExt',{k:[S({uN:40,fN:40}),S({uN:-40,fN:-40})],on:['feet'],props:['bandFront'],hl:['shN','back']});
def('diagFlex',{v:'f',k:[{uL:-30,fL:-30},{uL:150,fL:150}],on:['feet'],props:['bandAnchorRLow'],hl:['shL']});
def('diagExt',{v:'f',k:[{uL:150,fL:150},{uL:-30,fL:-30}],on:['feet'],props:['bandAnchorLHigh'],hl:['shL','back']});
def('landmine',{k:[S(P.halfKneel,{uN:30,fN:160}),S(P.halfKneel,{uN:135,fN:135})],on:['footN',['kneeF',0]],props:['bar'],hl:['shN']});
def('ohp',{v:'f',k:[{uL:85,fL:180,uR:85,fR:180},{uL:170,fL:172,uR:170,fR:172}],on:['feet'],props:['dumbbells'],hl:['shL','shR']});

// scapula
def('scapSet',{v:'f',k:[{sh:0},{sh:-3,sw:.92}],on:['seat'],props:['stool'],hl:['back'],pulse:true});
def('scapClock',{k:[S({uN:140,fN:150}),S({uN:150,fN:160,pr:3})],on:['feet'],props:['wallFront'],hl:['back'],cyc:true});
def('serratusSup',{k:[S(P.hook,{uN:180,fN:180}),S(P.hook,{uN:180,fN:180,pr:6})],on:['back','feet'],props:['mat'],hl:['back','chest']});
def('serratusBand',{k:[S({uN:90,fN:90}),S({uN:90,fN:90,pr:6})],on:['feet'],props:['bandBack'],hl:['back','chest']});
def('wallSlide',{k:[S({uN:80,fN:170,hN:0}),S({uN:150,fN:175,hN:0})],on:['feet'],props:['wallFront'],hl:['shN','back']});
def('wallPush',{k:[S({T:164,H:166,uN:90,fN:90,hN:-90,uF:86,fF:86,hF:-90}),S({T:164,H:166,uN:50,fN:120,hN:-120,uF:46,fF:116,hF:-116})],on:['feet'],props:['wallFront'],hl:['chest','back']});
def('counterPush',{k:[S({T:140,H:142,uN:80,fN:80,hN:-80,uF:76,fF:76,hF:-76,tN:-6,sN:-6,tF:-6,sF:-6}),S({T:140,H:142,uN:40,fN:110,hN:-110,uF:36,fF:106,hF:-106,tN:-6,sN:-6,tF:-6,sF:-6})],on:['feet'],props:['tableFront'],hl:['chest','back']});
def('quadPush',{k:[S(P.quad,{cv:2}),S(P.quad,{cv:-6,pr:4})],on:['hands','knees'],props:['mat'],hl:['back','chest']});
def('floorPush',{k:[S(P.quad,{T:100,tN:-60,tF:-60,sN:-90,sF:-90}),S(P.quad,{T:98,tN:-60,tF:-60,sN:-90,sF:-90,uN:-40,fN:30,uF:-44,fF:26})],on:['hands','knees'],props:['mat'],hl:['chest','back']});
def('row',{k:[S({uN:60,fN:80}),S({uN:-30,fN:80})],on:['feet'],props:['bandFront'],hl:['back']});
def('proneRow',{k:[S(P.prone,{uN:0,fN:0}),S(P.prone,{uN:-70,fN:0})],on:['legsBack',['hip',0]],props:['bench','dumbbellN'],hl:['back']});
def('proneTYW',{k:[S(P.prone,{uN:0,fN:0}),S(P.prone,{uN:110,fN:110,H:96})],on:['legsBack',['hip',0]],props:['bench'],hl:['back','shN']});
def('liftOff',{k:[S({uN:-30,fN:-110}),S({uN:-40,fN:-90})],on:['feet'],props:['wallBack'],hl:['back'],pulse:true});
def('ballCircles',{fn:p=>S({uN:95+6*Math.sin(p*2*Math.PI),fN:95+6*Math.sin(p*2*Math.PI),hN:-90}),on:['feet'],props:['wallFront','ballHand'],hl:['shN','back'],cyc:true});
def('quadShift',{v:'f',k:[{ts:.28,ssL:.15,ssR:.15},{ts:.28,T:186,uL:-8,uR:14,ssL:.15,ssR:.15}],on:['handL','handR','knL','knR'],props:['mat'],hl:['shL','shR'],both:true});
def('shTap',{k:[S(P.quad),S(P.quad,{uN:60,fN:170,hN:0})],on:['knees',['handF',0]],props:['mat'],hl:['abs','shN'],alt:true});
def('ballPlank',{k:[S(P.proneElb,{T:100,H:100,tN:-82,sN:-82,tF:-82,sF:-82,pN:-10,pF:-10}),S(P.proneElb,{T:100,H:100,tN:-82,sN:-82,tF:-82,sF:-82,pN:-10,pF:-10,uN:30,fN:110,uF:26,fF:106})],on:['toes'],props:['ballElbows'],hl:['abs','shN']});

// elbow and forearm
def('elbowFlex',{k:[S(),S({fN:150})],on:['feet'],hl:['bicep']});
def('elbowExt',{k:[S({fN:150}),S()],on:['feet'],hl:['tricep']});
def('elbowAssist',{k:[S(P.sitTall,{uN:20,fN:30,uF:40,fF:110}),S(P.sitTall,{uN:20,fN:150,uF:40,fF:150})],on:['seat'],props:['chair'],hl:['bicep']});
def('pronSup',{k:[S(P.sitTall,{uN:6,fN:90,hN:0,lv:-80}),S(P.sitTall,{uN:6,fN:90,hN:0,lv:80})],on:['seat'],props:['chair','lever'],hl:['forearm']});
def('elbowIso',{k:[S(P.sitTall,{uN:6,fN:90,hN:0}),S(P.sitTall,{uN:6,fN:90,hN:0,sh:-.4})],on:['seat'],props:['chair'],hl:['bicep'],pulse:true});
def('curl',{k:[S(),S({fN:150})],on:['feet'],props:['dumbbellN'],hl:['bicep']});
def('curlSlow',{k:[S(),S({fN:150})],on:['feet'],props:['dumbbellN'],hl:['bicep'],slow:true});
def('pressDown',{k:[S({uN:-6,fN:110}),S({uN:-6,fN:0})],on:['feet'],props:['bandHigh'],hl:['tricep']});
def('supTri',{k:[S(P.hook,{uN:180,fN:270}),S(P.hook,{uN:180,fN:180})],on:['back','feet'],props:['mat','dumbbellN'],hl:['tricep']});

// wrist (side view of a seated arm resting on a table, zoomed)
def('wristFE',{k:[S(P.sit,{uN:30,fN:90,hN:-60}),S(P.sit,{uN:30,fN:90,hN:60})],on:['seat'],props:['chair','tableFront'],hl:['forearm'],z:'wrN'});
def('wristFlex',{k:[S(P.sit,{uN:30,fN:90,hN:0}),S(P.sit,{uN:30,fN:90,hN:70})],on:['seat'],props:['chair','tableFront'],hl:['forearm'],z:'wrN'});
def('wristExt',{k:[S(P.sit,{uN:30,fN:90,hN:0}),S(P.sit,{uN:30,fN:90,hN:-70})],on:['seat'],props:['chair','tableFront'],hl:['forearm'],z:'wrN'});
def('wristW',{k:[S(P.sit,{uN:30,fN:90,hN:0}),S(P.sit,{uN:30,fN:90,hN:-60})],on:['seat'],props:['chair','tableFront','dumbbellN'],hl:['forearm'],z:'wrN'});
def('wristWF',{k:[S(P.sit,{uN:30,fN:90,hN:0}),S(P.sit,{uN:30,fN:90,hN:60})],on:['seat'],props:['chair','tableFront','dumbbellN'],hl:['forearm'],z:'wrN'});
def('wristIso',{k:[S(P.sit,{uN:30,fN:90,hN:0}),S(P.sit,{uN:30,fN:90,hN:-4})],on:['seat'],props:['chair','tableFront'],hl:['forearm'],pulse:true,z:'wrN'});
def('wristCirc',{fn:p=>S(P.sit,{uN:30,fN:90,hN:40*Math.sin(p*2*Math.PI)}),on:['seat'],props:['chair','tableFront'],hl:['forearm'],z:'wrN',cyc:true});
def('wristStretch',{k:[S({uN:90,fN:90,hN:0}),S({uN:90,fN:90,hN:-80})],on:['feet'],hl:['forearm'],hold:true,z:'wrN'});
def('wristLoad',{k:[S({T:170,uN:40,fN:40,hN:50}),S({T:160,uN:30,fN:30,hN:60})],on:['feet'],props:['tableFront'],hl:['forearm'],z:'wrN'});
def('quadWrist',{k:[S(P.quad),S(P.quad,{uN:24,fN:24,uF:20,fF:20,T:100})],on:['hands','knees'],props:['mat'],hl:['forearm'],z:'wrN'});

// hip range
def('hipCirc',{v:'f',fn:p=>({tL:10+10*Math.sin(p*2*Math.PI),lsL:1-.18*(1+Math.cos(p*2*Math.PI))/2,uR:30,fR:30}),on:['footR'],props:['railR'],hl:['glute'],cyc:true});
def('hipFlexSup',{k:[S(P.supine),S(P.supine,{tN:200,sN:120,pN:170,uN:150,fN:210})],on:['back',['footF',0]],props:['mat'],hl:['glute']});
def('abdSlide',{v:'f',k:[{rot:-90},{rot:-90,tL:36}],on:['body'],props:['mat'],hl:['glute'],both:true});
def('logRoll',{v:'f',k:[{rot:-90,pL:-40},{rot:-90,pL:40}],on:['body'],props:['mat'],hl:['glute'],z:'anL'});
def('hipRotHook',{v:'f',k:[{rot:-90,lsL:.55,lsR:.55},{rot:-90,lsL:.55,lsR:.55,tL:-24}],on:['body'],props:['mat'],hl:['glute']});
def('hipRotSit',{v:'f',k:[S(FP.sit),S(FP.sit,{sL:-34})],on:['seat'],props:['stool'],hl:['glute']});
def('hipRotSitE',{v:'f',k:[S(FP.sit),S(FP.sit,{sL:34})],on:['seat'],props:['stool'],hl:['glute']});
def('hipFlexorKneel',{k:[S(P.halfKneel),S(P.halfKneel,{tN:110,sN:24,tF:-26,T:184})],on:['footN',['kneeF',0]],props:['mat'],hl:['hipflex'],hold:true});
def('hipFlexorStand',{k:[S({tN:22,sN:4,tF:-22,sF:-26,pF:60}),S({tN:34,sN:-10,tF:-28,sF:-30,pF:60,T:182})],on:['feet'],hl:['hipflex'],hold:true});
def('thomas',{k:[S(P.supine,{tN:212,sN:110,uN:150,fN:200,tF:80,sF:20}),S(P.supine,{tN:216,sN:108,uN:150,fN:200,tF:86,sF:10})],on:['back'],props:['bed'],hl:['hipflex'],hold:true});
def('fig4',{k:[S(P.hook,{tN:150,sN:170,pN:200}),S(P.hook,{tN:175,sN:190,pN:210,tF:165,sF:80,uN:150,fN:200})],on:['back',['footF',0]],props:['mat'],hl:['glute'],hold:true});
def('fig4Sit',{k:[S(P.sitTall,{tN:110,sN:80,pN:170}),S(P.sitTall,{T:150,H:140,tN:110,sN:80,pN:170})],on:['seat'],props:['chair'],hl:['glute'],hold:true});
def('butterfly',{v:'f',k:[{rot:0,tL:70,sL:-40,tR:70,sR:-40,lsL:.6,lsR:.6,uL:20,fL:-20,uR:20,fR:-20},{tL:82,sL:-50,tR:82,sR:-50,lsL:.6,lsR:.6,uL:20,fL:-20,uR:20,fR:-20,T:176}],on:['seat'],props:['mat'],hl:['adductor'],hold:true});
def('sideLunge',{v:'f',k:[{tL:24,tR:24,sL:24,sR:24},{tL:40,sL:-4,lsL:.75,tR:24,sR:24,T:174,uL:20,fL:-30,uR:20,fR:-30}],on:['feet'],hl:['adductor','quad'],both:true});
def('ham',{k:[S(P.supine),S(P.supine,{tN:168,sN:168,pN:250,uN:150,fN:150})],on:['back',['footF',0]],props:['mat','strap'],hl:['ham'],hold:true});
def('hamSit',{k:[S(P.sitTall,{tN:90,sN:60,pN:150}),S(P.sitTall,{T:140,H:135,tN:90,sN:60,pN:150,uN:60,fN:80})],on:['seat'],props:['chair'],hl:['ham'],hold:true});
def('wipers',{v:'f',fn:p=>({rot:-90,lsL:.55,lsR:.55,tL:30*Math.sin(p*2*Math.PI),tR:-30*Math.sin(p*2*Math.PI)}),on:['body'],props:['mat'],hl:['glute'],cyc:true});

// hip strength
def('squeeze',{k:[S(P.hook),S(P.hook,{tN:142})],on:['back','feet'],props:['mat'],hl:['glute'],pulse:true});
def('adductSqueeze',{k:[S(P.hook),S(P.hook,{tN:142})],on:['back','feet'],props:['mat','ballKnees'],hl:['adductor'],pulse:true});
def('bridge',{k:[S(P.hook),S(P.bridge)],on:['back','feet'],props:['mat'],hl:['glute','ham']});
def('bridgeBand',{k:[S(P.hook),S(P.bridge)],on:['back','feet'],props:['mat','bandKnees'],hl:['glute']});
def('slBridge',{k:[S(P.hook,{tN:118,sN:118,pN:180}),S(P.bridge,{tN:118,sN:118,pN:180})],on:['back',['footF',0]],props:['mat'],hl:['glute','ham']});
def('sideAbd',{v:'f',k:[{rot:-90},{rot:-90,tL:36}],on:['body'],props:['mat'],hl:['glute']});
def('clam',{v:'f',k:[{rot:-90,lsL:.55,lsR:.55,tL:4,sL:-50,tR:4,sR:-50},{rot:-90,lsL:.55,lsR:.55,tL:40,sL:-20,tR:4,sR:-50}],on:['body'],props:['mat'],hl:['glute']});
def('revClam',{v:'f',k:[{rot:-90,lsL:.55,lsR:.55,tL:4,sL:-50,tR:4,sR:-50},{rot:-90,lsL:.55,lsR:.55,tL:4,sL:20,tR:4,sR:-50}],on:['body'],props:['mat'],hl:['glute']});
def('sideAdd',{v:'f',k:[{rot:-90,tL:30,sL:30,lsL:.6},{rot:-90,tL:30,sL:30,lsL:.6,tR:-18}],on:['body'],props:['mat'],hl:['adductor']});
def('proneHipExt',{k:[S(P.prone),S(P.prone,{tN:-112,sN:-112})],on:['front',['kneeF',0]],props:['mat'],hl:['glute','ham']});
def('proneHipExtBent',{k:[S(P.prone,{sN:180}),S(P.prone,{tN:-114,sN:166})],on:['front',['kneeF',0]],props:['mat'],hl:['glute']});
def('bandHipExt',{k:[S({uN:30,fN:60}),S({tN:-28,sN:-28,uN:30,fN:60})],on:['footF'],props:['bandFrontLow','tableHand'],hl:['glute']});
def('bandHipAbd',{v:'f',k:[{uR:30,fR:30},{tL:30,uR:30,fR:30}],on:['footR'],props:['bandAnkles','railR'],hl:['glute']});
def('bandHipAdd',{v:'f',k:[{tL:26,uR:30,fR:30},{tL:-8,uR:30,fR:30}],on:['footR'],props:['bandAnchorLLow','railR'],hl:['adductor']});
def('seatedHipFlex',{k:[S(P.sitTall),S(P.sitTall,{tN:116,sN:18})],on:['seat'],props:['chair','bandKnee'],hl:['hipflex']});
def('bandWalk',{v:'f',fn:p=>{const a=Math.sin(p*2*Math.PI);return{tL:14+10*Math.max(0,a),tR:14+10*Math.max(0,-a),sL:6,sR:6,T:178,uL:20,fL:-40,uR:20,fR:-40,X:22*p}},on:['feet'],props:['bandAnkles'],hl:['glute'],cyc:true,ax:'hip'});
def('hipHike',{v:'f',k:[{pt:-4,tL:2,lsL:.92},{pt:4,tL:2,lsL:.92}],on:['footR'],props:['stepR','railL'],hl:['glute']});
def('rdl',{k:[S({uN:4,fN:4}),S({T:98,H:104,tN:-6,sN:4,tF:-82,sF:-82,pF:-10,uN:80,fN:80,uF:80,fF:80})],on:['footN'],props:['dumbbellN'],hl:['ham','glute']});

// knee range and activation
def('heelSlide',{k:[S(P.supine),S(P.hook,{tN:150,sN:36,tF:90,sF:90,pF:180})],on:['back',['heels',0]],props:['mat'],hl:['quad','ham']});
def('sitKneeFlex',{k:[S(P.sit),S(P.sit,{sN:-34,pN:70})],on:['seat'],props:['chair'],hl:['ham']});
def('wallKnee',{k:[S(P.supine,{tN:160,sN:160,pN:250,tF:160,sF:160,pF:250}),S(P.supine,{tN:190,sN:110,pN:200,tF:186,sF:112,pF:202})],on:['back'],props:['mat','wallLegs'],hl:['quad']});
def('kneeExtHold',{k:[S(P.sit,{sN:60}),S(P.sit,{sN:88,pN:170})],on:['seat'],props:['chair'],hl:['quad'],hold:true});
def('heelProp',{k:[S(P.sitLong,{sN:96}),S(P.sitLong,{sN:90})],on:['seat'],props:['mat','roll2'],hl:['quad'],hold:true});
def('proneHang',{k:[S(P.prone,{tN:-90,sN:-80}),S(P.prone,{tN:-90,sN:-92})],on:['front'],props:['bed'],hl:['quad'],hold:true});
def('quadSet',{k:[S(P.sitLong),S(P.sitLong,{sN:93,pN:175})],on:['seat'],props:['mat'],hl:['quad'],pulse:true});
def('shortArc',{k:[S(P.supine,{tN:104,sN:62}),S(P.supine,{tN:104,sN:100,pN:170})],on:['back',['footF',0]],props:['mat','rollKnee'],hl:['quad']});
def('longArc',{k:[S(P.sit),S(P.sit,{sN:88,pN:170})],on:['seat'],props:['chair'],hl:['quad']});
def('slr',{k:[S(P.hook,{tN:90,sN:90,pN:180}),S(P.hook,{tN:130,sN:130,pN:220})],on:['back',['footF',0]],props:['mat'],hl:['quad','hipflex']});
def('heelDig',{k:[S(P.sit,{sN:30}),S(P.sit,{sN:30,tN:88})],on:['seat'],props:['chair'],hl:['ham'],pulse:true});
def('proneKneeFlex',{k:[S(P.prone),S(P.prone,{sN:-178})],on:['front',['kneeF',0]],props:['mat'],hl:['ham']});
def('standKneeFlex',{k:[S({uN:40,fN:60}),S({uN:40,fN:60,tN:-6,sN:-120,pN:-40})],on:['footF'],props:['chairFront'],hl:['ham']});
def('sitAlt',{k:[S(P.sit),S(P.sit,{sN:70,pN:150})],on:['seat'],props:['chair'],hl:['quad'],alt:true});
def('bike',{fn:p=>{const a=p*2*Math.PI;return S(P.sit,{T:178,tN:84+12*Math.sin(a),sN:-6+30*Math.cos(a),tF:84-12*Math.sin(a),sF:-6-30*Math.cos(a)})},on:['seat'],props:['bike'],hl:['quad'],cyc:true});
def('stoolRock',{k:[S({tN:70,sN:-10,pN:90}),S({tN:84,sN:-24,pN:90,T:170})],on:['footF'],props:['stoolLow'],hl:['quad']});
def('tkeBand',{k:[S({tN:12,sN:-14}),S()],on:['feet'],props:['bandKnee'],hl:['quad']});

// knee and thigh strength
def('chairSquat',{k:[S({uN:60,fN:80,uF:56,fF:76}),S(P.squat,{tN:88,tF:84,sN:-18,sF:-20,T:146})],on:['feet'],props:['chairBack'],hl:['quad','glute']});
def('wallSquat',{k:[S(),S({tN:40,sN:-22,tF:38,sF:-24})],on:['feet'],props:['wallBack'],hl:['quad']});
def('squat',{k:[S({uN:20,fN:20,uF:16,fF:16}),S(P.squat)],on:['feet'],hl:['quad','glute']});
def('goblet',{k:[S({uN:20,fN:160,uF:16,fF:156}),S(P.squat,{uN:30,fN:170,uF:26,fF:166})],on:['feet'],props:['kb'],hl:['quad','glute']});
def('splitSquat',{k:[S({tN:22,sN:0,tF:-22,sF:-22,pF:60}),S({tN:84,sN:-4,tF:-6,sF:-88,pF:-40})],on:['footN',['toF',0]],hl:['quad','glute']});
def('revLunge',{k:[S(),S({tN:84,sN:-4,tF:-6,sF:-88,pF:-40})],on:['footN',['toF',0]],hl:['quad','glute']});
def('stepUp',{k:[S({tN:66,sN:-30,pN:90}),S()],on:[['footN',18],['footF',0]],props:['step'],hl:['quad','glute']});
def('stepUpSide',{v:'f',k:[{tL:30,sL:-4,lsL:.82,T:186},{tL:6,sL:6}],on:[['footL',18],['footR',0]],props:['stepL'],hl:['quad','glute']});
def('stepDown',{k:[S(),S({tN:30,sN:-30,tF:20,sF:10})],on:[['footN',18],['footF',0]],props:['stepBack'],hl:['quad']});
def('stepDownSide',{v:'f',k:[{},{tL:8,sL:-8,lsL:.8,tR:14,sR:14}],on:[['footL',18],['footR',0]],props:['stepL'],hl:['quad']});
def('legPress',{k:[S({T:-130,H:-130,tN:150,sN:30,pN:120,tF:146,sF:32,pF:120,uN:30,fN:60}),S({T:-130,H:-130,tN:112,sN:100,pN:180,tF:110,sF:100,pF:180,uN:30,fN:60})],on:['back'],props:['press'],hl:['quad']});
def('kneeExtBand',{k:[S(P.sit),S(P.sit,{sN:88,pN:170})],on:['seat'],props:['chair','bandAnkle'],hl:['quad']});
def('standCurlBand',{k:[S({uN:40,fN:60}),S({uN:40,fN:60,tN:-6,sN:-120,pN:-40})],on:['footF'],props:['chairFront','bandAnkleFront'],hl:['ham']});
def('proneCurl',{k:[S(P.prone),S(P.prone,{sN:-178})],on:['front',['kneeF',0]],props:['mat','bandAnkleBack'],hl:['ham']});
def('sitCurl',{k:[S(P.sit,{sN:40}),S(P.sit,{sN:-20})],on:['seat'],props:['chair','bandAnkleFront'],hl:['ham']});
def('sliderCurl',{k:[S(P.bridge),S(P.bridge,{T:-80,tN:92,sN:90,pN:180,tF:90,sF:88,pF:180})],on:['back',['heels',0]],props:['mat'],hl:['ham','glute']});
def('nordic',{k:[S(P.kneel,{uN:30,fN:60,uF:26,fF:56}),S(P.kneel,{T:140,H:140,tN:-40,tF:-40,uN:70,fN:80,uF:66,fF:76})],on:['knees','toes'],props:['mat','strapAnkles'],hl:['ham'],slow:true});
def('spanish',{k:[S(P.squat,{T:170,tN:70,sN:-6,tF:68,sF:-8,uN:60,fN:80}),S(P.squat,{T:170,tN:74,sN:-8,tF:72,sF:-10,uN:60,fN:80})],on:['feet'],props:['strapKnees'],hl:['quad'],pulse:true});

// ankle and foot
def('pumps',{k:[S(P.sitLong,{pN:150,pF:150}),S(P.sitLong,{pN:210,pF:210})],on:['seat'],props:['mat'],hl:['calf'],z:'anN'});
def('ankleCirc',{fn:p=>S(P.sitLong,{pN:180+30*Math.sin(p*2*Math.PI),kN:10*Math.cos(p*2*Math.PI)}),on:['seat'],props:['mat'],hl:['calf'],z:'anN',cyc:true});
def('invEv',{v:'f',k:[S(FP.sit,{pL:-30}),S(FP.sit,{pL:30})],on:['seat'],props:['stool'],hl:['calf'],z:'anL'});
def('strapDF',{k:[S(P.sitLong,{pN:170,uN:60,fN:80}),S(P.sitLong,{pN:212,uN:50,fN:70})],on:['seat'],props:['mat','strap'],hl:['calf'],z:'anN',hold:true});
def('pfStretch',{k:[S(P.sit),S(P.sit,{tN:94,sN:-30,pN:-10})],on:['seat'],props:['chair'],hl:['shin'],z:'anN',hold:true});
def('calfWall',{k:[S({T:170,uN:90,fN:90,hN:-90,uF:86,fF:86,hF:-90,tN:16,sN:-4,tF:-24,sF:-24}),S({T:164,uN:80,fN:80,hN:-90,uF:76,fF:76,hF:-90,tN:30,sN:-12,tF:-28,sF:-28})],on:['feet'],props:['wallFront'],hl:['calf'],hold:true});
def('calfWallBent',{k:[S({T:170,uN:90,fN:90,hN:-90,uF:86,fF:86,hF:-90,tN:16,sN:-4,tF:-14,sF:-24}),S({T:166,uN:84,fN:84,hN:-90,uF:80,fF:80,hF:-90,tN:30,sN:-20,tF:6,sF:-28})],on:['feet'],props:['wallFront'],hl:['calf'],hold:true});
def('kneeWall',{k:[S({T:172,uN:90,fN:90,hN:-90,tN:30,sN:0,tF:-20,sF:-20}),S({T:170,uN:80,fN:80,hN:-90,tN:44,sN:-22,tF:-24,sF:-24})],on:['feet'],props:['wallFront'],hl:['calf'],z:'anN'});
def('sitAnkleRock',{k:[S(P.sit),S(P.sit,{sN:-24})],on:['seat'],props:['chair'],hl:['calf'],z:'anN'});
def('kneelAnkleRock',{k:[S(P.halfKneel),S(P.halfKneel,{tN:110,sN:-22,T:178})],on:['footN',['kneeF',0]],props:['mat'],hl:['calf'],z:'anN'});
def('forefootRock',{k:[S({uN:40,fN:60}),S({uN:40,fN:60,pN:66,pF:66,tN:-2,tF:-2,kN:24,kF:24})],on:['toes'],props:['chairFront'],hl:['calf'],z:'anN'});
def('toeExt',{k:[S(P.sit),S(P.sit,{kN:-50})],on:['seat'],props:['chair'],hl:['footN'],z:'baN',hold:true});
def('toeFlex',{k:[S(P.sit),S(P.sit,{kN:50})],on:['seat'],props:['chair'],hl:['footN'],z:'baN',hold:true});
def('toeCurl',{k:[S(P.sit),S(P.sit,{kN:45})],on:['seat'],props:['chair'],hl:['footN'],z:'baN'});
def('toeSpread',{v:'f',k:[S(FP.sit),S(FP.sit,{pL:12,pR:12})],on:['seat'],props:['stool'],hl:['footN'],z:'anL',pulse:true});
def('plantar',{k:[S(P.sit,{tN:116,sN:70,pN:170,uN:60,fN:90}),S(P.sit,{tN:116,sN:70,pN:170,kN:-55,uN:60,fN:90})],on:['seat'],props:['chair'],hl:['footN'],z:'anN',hold:true});
def('bandDF',{k:[S(P.sitLong,{pN:160}),S(P.sitLong,{pN:212})],on:['seat'],props:['mat','bandFoot'],hl:['shin'],z:'anN'});
def('bandPF',{k:[S(P.sitLong,{pN:200}),S(P.sitLong,{pN:140})],on:['seat'],props:['mat','strap'],hl:['calf'],z:'anN'});
def('ankleIso',{k:[S(P.sit),S(P.sit,{pN:88})],on:['seat'],props:['chair','wallFoot'],hl:['calf','shin'],z:'anN',pulse:true});
def('seatHeel',{k:[S(P.sit),S(P.sit,{tN:100,tF:98,pN:56,pF:56,sN:4,sF:4})],on:['seat'],props:['chair'],hl:['calf'],z:'anN'});
def('seatHeelW',{k:[S(P.sit),S(P.sit,{tN:100,tF:98,pN:56,pF:56,sN:4,sF:4})],on:['seat'],props:['chair','weightKnee'],hl:['calf'],z:'anN'});
def('heelRaise',{k:[S({uN:40,fN:60}),S({uN:40,fN:60,pN:52,pF:52,kN:38,kF:38})],on:['toes'],props:['chairFront'],hl:['calf']});
def('heelRaiseSL',{k:[S({uN:40,fN:60,tF:20,sF:-60}),S({uN:40,fN:60,pN:52,kN:38,tF:20,sF:-60})],on:['footN'],props:['chairFront'],hl:['calf']});
def('heelRaiseBent',{k:[S({uN:40,fN:60,tN:22,sN:-14,tF:22,sF:-14}),S({uN:40,fN:60,tN:22,sN:-14,tF:22,sF:-14,pN:52,pF:52,kN:38,kF:38})],on:['toes'],props:['chairFront'],hl:['calf']});
def('eccHeel',{k:[S({pN:50,pF:50,kN:40,kF:40,uN:40,fN:60}),S({pN:118,pF:118,kN:-28,kF:-28,uN:40,fN:60})],on:[['toes',18]],props:['stepUnder','railFront'],hl:['calf'],slow:true});
def('toeRaise',{k:[S({T:178}),S({T:178,pN:118,pF:118})],on:['heels'],props:['wallBack'],hl:['shin']});
def('shortFoot',{k:[S(P.sit),S(P.sit,{kN:10})],on:['seat'],props:['chair'],hl:['footN'],z:'baN',pulse:true});
def('towel',{k:[S(P.sit),S(P.sit,{kN:50})],on:['seat'],props:['chair','towelFloor'],hl:['footN'],z:'baN'});
def('marble',{k:[S(P.sit),S(P.sit,{kN:50,tN:94})],on:['seat'],props:['chair','marbles'],hl:['footN'],z:'baN'});

// balance
const sway=(amp,o)=>p=>S(o||{},{T:180+amp*Math.sin(p*2*Math.PI),tN:-amp*Math.sin(p*2*Math.PI)*.7,tF:-amp*Math.sin(p*2*Math.PI)*.7});
const swayF=(amp,o)=>p=>S(o||{},{T:180+amp*Math.sin(p*2*Math.PI),tL:4-amp*Math.sin(p*2*Math.PI),tR:4+amp*Math.sin(p*2*Math.PI)});
def('stanceSupp',{v:'f',fn:swayF(2,{tL:1,tR:1,uR:30,fR:30}),on:['feet'],props:['railR'],hl:['calf'],cyc:true});
def('stance',{v:'f',fn:swayF(2.5,{tL:1,tR:1}),on:['feet'],hl:['calf'],cyc:true});
def('stanceTandem',{fn:sway(2.5,{tN:6,tF:-6}),on:['feet'],hl:['calf'],cyc:true});
def('stanceTandemHead',{v:'f',fn:p=>S({tL:1,tR:1,hr:Math.sin(p*2*Math.PI)*.8}),on:['feet'],hl:['calf'],cyc:true});
def('singleLegSupp',{fn:sway(2,{uN:40,fN:60,tF:30,sF:-40}),on:['footN'],props:['chairFront'],hl:['glute','calf'],cyc:true});
def('singleLeg',{fn:sway(3,{uN:20,fN:30,tF:30,sF:-40}),on:['footN'],hl:['glute','calf'],cyc:true});
def('singleLegBall',{fn:sway(3,{uN:60,fN:110,uF:56,fF:106,tF:30,sF:-40}),on:['footN'],props:['ballHands'],hl:['glute','calf'],cyc:true});
def('splitBal',{fn:sway(2.5,{tN:16,sN:0,tF:-16,sF:-16,pF:70}),on:['feet'],hl:['calf'],cyc:true});
def('shiftFB',{fn:sway(6),on:['feet'],hl:['calf'],cyc:true});
def('shiftLat',{v:'f',fn:swayF(7),on:['feet'],hl:['glute'],cyc:true});
def('headTurns',{v:'f',fn:p=>S({hr:Math.sin(p*2*Math.PI)*.9}),on:['feet'],hl:['neck'],cyc:true});
def('headNods',{fn:p=>S({H:180-22*Math.sin(p*2*Math.PI)}),on:['feet'],hl:['neck'],cyc:true});
def('armReachStand',{k:[S(),S({uN:100,fN:100,T:168})],on:['feet'],hl:['abs']});
def('eyesClosed',{v:'f',fn:swayF(2,{tL:1,tR:1,eyes:1}),on:['feet'],hl:['calf'],cyc:true});
def('foam',{v:'f',fn:swayF(3),on:[['feet',8]],props:['foam'],hl:['calf'],cyc:true});
def('perturb',{fn:p=>{const a=Math.sin(p*2*Math.PI)*(p<.15?6:2);return S({T:180+a,tN:-a,tF:-a,uN:20,fN:30})},on:['feet'],props:['pushHand'],hl:['calf','glute'],cyc:true});
def('board',{v:'f',fn:p=>S({rot:4*Math.sin(p*2*Math.PI),tL:8,tR:8,uL:40,uR:40,fL:40,fR:40}),on:[['feet',10]],props:['board'],hl:['calf'],cyc:true});

// dynamic balance
def('stepFwd',{k:[S(),S({tN:30,sN:-2,tF:-10,sF:-14,T:178})],on:['footF','footN'],hl:['quad']});
def('stepBack',{k:[S(),S({tF:-32,sF:-30,pF:60,tN:6,sN:2})],on:['footN','footF'],hl:['glute']});
def('stepSide',{v:'f',k:[{},{tL:24,sL:16,tR:4}],on:['footR','footL'],hl:['glute']});
def('stepTap',{k:[S(),S({tN:34,sN:10,pN:110})],on:['footF'],props:['coneFront'],hl:['quad'],alt:true});
def('starReach',{k:[S(),S({tN:24,sN:-18,T:168,tF:-40,sF:-60,pF:30,uN:20,fN:30})],on:['footN'],hl:['quad','glute']});
def('pickup',{k:[S(),S({T:116,H:110,tN:46,sN:-26,tF:40,sF:-24,uN:30,fN:20})],on:['feet'],props:['box'],hl:['quad','glute']});
def('ballPass',{v:'f',fn:p=>({uL:60+30*Math.sin(p*2*Math.PI),fL:90+30*Math.sin(p*2*Math.PI),uR:60-30*Math.sin(p*2*Math.PI),fR:90-30*Math.sin(p*2*Math.PI),tw:20*Math.sin(p*2*Math.PI)}),on:['feet'],props:['ballMid'],hl:['abs'],cyc:true});
def('ballToss',{k:[S({uN:50,fN:120,uF:46,fF:116}),S({uN:150,fN:160,uF:146,fF:156})],on:['feet'],props:['ballToss'],hl:['shN','abs']});
def('stepOver',{k:[S(),S({tN:80,sN:-30,pN:90,tF:-6,T:176})],on:['footF'],props:['hurdle'],hl:['hipflex']});
def('reactive',{k:[S({T:172}),S({tN:34,sN:-4,tF:-14,sF:-18,T:168})],on:['footF','footN'],props:['pushHandBack'],hl:['quad'],fast:true});
def('reactiveSide',{v:'f',k:[{T:174},{tL:26,sL:16,T:172}],on:['footR','footL'],hl:['glute'],fast:true});

// gait
const gait=(o={})=>p=>{const a=p*2*Math.PI,s=Math.sin(a),c=Math.cos(a),A=o.amp||22,K=o.knee||40;
  const leg=x=>{const sw=Math.sin(x);return{t:A*sw,s:A*sw-K*Math.max(0,Math.sin(x+1.1))*(o.march?0:1)}};
  const n=leg(a),f=leg(a+Math.PI);
  const r={T:180+(o.lean||2),uN:-A*.8*s,fN:-A*.8*s+14,uF:A*.8*s,fF:A*.8*s+14,tN:n.t,sN:n.s,tF:f.t,sF:f.s,Y:-Math.abs(c)*(o.bob||2)};
  if(o.march){r.tN=55*Math.max(0,s);r.sN=-5*Math.max(0,s);r.tF=55*Math.max(0,-s);r.sF=-5*Math.max(0,-s);r.uN=-20*s;r.fN=r.uN+20;r.uF=20*s;r.fF=r.uF+20;r.Y=0}
  if(o.back){r.uN=-r.uN;r.uF=-r.uF}
  if(o.run){r.T=192;r.uN=-40*s;r.fN=r.uN+90;r.uF=40*s;r.fF=r.uF+90;r.Y=-Math.abs(c)*8}
  if(o.head)r.H=180+(o.head==='v'?18*Math.sin(2*a):0);
  return r};
def('walk',{fn:gait(),on:['feet'],props:['tread'],hl:['quad','glute'],cyc:true,ax:'hip'});
def('walkBack',{fn:gait({back:true}),on:['feet'],props:['treadBack'],hl:['glute','ham'],cyc:true,ax:'hip',rev:true});
def('walkHeadV',{fn:gait({head:'v'}),on:['feet'],props:['tread'],hl:['neck'],cyc:true,ax:'hip'});
def('march',{fn:gait({march:true}),on:['feet'],hl:['hipflex'],cyc:true,ax:'hip'});
def('marchSupp',{fn:p=>S(gait({march:true})(p),{uN:50,fN:70}),on:['feet'],props:['chairFront'],hl:['hipflex'],cyc:true,ax:'hip'});
def('walkSide',{v:'f',fn:p=>{const a=Math.sin(p*2*Math.PI);return{tL:4+14*Math.max(0,a),tR:4+14*Math.max(0,-a),X:24*p}},on:['feet'],props:['treadSide'],hl:['glute'],cyc:true,ax:'hip'});
def('stairsUp',{k:[S({tN:70,sN:-28,pN:90}),S({tF:40,sF:-50,tN:0,sN:0})],on:[['footN',18],['footF',0]],props:['stairs','railFront'],hl:['quad','glute']});
def('stairsDown',{k:[S({tN:0,sN:0}),S({tN:20,sN:12,tF:30,sF:-36})],on:[['footF',18],['footN',0]],props:['stairsDown','railFront'],hl:['quad']});
def('tandemWalk',{fn:gait({amp:10,knee:24}),on:['feet'],props:['line'],hl:['calf'],cyc:true,ax:'hip'});
def('hurdleWalk',{fn:gait({amp:28,knee:70}),on:['feet'],props:['hurdles'],hl:['hipflex'],cyc:true,ax:'hip'});
def('carry',{fn:p=>S(gait()(p),{uN:0,fN:0}),on:['feet'],props:['tread','dumbbellN'],hl:['abs'],cyc:true,ax:'hip'});

// transfers
def('roll',{v:'f',k:[{rot:-90,sw:1},{rot:-90,sw:.4,uL:-60,fL:-80,tL:-14,lsL:.7}],on:['body'],props:['mat'],hl:['abs']});
def('lieToSit',{k:[S(P.supine,{tN:100,sN:10,tF:100,sF:12,uN:0,fN:0,uF:0,fF:0}),S(P.sit,{uN:0,fN:0,uF:-6,fF:-6,hN:90})],on:['seat'],props:['bed'],hl:['abs']});
def('scoot',{k:[S(P.sit,{uN:0,fN:0,hN:90}),S(P.sit,{uN:0,fN:0,hN:90,X:10,T:170})],on:['seat'],props:['bed'],hl:['glute','tricep']});
def('scootSide',{v:'f',k:[S(FP.sit,{uL:4,uR:4}),S(FP.sit,{uL:4,uR:4,X:12,T:176})],on:['seat'],props:['bed'],hl:['glute']});
def('bedBridge',{k:[S(P.hook),S(P.bridge,{X:-8})],on:['back','feet'],props:['bed'],hl:['glute']});
def('sts',{k:[S(P.sit,{uN:30,fN:60,uF:26,fF:56}),S(P.sit,{T:130,H:130,uN:60,fN:80,uF:56,fF:76,sN:-14,sF:-14}),S({uN:6,fN:10,uF:2,fF:6})],on:['feet'],props:['chairBack'],hl:['quad','glute']});
def('stsArms',{k:[S(P.sit,{uN:-10,fN:80,hN:0,uF:-14,fF:76}),S(P.sit,{T:130,H:130,uN:-20,fN:20,uF:-24,fF:16,sN:-14,sF:-14}),S({uN:6,fN:10,uF:2,fF:6})],on:['feet'],props:['armchair'],hl:['quad','tricep']});
def('standToSit',{k:[S({uN:6,fN:10,uF:2,fF:6}),S(P.sit,{T:130,H:130,uN:60,fN:80,uF:56,fF:76,sN:-14,sF:-14}),S(P.sit,{uN:30,fN:60,uF:26,fF:56})],on:['feet'],props:['chairBack'],hl:['quad','glute'],slow:true});
def('stsStagger',{k:[S(P.sit,{uN:30,fN:60,sF:-24}),S(P.sit,{T:130,H:130,uN:60,fN:80,sN:-14,sF:-28}),S({uN:6,fN:10,tF:-8,sF:-8})],on:['feet'],props:['chairBack'],hl:['quad','glute']});
def('kneelFromChair',{k:[S(P.sit),S(P.halfKneel,{tN:80,sN:-6})],on:['footN',['kneeF',0]],props:['chairBack'],hl:['quad']});
def('kneelToStand',{k:[S(P.halfKneel),S(P.halfKneel,{T:160,tN:70,sN:-20}),S()],on:['footN'],props:['mat'],hl:['quad','glute']});
def('tallKneel',{fn:sway(2,P.kneel),on:['knees','toes'],props:['mat'],hl:['glute','abs'],cyc:true});
def('halfKneelBal',{fn:sway(2,P.halfKneel),on:['footN',['kneeF',0]],props:['mat'],hl:['glute','abs'],cyc:true});
def('quadToKneel',{k:[S(P.quad),S(P.kneel)],on:['knees','toes'],props:['mat'],hl:['glute','abs']});
def('floorToChair',{k:[S(P.quad),S(P.halfKneel,{uN:40,fN:60}),S(P.sit)],on:['feet'],props:['chairBack'],hl:['quad','glute']});

// neurological practice (seated)
def('sitSway',{fn:p=>S(P.sitTall,{T:180+3*Math.sin(p*2*Math.PI)}),on:['seat'],props:['chair'],hl:['abs'],cyc:true});
def('sitLatShift',{v:'f',fn:p=>S(FP.sit,{T:180+9*Math.sin(p*2*Math.PI),X:3*Math.sin(p*2*Math.PI)}),on:['seat'],props:['stool'],hl:['abs'],cyc:true});
def('sitFwdShift',{k:[S(P.sitTall),S(P.sitTall,{T:150,H:150})],on:['seat'],props:['chair'],hl:['abs','quad']});
def('crossReach',{v:'f',k:[S(FP.sit),S(FP.sit,{uL:-60,fL:-70,tw:30,T:186})],on:['seat'],props:['stool','target'],hl:['shL','abs']});
def('targetPlace',{k:[S(P.sit,{uN:30,fN:60}),S(P.sit,{uN:85,fN:90,T:168})],on:['seat'],props:['chair','tableFront','cup'],hl:['shN']});
def('towelSlide',{k:[S(P.sit,{uN:40,fN:86,uF:36,fF:84,hN:0,hF:0}),S(P.sit,{T:150,uN:110,fN:110,uF:106,fF:106,hN:0,hF:0})],on:['seat'],props:['chair','tableFront'],hl:['shN']});
def('handMouth',{k:[S(P.sitTall,{uN:20,fN:60}),S(P.sitTall,{uN:30,fN:170})],on:['seat'],props:['chair','cupHand'],hl:['bicep']});
def('fingerNose',{v:'f',k:[S(FP.sit,{uL:80,fL:80}),S(FP.sit,{uL:60,fL:-60,fsL:.9})],on:['seat'],props:['stool'],hl:['shL']});
def('heelShin',{k:[S(P.supine),S(P.supine,{tN:130,sN:60})],on:['back',['footF',0]],props:['mat'],hl:['quad']});
def('heelTap',{k:[S(P.sit),S(P.sit,{sN:40,pN:120})],on:['seat'],props:['chair','coneFront'],hl:['quad'],alt:true});
def('armLoad',{v:'f',k:[S(FP.sit,{uL:20,fL:20}),S(FP.sit,{uL:24,fL:24,T:192})],on:['seat'],props:['stool'],hl:['shL','tricep']});
def('bilatReach',{k:[S(P.sit,{uN:30,fN:60,uF:26,fF:56}),S(P.sit,{uN:95,fN:95,uF:91,fF:91,T:168})],on:['seat'],props:['chair'],hl:['shN']});
def('bigReach',{k:[S(P.sit,{uN:20,fN:50}),S(P.sit,{uN:160,fN:165,T:186})],on:['seat'],props:['chair'],hl:['shN','abs']});

// aquatic (land patterns in chest-deep water)
const aqua=(name,src,extra)=>def(name,S(M[src],{props:(M[src].props||[]).filter(x=>!/^(tread|chair|rail|band|dumbbell)/.test(x)).concat(['water']),aqua:true},extra||{}));
def('poolKick',{k:[S(),S({tN:60,sN:60,pN:140})],on:['footF'],props:['railBack'],hl:['quad','hipflex']});
def('poolExt',{k:[S(),S({tN:-30,sN:-30})],on:['footF'],props:['railFront'],hl:['glute']});
def('poolKneeFlex',{k:[S(),S({tN:-4,sN:-110,pN:-40})],on:['footF'],props:['railFront'],hl:['ham']});
def('poolArmFwd',{k:[S({uN:-30,fN:-30}),S({uN:90,fN:90})],on:['feet'],hl:['shN']});
def('poolElbow',{k:[S({uN:4,fN:4}),S({uN:4,fN:150})],on:['feet'],hl:['bicep']});
def('cycleDeep',{fn:p=>{const a=p*2*Math.PI;return S({tN:60+30*Math.sin(a),sN:20+40*Math.cos(a),tF:60-30*Math.sin(a),sF:20-40*Math.cos(a),uN:60,fN:80,uF:56,fF:76,Y:-60+2*Math.sin(2*a)})},on:['feet'],props:['waterDeep'],hl:['quad'],cyc:true,aqua:true,ax:'hip'});
def('jogDeep',{fn:p=>S(gait({run:true})(p),{Y:-60}),on:['feet'],props:['waterDeep'],hl:['quad','glute'],cyc:true,aqua:true,ax:'hip'});
aqua('aWalk','walk');aqua('aWalkBack','walkBack');aqua('aWalkSide','walkSide');aqua('aMarch','march');aqua('aTandem','tandemWalk');
aqua('aHipAbd','bandHipAbd');aqua('poolExtA','poolExt');aqua('poolKickA','poolKick');aqua('poolKneeFlexA','poolKneeFlex');aqua('aHeel','heelRaise');aqua('aToe','toeRaise');
aqua('aSquat','squat');aqua('aStepUp','stepUp');aqua('aShift','shiftLat');aqua('poolArmFwdA','poolArmFwd');aqua('aSideRaise','sideRaise');aqua('poolElbowA','poolElbow');

// return to sport
def('pogo',{fn:p=>{const a=Math.sin(p*2*Math.PI);return S({pN:a>0?60:90,pF:a>0?60:90,kN:a>0?30:0,kF:a>0?30:0,Y:-12*Math.max(0,a),uN:20,fN:40,uF:16,fF:36})},on:['toes'],hl:['calf'],cyc:true});
def('pogoSL',{fn:p=>{const a=Math.sin(p*2*Math.PI);return S({pN:a>0?60:90,kN:a>0?30:0,Y:-10*Math.max(0,a),uN:20,fN:40,tF:30,sF:-50})},on:['footN'],hl:['calf'],cyc:true});
def('squatJump',{k:[S(),S(P.squat,{uN:-30,fN:-30,uF:-34,fF:-34}),S({uN:160,fN:165,uF:156,fF:161,pN:50,pF:50,Y:-30}),S(P.squat,{T:160,tN:50,sN:-20,tF:48,sF:-22,uN:60,fN:80})],on:['feet'],hl:['quad','glute','calf']});
def('dropLand',{k:[S({Y:-18,X:-20,uN:40,fN:60}),S({Y:-2,X:-4,uN:60,fN:80}),S(P.squat,{T:160,tN:52,sN:-22,tF:50,sF:-24})],on:['feet'],props:['box2'],hl:['quad','glute']});
def('hopHold',{k:[S({tF:30,sF:-50}),S(P.squat,{T:150,tN:50,sN:-24,tF:20,sF:-60,uN:-20,fN:-20}),S({tF:30,sF:-60,tN:20,sN:-10,Y:-22,X:18,uN:100,fN:100}),S({T:160,tN:46,sN:-22,tF:30,sF:-60,X:36,uN:40,fN:60})],on:['footN'],hl:['quad','glute']});
def('hopSide',{v:'f',k:[{tR:30,lsR:.7},{tR:30,lsR:.7,X:16,Y:-18,tL:10},{tR:30,lsR:.7,X:30,T:176}],on:['footL'],hl:['glute','quad']});
def('lineHops',{fn:p=>{const a=Math.sin(p*2*Math.PI);return S({X:12*Math.sign(a),Y:-10*Math.abs(Math.sin(p*4*Math.PI)),pN:60,pF:60,kN:30,kF:30,uN:20,fN:40})},on:['toes'],props:['line'],hl:['calf'],cyc:true});
def('lineHopsSide',{v:'f',fn:p=>{const a=Math.sin(p*2*Math.PI);return{X:12*Math.sign(a),Y:-10*Math.abs(Math.sin(p*4*Math.PI)),uL:20,uR:20}},on:['feet'],props:['lineV'],hl:['calf'],cyc:true});
def('bound',{fn:gait({amp:40,knee:70,bob:10}),on:['feet'],props:['tread'],hl:['glute','quad'],cyc:true,ax:'hip'});
def('skater',{v:'f',fn:p=>{const a=Math.sin(p*2*Math.PI);return{X:26*a,Y:-8*Math.abs(Math.cos(p*2*Math.PI)),tL:a>0?6:30,tR:a>0?30:6,lsL:a>0?1:.7,lsR:a>0?.7:1,T:180-10*a,uL:30+20*a,uR:30-20*a}},on:['feet'],hl:['glute','quad'],cyc:true});
def('jog',{fn:gait({run:true}),on:['feet'],props:['tread'],hl:['quad','calf'],cyc:true,ax:'hip'});
def('shuffle',{v:'f',fn:p=>{const a=Math.sin(p*2*Math.PI);return{X:28*p,tL:18+8*a,tR:18-8*a,sL:-8,sR:-8,T:176,uL:30,fL:-20,uR:30,fR:-20,Y:-4*Math.abs(a)}},on:['feet'],props:['treadSide'],hl:['glute'],cyc:true,ax:'hip'});
def('chestPass',{k:[S({uN:40,fN:150,uF:36,fF:146,tN:14,sN:0,tF:-14,sF:-14}),S({uN:90,fN:90,uF:86,fF:86,T:172,tN:20,sN:-4,tF:-18,sF:-18})],on:['feet'],props:['ballThrow'],hl:['chest','tricep']});
def('rotThrow',{v:'f',k:[{tw:-60,uL:40,fL:-50,uR:60,fR:-20,tL:14,tR:14},{tw:60,uL:60,fL:20,uR:40,fR:50,tL:14,tR:14}],on:['feet'],props:['ballMid'],hl:['abs','chest']});
def('ohThrow',{k:[S({uN:-90,fN:170,tN:16,tF:-16,sF:-16}),S({uN:150,fN:110,T:170,tN:20,sN:-4,tF:-20,sF:-20})],on:['feet'],props:['ballOH'],hl:['shN','chest']});

// breathing and pelvic floor
def('breath',{fn:p=>S(P.hook,{belly:3*Math.sin(p*2*Math.PI)}),on:['back','feet'],props:['mat','breath'],hl:['abs'],cyc:true});
def('breathSit',{fn:p=>S(P.sitTall,{belly:3*Math.sin(p*2*Math.PI),uN:40,fN:120,hN:0}),on:['seat'],props:['chair','breath'],hl:['ribs'],cyc:true});
def('pursed',{fn:p=>S(P.sitTall,{belly:2*Math.sin(p*2*Math.PI)}),on:['seat'],props:['chair','puff'],hl:['abs'],cyc:true});
def('breathArms',{k:[S(P.sitTall,{uN:10,fN:20}),S(P.sitTall,{uN:150,fN:155,belly:2})],on:['seat'],props:['chair','breath'],hl:['ribs','shN']});
def('breathLean',{fn:p=>S(P.sit,{T:150,H:150,uN:20,fN:80,hN:0,belly:2*Math.sin(p*2*Math.PI)}),on:['seat'],props:['chair','breath'],hl:['ribs'],cyc:true});
def('breathSide',{v:'f',fn:p=>({rot:-90,lsL:.6,lsR:.6,tL:20,tR:20,belly:2*Math.sin(p*2*Math.PI)}),on:['body'],props:['mat','breath'],hl:['ribs'],cyc:true});
def('pfSup',{fn:p=>S(P.hook,{belly:-1.5*Math.max(0,Math.sin(p*2*Math.PI))}),on:['back','feet'],props:['mat'],hl:['pelvic'],cyc:true});
def('pfQuick',{fn:p=>S(P.hook,{belly:0}),on:['back','feet'],props:['mat'],hl:['pelvic'],cyc:true,fast:true});
def('pfSit',{fn:p=>S(P.sitTall,{}),on:['seat'],props:['chair'],hl:['pelvic'],cyc:true});
def('pfStand',{fn:p=>S({}),on:['feet'],hl:['pelvic'],cyc:true});
def('pfButterfly',{v:'f',fn:p=>({rot:-90,lsL:.55,lsR:.55,tL:45,tR:45,sL:-20,sR:-20}),on:['body'],props:['mat'],hl:['pelvic'],cyc:true});
def('pfChild',{fn:p=>S(P.quad,{tN:130,tF:126,T:98,H:100,uN:100,fN:100,uF:96,fF:96,hN:0,hF:0}),on:['knees','toes'],props:['mat'],hl:['pelvic'],cyc:true});
def('pfLift',{k:[S(P.squat,{uN:10,fN:10,uF:6,fF:6}),S({uN:8,fN:8,uF:4,fF:4})],on:['feet'],props:['boxHands'],hl:['pelvic','glute']});
def('pfCough',{fn:p=>S(P.sitTall,{H:180-8*Math.max(0,Math.sin(p*2*Math.PI))}),on:['seat'],props:['chair','puff'],hl:['pelvic'],cyc:true});

/* ---------- hand close-up ----------
   Palm faces the viewer, fingers up. Each finger has three joint angles (knuckle, middle, end)
   bending toward the viewer, drawn by projection so a bent finger shortens and folds over the palm. */
const FING=[{x:-17,L:[22,14,11],w:10.5},{x:-5.5,L:[25,16,12],w:11},{x:6,L:[23,15,11],w:10.5},{x:17,L:[18,11,9],w:9}];
const HAND={f:[[0,0,0],[0,0,0],[0,0,0],[0,0,0]],sp:0,th:[0,0],thT:null,w:0,dev:0,flip:0,obj:'',objAt:null};
const fist=[90,95,70],hook=[0,90,75],table=[88,0,0],sfist=[88,90,0];
const all=a=>[a,a,a,a].map(x=>x.slice());
function handPose(name,p){
  const t=ease(p<.5?p*2:2-p*2),L=(a,b)=>a.map((x,i)=>x.map((y,j)=>lerp(y,b[i][j],t)));
  const O=all([0,0,0]),H=S(HAND,{f:O});
  switch(name){
    case'straight':return H;
    case'hook':return S(H,{f:L(O,all(hook))});
    case'tabletop':return S(H,{f:L(O,all(table))});
    case'sfist':return S(H,{f:L(O,all(sfist))});
    case'fist':return S(H,{f:L(O,all(fist)),th:[t*.6,t*.6]});
    case'spread':return S(H,{sp:t});
    case'walk':{const k=Math.floor(p*4)%4,q=(p*4)%1,f=all([0,0,0]);f[k]=[40*Math.sin(q*Math.PI),40*Math.sin(q*Math.PI),20*Math.sin(q*Math.PI)];return S(H,{f,flip:0,w:60})}
    case'lift':{const f=all([10,10,5]);f[0]=[10-30*t,0,0];return S(H,{f,flat:1})}
    case'blockPip':{const f=all([0,0,0]);f[1]=[0,90*t,40*t];return S(H,{f,obj:'block'})}
    case'blockDip':{const f=all([0,0,0]);f[1]=[0,0,70*t];return S(H,{f,obj:'block'})}
    case'opp':{const k=Math.floor(p*4)%4,q=Math.sin(((p*4)%1)*Math.PI);const f=all([0,0,0]);f[k]=[35*q,30*q,20*q];return S(H,{f,thT:{i:k,t:q}})}
    case'thAbdP':return S(H,{th:[0,0],thA:t*40});
    case'thAbdR':return S(H,{thA:t*55});
    case'thFlex':return S(H,{th:[t,t]});
    case'thExt':return S(H,{thA:-t*20+30,th:[0,-t*.4]});
    case'thBlock':return S(H,{th:[0,t],obj:'block'});
    case'grip':return S(H,{f:L(O,all([70,80,50])),th:[t*.5,t*.4],obj:'putty',objS:1-t*.25});
    case'keyPinch':{const f=L(O,all([80,90,40]));return S(H,{f,thT:{i:'side',t},obj:'putty'})}
    case'pinch3':{const f=all([0,0,0]);f[0]=[40*t,30*t,20*t];f[1]=[40*t,30*t,20*t];return S(H,{f,thT:{i:.5,t},obj:'putty'})}
    case'elastic':return S(H,{sp:t,obj:'ring',f:L(all([30,30,20]),all([0,0,0]))});
    case'coin':{const f=all([0,0,0]);f[0]=[40*t,30*t,20*t];return S(H,{f,thT:{i:0,t},obj:'coin'})}
    case'coinIn':{const f=all([30,30,20]);f[0]=[50,40,30];return S(H,{f,thT:{i:0,t:.9},obj:'coin',objMove:t})}
    case'coinOut':{const f=all([30,30,20]);f[0]=[50,40,30];return S(H,{f,thT:{i:0,t:.9},obj:'coin',objMove:1-t})}
    case'turnKey':{const f=L(O,all([80,90,40]));return S(H,{f,thT:{i:'side',t:1},obj:'key',flip:Math.sin(p*2*Math.PI)*.7})}
    case'jar':{const f=all([40,40,30]);return S(H,{f,sp:.4,obj:'lid',rotObj:Math.sin(p*2*Math.PI)*40,dev:Math.sin(p*2*Math.PI)*12})}
    case'pen':{const f=all([0,0,0]);f[0]=[40,30,20];f[1]=[40,30,20];return S(H,{f,thT:{i:.5,t:1},obj:'pen',rotObj:Math.sin(p*2*Math.PI)*50})}
    case'trace':{const f=all([60,70,40]);f[0]=[40,30,20];return S(H,{f,thT:{i:0,t:1},obj:'pen',dx:16*Math.sin(p*2*Math.PI),dy:6*Math.sin(p*4*Math.PI)})}
    case'sponge':return S(H,{f:L(O,all([70,80,50])),th:[t*.5,t*.4],obj:'sponge',objS:1-t*.35});
    case'crumple':return S(H,{f:L(O,all(fist)),th:[t*.6,t*.6],obj:'paper',objS:1-t*.5});
    case'flatten':return S(H,{w:70,dy:6*t,obj:'sheet'});
    case'cup':return S(H,{f:all([60,60,40]),th:[.3,.2],obj:'cup',dx:24*Math.sin(p*2*Math.PI)});
    case'scoop':return S(H,{f:all([60,70,50]),th:[.4,.3],obj:'spoon',dev:20*Math.sin(p*2*Math.PI)});
    case'fold':return S(H,{w:60,obj:'towel',flip:t*.9});
    case'card':{const f=all([40,40,30]);return S(H,{f,thT:{i:1,t:.7},obj:'card',objMove:t})}
    case'pin':{const f=all([0,0,0]);f[0]=[40*t,30*t,20*t];return S(H,{f,thT:{i:0,t},obj:'peg',objMove:t})}
    case'clothespin':{const f=all([50,40,20]);f[0]=[40,30,20];return S(H,{f,thT:{i:0,t:.5+t*.5},obj:'clip',objS:1-t*.4})}
    case'button':{const f=all([40,40,30]);f[0]=[40,30,20];return S(H,{f,thT:{i:0,t:1},obj:'button',dx:6*Math.sin(p*2*Math.PI)})}
    case'zip':{const f=all([60,60,40]);f[0]=[40,30,20];return S(H,{f,thT:{i:0,t:1},obj:'zip',dy:20*t})}
    case'bolt':{const f=all([30,30,20]);f[0]=[40,30,20];return S(H,{f,thT:{i:0,t:1},obj:'bolt',rotObj:p*360})}
    case'palmTurn':return S(H,{flip:Math.sin(p*2*Math.PI)});
    case'wristFE':return S(H,{w:60*Math.sin(p*2*Math.PI)});
    case'wristRU':return S(H,{dev:22*Math.sin(p*2*Math.PI)});
    case'ball':return S(H,{f:L(all([40,40,30]),all([60,60,40])),th:[.4,.3],obj:'ball',w:20*Math.sin(p*2*Math.PI)});
    default:return H;
  }
}
function drawHand(h){
  const C='var(--fig)',D='var(--fig-far)',A='var(--accent)';
  const wx=120,wy=176,palmTop=106;
  let g='';
  const flip=h.flip||0,sx=1-Math.abs(flip)*1.6>.15?1-Math.abs(flip)*.6:.4;
  const tr=`translate(${fx(wx+(h.dx||0))} ${fx(wy+(h.dy||0))}) rotate(${fx(h.dev||0)}) scale(${fx(Math.max(.35,1-Math.abs(flip)*.55))} ${fx(Math.cos((h.w||0)*RAD)*.25+.75)}) translate(${-wx} ${-wy})`;
  const back=Math.abs(flip)>.55;
  // forearm
  g+=`<path d="M100 ${wy+40} L100 ${wy} Q120 ${wy-6} 140 ${wy} L140 ${wy+40} Z" fill="${D}"/>`;
  let body='';
  body+=`<path d="M98 ${wy} C92 150 92 120 99 ${palmTop} L142 ${palmTop} C148 122 148 152 142 ${wy} Z" fill="${back?D:C}"/>`;
  if(!back)body+=`<path d="M104 150 Q120 158 136 146" fill="none" stroke="var(--fig-line)" stroke-width="1.4"/><path d="M106 128 Q122 134 138 124" fill="none" stroke="var(--fig-line)" stroke-width="1.2"/>`;
  const tips=[];
  FING.forEach((F,i)=>{
    const sp=(h.sp||0)*[-10,-2,5,12][i];
    const base=[120+F.x,palmTop+2],[a1,a2,a3]=h.f[i];
    let cum=0,pt=base.slice(),seg='';const pts=[pt.slice()];
    const dir=v(180+sp);
    [a1,a2,a3].forEach((a,j)=>{cum+=a;const L=F.L[j]*Math.cos(cum*RAD);pt=add(pt,dir,L);pts.push(pt.slice())});
    for(let j=0;j<3;j++){const s=pts[j],e=pts[j+1];const cumj=[a1,a1+a2,a1+a2+a3][j];const toward=cumj>45;
      seg+=`<line x1="${fx(s[0])}" y1="${fx(s[1])}" x2="${fx(e[0])}" y2="${fx(e[1])}" stroke="${toward||back?D:C}" stroke-width="${F.w-j*1.2}" stroke-linecap="round"/>`}
    seg+=`<circle cx="${fx(pts[3][0])}" cy="${fx(pts[3][1])}" r="${(F.w-3)/2}" fill="${back?D:'var(--fig-tip)'}"/>`;
    tips.push(pts[3]);body+=seg;
  });
  // thumb: from the base of the palm toward a target
  const tb=[100,158],rest=[78,112];
  let tip=rest.slice();
  if(h.thA)tip=add(tb,v(180-48-h.thA),52);
  if(h.th&&(h.th[0]||h.th[1])){const k=(h.th[0]+h.th[1])/2;tip=[lerp(rest[0],128,k),lerp(rest[1],146,k)]}
  if(h.thT){const t=h.thT.t;let tgt;
    if(h.thT.i==='side')tgt=[106,124];else if(typeof h.thT.i==='number'&&h.thT.i%1===0)tgt=tips[h.thT.i];else tgt=[(tips[0][0]+tips[1][0])/2,(tips[0][1]+tips[1][1])/2];
    tip=[lerp(rest[0],tgt[0]-4,t),lerp(rest[1],tgt[1]+4,t)]}
  const mid=[(tb[0]+tip[0])/2-8,(tb[1]+tip[1])/2+4];
  body+=`<path d="M${tb[0]} ${tb[1]} Q${fx(mid[0])} ${fx(mid[1])} ${fx(tip[0])} ${fx(tip[1])}" fill="none" stroke="${back?D:C}" stroke-width="13" stroke-linecap="round"/><circle cx="${fx(tip[0])}" cy="${fx(tip[1])}" r="5" fill="${back?D:'var(--fig-tip)'}"/>`;
  // objects
  const o=h.obj,s=h.objS??1;let ob='';
  const pinchPt=h.thT?[(tip[0]+(tips[0]?tips[0][0]:tip[0]))/2,(tip[1]+(tips[0]?tips[0][1]:tip[1]))/2]:[120,130];
  if(o==='putty')ob=`<ellipse cx="${o&&h.thT?fx(pinchPt[0]):120}" cy="${h.thT?fx(pinchPt[1]):136}" rx="${fx(16*s)}" ry="${fx(12*s)}" fill="var(--prop-soft)" opacity=".9"/>`;
  if(o==='sponge')ob=`<rect x="${fx(120-18*s)}" y="${fx(128-12*s)}" width="${fx(36*s)}" height="${fx(24*s)}" rx="5" fill="#f2c94c" opacity=".9"/>`;
  if(o==='paper')ob=`<circle cx="120" cy="134" r="${fx(18*s)}" fill="#fff" stroke="var(--prop)" stroke-width="1"/>`;
  if(o==='ball')ob=`<circle cx="120" cy="128" r="16" fill="var(--accent)" opacity=".85"/>`;
  if(o==='coin'){const mv=h.objMove??0;const c=h.objMove!=null?[lerp(pinchPt[0],120,mv),lerp(pinchPt[1],150,mv)]:pinchPt;ob=`<circle cx="${fx(c[0])}" cy="${fx(c[1])}" r="6" fill="#d9a400" stroke="#9a7400"/>`}
  if(o==='ring')ob=`<ellipse cx="120" cy="88" rx="${fx(26+(h.sp||0)*10)}" ry="6" fill="none" stroke="var(--accent)" stroke-width="3"/>`;
  if(o==='key')ob=`<g transform="rotate(${fx((h.flip||0)*60)} ${fx(pinchPt[0])} ${fx(pinchPt[1])})"><rect x="${fx(pinchPt[0]-3)}" y="${fx(pinchPt[1]-26)}" width="6" height="22" fill="var(--prop)"/><circle cx="${fx(pinchPt[0])}" cy="${fx(pinchPt[1])}" r="7" fill="none" stroke="var(--prop)" stroke-width="3"/></g>`;
  if(o==='lid')ob=`<ellipse cx="120" cy="70" rx="30" ry="9" fill="var(--prop-soft)" stroke="var(--prop)" transform="rotate(${fx(h.rotObj||0)} 120 70)"/><rect x="92" y="70" width="56" height="10" fill="var(--prop-soft)" opacity=".6"/>`;
  if(o==='pen'||o==='trace')ob=`<line x1="${fx(pinchPt[0])}" y1="${fx(pinchPt[1])}" x2="${fx(pinchPt[0]+30*Math.sin(((h.rotObj||20))*RAD))}" y2="${fx(pinchPt[1]-30*Math.cos(((h.rotObj||20))*RAD))}" stroke="var(--prop)" stroke-width="4" stroke-linecap="round"/>`;
  if(o==='cup')ob=`<path d="M106 112 L110 150 L132 150 L136 112 Z" fill="var(--prop-soft)" stroke="var(--prop)"/>`;
  if(o==='spoon')ob=`<line x1="120" y1="132" x2="150" y2="96" stroke="var(--prop)" stroke-width="4"/><ellipse cx="152" cy="92" rx="7" ry="5" fill="var(--prop)"/>`;
  if(o==='sheet')ob=`<rect x="76" y="186" width="90" height="6" fill="#fff" stroke="var(--prop)" stroke-width="1"/>`;
  if(o==='towel')ob=`<rect x="70" y="${fx(186)}" width="100" height="8" rx="3" fill="var(--prop-soft)"/>`;
  if(o==='card')ob=`<rect x="${fx(110+20*(h.objMove||0))}" y="120" width="26" height="36" rx="3" fill="#fff" stroke="var(--prop)" transform="rotate(${fx(-20*(h.objMove||0))} 120 140)"/>`;
  if(o==='peg')ob=`<rect x="${fx(pinchPt[0]-3)}" y="${fx(pinchPt[1]-4+30*(1-(h.objMove||0)))}" width="6" height="18" rx="2" fill="var(--accent)"/>`;
  if(o==='clip')ob=`<g transform="translate(${fx(pinchPt[0])} ${fx(pinchPt[1])})"><rect x="-4" y="-18" width="8" height="${fx(30*s)}" rx="2" fill="#c8a165"/></g>`;
  if(o==='button')ob=`<circle cx="${fx(pinchPt[0])}" cy="${fx(pinchPt[1])}" r="6" fill="var(--accent)"/><rect x="60" y="170" width="120" height="30" fill="var(--prop-soft)" opacity=".5"/>`;
  if(o==='zip')ob=`<line x1="${fx(pinchPt[0])}" y1="60" x2="${fx(pinchPt[0])}" y2="200" stroke="var(--prop)" stroke-width="3" stroke-dasharray="3 2"/>`;
  if(o==='bolt')ob=`<g transform="rotate(${fx(h.rotObj||0)} ${fx(pinchPt[0])} ${fx(pinchPt[1])})"><polygon points="${[0,1,2,3,4,5].map(i=>fx(pinchPt[0]+7*Math.cos(i*Math.PI/3))+','+fx(pinchPt[1]+7*Math.sin(i*Math.PI/3))).join(' ')}" fill="var(--prop)"/></g>`;
  if(o==='block')ob=`<rect x="100" y="96" width="40" height="14" rx="4" fill="var(--prop-soft)" opacity=".85"/>`;
  return`<g transform="${tr}">${g}${body}</g>${ob}`;
}

/* ---------- drawing the mannequin ---------- */
const W_={torso:26,thigh:16,shin:12.5,ua:11,fa:9,foot:7.5,hand:7.5,neck:8};
function seg(a,b,w,c,cls=''){return`<line${cls?` class="${cls}"`:''} x1="${fx(a[0])}" y1="${fx(a[1])}" x2="${fx(b[0])}" y2="${fx(b[1])}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`}
function drawSide(J,P,hl,pulse){
  const C='var(--fig)',D='var(--fig-far)',H='var(--accent)';
  const on=k=>hl.includes(k);
  const hc=(k,base)=>on(k)?H:base;
  let g='';
  // far limbs
  g+=seg(J.shF||J.sh,J.elF,W_.ua,D)+seg(J.elF,J.wrF,W_.fa,D)+seg(J.wrF,J.haF,W_.hand,D);
  g+=seg(J.hip,J.knF,W_.thigh,D)+seg(J.knF,J.anF,W_.shin,D)+seg(J.heF,J.baF,W_.foot,D)+seg(J.baF,J.toF,W_.foot-1.5,D);
  // torso as a curved capsule
  const mid=add(add(J.hip,J.td,27),J.fr,-P.cv);const bel=P.belly||0;
  g+=`<path d="M${fx(J.hip[0])} ${fx(J.hip[1])} Q${fx(mid[0])} ${fx(mid[1])} ${fx(J.neck[0]-J.td[0]*6)} ${fx(J.neck[1]-J.td[1]*6)}" fill="none" stroke="${C}" stroke-width="${W_.torso+bel}" stroke-linecap="round"/>`;
  const zone=(f0,f1,side,col)=>{const a=add(add(J.hip,J.td,54*f0),J.fr,side*8),b=add(add(J.hip,J.td,54*f1),J.fr,side*8);return seg(a,b,10,col,'mz'+(pulse?' pz':''))};
  if(on('abs'))g+=zone(.18,.62,1,H);
  if(on('ribs'))g+=zone(.5,.78,1,H)+zone(.5,.78,-1,H);
  if(on('chest'))g+=zone(.6,.86,1,H);
  if(on('back'))g+=zone(.62,.9,-1,H);
  if(on('lowback'))g+=zone(.12,.45,-1,H);
  if(on('glute'))g+=seg(add(J.hip,J.fr,-7),add(add(J.hip,J.fr,-7),v(P.tN),10),12,H,'mz'+(pulse?' pz':''));
  if(on('pelvic'))g+=`<circle class="mz pz" cx="${fx(J.hip[0]+J.td[0]*-4)}" cy="${fx(J.hip[1]+J.td[1]*-4)}" r="7" fill="${H}"/>`;
  if(on('hipflex'))g+=seg(add(J.hip,J.fr,7),add(add(J.hip,J.fr,7),J.td,14),9,H,'mz');
  // neck + head
  g+=seg(add(J.neck,J.td,-4),add(J.neck,J.hd,6),W_.neck,hc('neck',C));
  g+=`<circle cx="${fx(J.head[0])}" cy="${fx(J.head[1])}" r="10.5" fill="${C}"/>`;
  g+=`<circle cx="${fx(J.nose[0]-J.hf[0]*3+J.hd[0]*2)}" cy="${fx(J.nose[1]-J.hf[1]*3+J.hd[1]*2)}" r="1.6" fill="var(--fig-line)"/>`;
  g+=`<path d="M${fx(J.nose[0]-J.hf[0]*1)} ${fx(J.nose[1]-J.hf[1]*1)} l${fx(J.hf[0]*2.5-J.hd[0]*2)} ${fx(J.hf[1]*2.5-J.hd[1]*2)}" stroke="${C}" stroke-width="4" stroke-linecap="round"/>`;
  // near leg
  const legHl=(a,b,k,w)=>seg(a,b,w,on(k)?H:C,on(k)?'mz'+(pulse?' pz':''):'');
  g+=seg(J.hip,J.knN,W_.thigh,C);
  if(on('quad'))g+=seg(add(add(J.hip,v(P.tN),8),[-v(P.tN)[1],v(P.tN)[0]],4),add(add(J.knN,v(P.tN),-6),[-v(P.tN)[1],v(P.tN)[0]],4),8,H,'mz'+(pulse?' pz':''));
  if(on('ham'))g+=seg(add(add(J.hip,v(P.tN),8),[-v(P.tN)[1],v(P.tN)[0]],-4),add(add(J.knN,v(P.tN),-6),[-v(P.tN)[1],v(P.tN)[0]],-4),8,H,'mz'+(pulse?' pz':''));
  if(on('adductor'))g+=seg(add(J.hip,v(P.tN),10),add(J.knN,v(P.tN),-10),7,H,'mz');
  g+=seg(J.knN,J.anN,W_.shin,C);
  if(on('calf'))g+=seg(add(add(J.knN,v(P.sN),6),[-v(P.sN)[1],v(P.sN)[0]],-3),add(add(J.anN,v(P.sN),-12),[-v(P.sN)[1],v(P.sN)[0]],-3),7,H,'mz'+(pulse?' pz':''));
  if(on('shin'))g+=seg(add(add(J.knN,v(P.sN),6),[-v(P.sN)[1],v(P.sN)[0]],3),add(add(J.anN,v(P.sN),-8),[-v(P.sN)[1],v(P.sN)[0]],3),6,H,'mz');
  g+=seg(J.heN,J.baN,W_.foot,hc('footN',C))+seg(J.baN,J.toN,W_.foot-1.5,hc('footN',C));
  // near arm
  g+=seg(J.sh,J.elN,W_.ua,on('shN')?H:C,on('shN')?'mz':'');
  if(on('bicep'))g+=seg(add(add(J.sh,v(P.uN),6),[-v(P.uN)[1],v(P.uN)[0]],2.5),add(add(J.elN,v(P.uN),-5),[-v(P.uN)[1],v(P.uN)[0]],2.5),6,H,'mz'+(pulse?' pz':''));
  if(on('tricep'))g+=seg(add(add(J.sh,v(P.uN),6),[-v(P.uN)[1],v(P.uN)[0]],-2.5),add(add(J.elN,v(P.uN),-5),[-v(P.uN)[1],v(P.uN)[0]],-2.5),6,H,'mz'+(pulse?' pz':''));
  g+=seg(J.elN,J.wrN,W_.fa,on('forearm')?H:C,on('forearm')?'mz'+(pulse?' pz':''):'')+seg(J.wrN,J.haN,W_.hand,C);
  // joints
  for(const k of['knN','elN','sh','hip','anN'])g+=`<circle cx="${fx(J[k][0])}" cy="${fx(J[k][1])}" r="1.8" fill="var(--fig-line)"/>`;
  if(P.eyes)g+=`<path d="M${fx(J.nose[0]-J.hf[0]*4)} ${fx(J.nose[1]-J.hf[1]*4)} l3 0" stroke="var(--fig-line)" stroke-width="1.5"/>`;
  return g;
}
function drawFront(J,P,hl,pulse){
  const C='var(--fig)',D='var(--fig-far)',H='var(--accent)';const on=k=>hl.includes(k);
  let g='';
  const leg=s=>seg(J['hp'+s],J['kn'+s],W_.thigh,(on('glute')&&s==='L')||(on('adductor')&&s==='L')?H:C,(on('glute')&&s==='L')?'mz'+(pulse?' pz':''):'')+seg(J['kn'+s],J['an'+s],W_.shin,on('quad')&&s==='L'?H:C)+seg(J['an'+s],J['ft'+s],W_.foot,on('calf')&&s==='L'?H:(on('footN')?H:C));
  const arm=s=>seg(J['sh'+s],J['el'+s],W_.ua,on('sh'+s)?H:C,on('sh'+s)?'mz'+(pulse?' pz':''):'')+seg(J['el'+s],J['wr'+s],W_.fa,C)+seg(J['wr'+s],J['ha'+s],W_.hand,C);
  g+=leg('R')+leg('L');
  // pelvis + torso
  g+=seg(J.hpR,J.hpL,18,C);
  const top=add(J.hip,J.td,50*P.ts-6);
  g+=`<path d="M${fx(J.hpR[0])} ${fx(J.hpR[1])} L${fx(J.shR[0])} ${fx(J.shR[1])} L${fx(J.shL[0])} ${fx(J.shL[1])} L${fx(J.hpL[0])} ${fx(J.hpL[1])} Z" fill="${C}" stroke="${C}" stroke-width="${12+(P.belly||0)}" stroke-linejoin="round"/>`;
  if(on('abs'))g+=seg(add(J.hip,J.td,10*P.ts),add(J.hip,J.td,32*P.ts),10,H,'mz'+(pulse?' pz':''));
  if(on('chest'))g+=seg(add(J.shR,J.td,-8),add(J.shL,J.td,-8),8,H,'mz'+(pulse?' pz':''));
  if(on('back'))g+=seg(add(J.shR,J.td,-4),add(J.shL,J.td,-4),7,H,'mz'+(pulse?' pz':''));
  if(on('ribs'))g+=seg(add(J.hip,J.td,26*P.ts),add(J.hip,J.td,40*P.ts),18,H,'mz pz');
  if(on('pelvic'))g+=`<circle class="mz pz" cx="${fx(J.hip[0])}" cy="${fx(J.hip[1])}" r="6" fill="${H}"/>`;
  g+=arm('R')+arm('L');
  g+=seg(J.neck,add(J.neck,J.hd,-6),W_.neck,on('neck')?H:C,on('neck')?'mz':'');
  g+=`<circle cx="${fx(J.head[0])}" cy="${fx(J.head[1])}" r="11" fill="${C}"/>`;
  const nx=add(J.head,J.hpr,(P.hr||0)*7.5);
  g+=`<line x1="${fx(nx[0])}" y1="${fx(nx[1]-1)}" x2="${fx(nx[0]+J.hd[0]*4)}" y2="${fx(nx[1]+J.hd[1]*4)}" stroke="var(--fig-line)" stroke-width="2" stroke-linecap="round"/>`;
  if(P.eyes)g+=`<line x1="${fx(J.head[0]-5)}" y1="${fx(J.head[1]-2)}" x2="${fx(J.head[0]+5)}" y2="${fx(J.head[1]-2)}" stroke="var(--fig-line)" stroke-width="1.6"/>`;
  return g;
}

/* ---------- props ---------- */
function props(list,J0,J,P,view,p,box){
  let back='',front='';const F=FLOOR,pr='var(--prop)',ps='var(--prop-soft)';
  const at=k=>J0[k]||[0,0];
  for(const n of list){
    switch(n){
      case'mat':back+=`<rect x="${fx(box[0]-10)}" y="${F-3}" width="${fx(box[2]-box[0]+20)}" height="5" rx="2" fill="${ps}"/>`;break;
      case'chair':case'chairBack':case'armchair':{const h=at('hip'),y=h[1]+9;const x=n==='chair'?h[0]:h[0];
        back+=`<rect x="${fx(x-20)}" y="${fx(y)}" width="34" height="5" rx="2" fill="${pr}"/><line x1="${fx(x-17)}" y1="${fx(y)}" x2="${fx(x-17)}" y2="${F}" stroke="${pr}" stroke-width="3"/><line x1="${fx(x+11)}" y1="${fx(y)}" x2="${fx(x+11)}" y2="${F}" stroke="${pr}" stroke-width="3"/><line x1="${fx(x-19)}" y1="${fx(y)}" x2="${fx(x-22)}" y2="${fx(y-44)}" stroke="${pr}" stroke-width="3.5" stroke-linecap="round"/>`;
        if(n==='armchair')back+=`<line x1="${fx(x-20)}" y1="${fx(y-18)}" x2="${fx(x+14)}" y2="${fx(y-18)}" stroke="${pr}" stroke-width="3" stroke-linecap="round"/>`;break}
      case'stool':{const y=Math.max(J0.hpL?J0.hpL[1]:0,J0.hpR?J0.hpR[1]:0)+9,x=J0.hip[0];back+=`<rect x="${fx(x-24)}" y="${fx(y)}" width="48" height="6" rx="2" fill="${pr}"/><line x1="${fx(x-18)}" y1="${fx(y)}" x2="${fx(x-20)}" y2="${F}" stroke="${pr}" stroke-width="3"/><line x1="${fx(x+18)}" y1="${fx(y)}" x2="${fx(x+20)}" y2="${F}" stroke="${pr}" stroke-width="3"/>`;break}
      case'bed':{const y=(J0.hip[1]+9);back+=`<rect x="${fx(box[0]-6)}" y="${fx(Math.max(y,F-60))}" width="${fx(Math.min(150,box[2]-box[0]+12))}" height="10" rx="3" fill="${pr}"/><line x1="${fx(box[0])}" y1="${fx(y)}" x2="${fx(box[0])}" y2="${F}" stroke="${pr}" stroke-width="3"/>`;break}
      case'bench':{const y=Math.min(F-36,J0.hip[1]+12);back+=`<rect x="${fx(J0.hip[0]-30)}" y="${fx(y)}" width="100" height="8" rx="3" fill="${pr}"/>`;break}
      case'wallFront':{const x=Math.max(J0.haN?J0.haN[0]:0,J0.toN?J0.toN[0]:0)+4;back+=`<rect x="${fx(x)}" y="${F-170}" width="6" height="170" fill="${pr}"/>`;break}
      case'wallBack':{const x=Math.min(J0.hip[0]-14,J0.heN?J0.heN[0]-6:0);back+=`<rect x="${fx(x-6)}" y="${F-170}" width="6" height="170" fill="${pr}"/>`;break}
      case'wallR':case'wallSide':back+=`<rect x="${fx(box[2]+4)}" y="${F-170}" width="6" height="170" fill="${pr}"/>`;break;
      case'wallLegs':back+=`<rect x="${fx(box[2]+2)}" y="${F-120}" width="6" height="120" fill="${pr}"/>`;break;
      case'door':{const x=J0.elN?J0.elN[0]-6:0;back+=`<rect x="${fx(x)}" y="${F-170}" width="7" height="170" fill="${pr}"/>`;break}
      case'table':case'tableHand':case'tableFront':{const h=n==='table'?J0.haF:n==='tableHand'?J0.haN:(J0.wrN||J0.haN);const y=(h[1]+4);const x=h[0]-24;back+=`<rect x="${fx(x)}" y="${fx(y)}" width="60" height="6" rx="2" fill="${pr}"/><line x1="${fx(x+50)}" y1="${fx(y)}" x2="${fx(x+50)}" y2="${F}" stroke="${pr}" stroke-width="3"/>`;break}
      case'chairFront':{const h=J0.haN;back+=`<line x1="${fx(h[0]+2)}" y1="${fx(h[1]+3)}" x2="${fx(h[0]+2)}" y2="${F}" stroke="${pr}" stroke-width="3.5"/><line x1="${fx(h[0]-10)}" y1="${fx(h[1]+3)}" x2="${fx(h[0]+14)}" y2="${fx(h[1]+3)}" stroke="${pr}" stroke-width="4" stroke-linecap="round"/>`;break}
      case'railR':case'railL':case'railFront':case'railBack':{const x=n==='railL'?box[0]-8:n==='railBack'?box[0]-6:box[2]+6;back+=`<line x1="${fx(x)}" y1="${F-92}" x2="${fx(x)}" y2="${F}" stroke="${pr}" stroke-width="3"/><circle cx="${fx(x)}" cy="${F-92}" r="4" fill="${pr}"/>`;break}
      case'step':case'stepBack':case'stepUnder':case'stairs':{const x=n==='step'||n==='stairs'?J0.toN[0]-26:n==='stepUnder'?J0.toN[0]-30:J0.heN[0]-12;back+=`<rect x="${fx(x)}" y="${F-18}" width="${n==='stairs'?80:44}" height="18" rx="2" fill="${ps}" stroke="${pr}"/>`;if(n==='stairs')back+=`<rect x="${fx(x+40)}" y="${F-36}" width="40" height="18" rx="2" fill="${ps}" stroke="${pr}"/>`;break}
      case'stairsDown':{const x=J0.heF[0]-30;back+=`<rect x="${fx(x)}" y="${F-18}" width="44" height="18" rx="2" fill="${ps}" stroke="${pr}"/><rect x="${fx(x-40)}" y="${F-36}" width="40" height="36" rx="2" fill="${ps}" stroke="${pr}" opacity=".0"/>`;break}
      case'stepL':case'stepR':{const a=n==='stepL'?J0.anL:J0.anR;back+=`<rect x="${fx(a[0]-22)}" y="${F-18}" width="44" height="18" rx="2" fill="${ps}" stroke="${pr}"/>`;break}
      case'foam':back+=`<rect x="${fx(box[0]+10)}" y="${F-8}" width="${fx(box[2]-box[0]-20)}" height="8" rx="3" fill="#f2c94c" opacity=".75"/>`;break;
      case'board':{const c=(box[0]+box[2])/2;back+=`<g transform="rotate(${fx(P.rot||0)} ${fx(c)} ${F-6})"><rect x="${fx(c-36)}" y="${F-10}" width="72" height="5" rx="2" fill="${pr}"/></g><path d="M${fx(c-10)} ${F} L${fx(c)} ${F-6} L${fx(c+10)} ${F} Z" fill="${pr}"/>`;break}
      case'box':case'box2':case'boxHands':{const x=n==='box2'?J0.toN[0]-40:(J.haN?J.haN[0]-10:0);const h=n==='box2'?18:22;back+=`<rect x="${fx(x)}" y="${F-h}" width="28" height="${h}" rx="3" fill="${ps}" stroke="${pr}"/>`;break}
      case'hurdle':case'hurdles':{const xs=n==='hurdle'?[J0.toN[0]+10]:[box[0]+10,box[2]-20];for(const x0 of xs){const x=n==='hurdles'?((x0-p*80-box[0])%(box[2]-box[0])+box[0]+(box[2]-box[0]))%(box[2]-box[0])+box[0]:x0;back+=`<path d="M${fx(x)} ${F} L${fx(x)} ${F-16} L${fx(x+18)} ${F-16} L${fx(x+18)} ${F}" fill="none" stroke="var(--accent)" stroke-width="3"/>`}break}
      case'coneFront':back+=`<path d="M${fx(J0.toN[0]+24)} ${F} l7 -16 l7 16 Z" fill="var(--accent)"/>`;break;
      case'target':front+=`<circle cx="${fx(box[0]+6)}" cy="${fx(J0.shR?J0.shR[1]+10:F-80)}" r="7" fill="none" stroke="var(--accent)" stroke-width="3"/>`;break;
      case'tread':case'treadBack':case'treadSide':{const d=(n==='treadBack'?-1:1)*(p*40)%20;for(let x=box[0]-20;x<box[2]+20;x+=20)back+=`<line x1="${fx(x-d)}" y1="${F+4}" x2="${fx(x-d+8)}" y2="${F+4}" stroke="${pr}" stroke-width="2" stroke-linecap="round"/>`;break}
      case'line':back+=`<line x1="${fx(box[0]-10)}" y1="${F+2}" x2="${fx(box[2]+10)}" y2="${F+2}" stroke="var(--accent)" stroke-width="2.5" stroke-dasharray="6 5"/>`;break;
      case'lineV':back+=`<line x1="${fx((box[0]+box[2])/2)}" y1="${F-4}" x2="${fx((box[0]+box[2])/2)}" y2="${F+4}" stroke="var(--accent)" stroke-width="3"/>`;break;
      case'water':case'waterDeep':{const y=n==='water'?(J.sh?J.sh[1]+16:(J.shL?J.shL[1]+16:F-110)):(J.sh?J.sh[1]+8:F-160);const w=box[2]-box[0]+60;let d=`M${fx(box[0]-30)} ${fx(y)}`;for(let i=0;i<=12;i++){const x=box[0]-30+i*w/12;d+=` L${fx(x)} ${fx(y+2*Math.sin(i+p*2*Math.PI*2))}`}d+=` L${fx(box[2]+30)} ${F+10} L${fx(box[0]-30)} ${F+10} Z`;front+=`<path d="${d}" fill="var(--water)" opacity=".55"/>`;break}
      case'dumbbellN':{const h=J.haN;if(h)front+=`<rect x="${fx(h[0]-7)}" y="${fx(h[1]-3)}" width="14" height="6" rx="2" fill="var(--prop)"/><rect x="${fx(h[0]-9)}" y="${fx(h[1]-5)}" width="4" height="10" rx="1" fill="var(--prop)"/><rect x="${fx(h[0]+5)}" y="${fx(h[1]-5)}" width="4" height="10" rx="1" fill="var(--prop)"/>`;break}
      case'dumbbells':for(const s of['L','R']){const h=J['ha'+s];front+=`<rect x="${fx(h[0]-3)}" y="${fx(h[1]-7)}" width="6" height="14" rx="2" fill="var(--prop)"/>`}break;
      case'kb':{const h=J.haN;front+=`<circle cx="${fx(h[0]+4)}" cy="${fx(h[1]+4)}" r="8" fill="var(--prop)"/>`;break}
      case'ballHands':case'ballMid':case'ballThrow':case'ballOH':case'ballToss':{const h=J.haN?J.haN:[(J.haL[0]+J.haR[0])/2,(J.haL[1]+J.haR[1])/2];front+=`<circle cx="${fx(h[0]+3)}" cy="${fx(h[1]-6)}" r="9" fill="var(--accent)" opacity=".9"/>`;break}
      case'ballHand':{const h=J.haN;front+=`<circle cx="${fx(h[0]+6)}" cy="${fx(h[1])}" r="10" fill="var(--accent)" opacity=".85"/>`;break}
      case'ballKnees':{const k=J.knN;front+=`<circle cx="${fx(k[0])}" cy="${fx(k[1]+6)}" r="7" fill="var(--accent)" opacity=".85"/>`;break}
      case'ballElbows':{const e=J.elN;back+=`<circle cx="${fx(e[0]+8)}" cy="${fx(F-22)}" r="22" fill="var(--accent)" opacity=".35"/>`;break}
      case'roll':case'roll2':case'rollKnee':{const k=n==='rollKnee'?J0.knN:n==='roll2'?J0.anN:J0.chest;back+=`<ellipse cx="${fx(k[0])}" cy="${F-6}" rx="9" ry="6" fill="${ps}" stroke="${pr}"/>`;break}
      case'strap':{const a=J.haN,b=J.toN||J.baN;if(a&&b)front+=`<line x1="${fx(a[0])}" y1="${fx(a[1])}" x2="${fx(b[0])}" y2="${fx(b[1])}" stroke="var(--band)" stroke-width="2.5"/>`;break}
      case'stickHands':{const a=J.haN;front+=`<line x1="${fx(a[0]-4)}" y1="${fx(a[1]-30)}" x2="${fx(a[0]+4)}" y2="${fx(a[1]+30)}" stroke="var(--prop)" stroke-width="3" opacity=".0"/>`;break}
      case'stickFront':{const a=J.haL,b=J.haR;front+=`<line x1="${fx(a[0])}" y1="${fx(a[1])}" x2="${fx(b[0])}" y2="${fx(b[1])}" stroke="var(--prop)" stroke-width="3.5" stroke-linecap="round"/>`;break}
      case'dowelSh':front+=`<line x1="${fx(J.shR[0]-26)}" y1="${fx(J.shR[1]-2)}" x2="${fx(J.shL[0]+26)}" y2="${fx(J.shL[1]-2)}" stroke="var(--prop)" stroke-width="3.5" stroke-linecap="round"/>`;break;
      case'dowelBack':{const a=add(J.hip,J.td,-6),b=add(J.head,J.td,10);front+=`<line x1="${fx(a[0]+(-J.fr[0])*14)}" y1="${fx(a[1]+(-J.fr[1])*14)}" x2="${fx(b[0]+(-J.fr[0])*12)}" y2="${fx(b[1]+(-J.fr[1])*12)}" stroke="var(--prop)" stroke-width="3.5" stroke-linecap="round"/>`;break}
      case'pulley':front+=`<circle cx="${fx(J.head[0])}" cy="${F-178}" r="5" fill="none" stroke="var(--prop)" stroke-width="2"/><line x1="${fx(J.haL[0])}" y1="${fx(J.haL[1])}" x2="${fx(J.head[0]+4)}" y2="${F-178}" stroke="var(--band)" stroke-width="1.6"/><line x1="${fx(J.haR[0])}" y1="${fx(J.haR[1])}" x2="${fx(J.head[0]-4)}" y2="${F-178}" stroke="var(--band)" stroke-width="1.6"/>`;break;
      case'towel':front+=`<line x1="${fx(J.haN[0])}" y1="${fx(J.haN[1])}" x2="${fx(J.haN[0]-4)}" y2="${fx(J.haN[1]-36)}" stroke="var(--band)" stroke-width="4" stroke-linecap="round"/>`;break;
      case'lever':{const w=J.haN,a=(P.lv||0);front+=`<line x1="${fx(w[0])}" y1="${fx(w[1])}" x2="${fx(w[0]+22*Math.sin(a*RAD))}" y2="${fx(w[1]-22*Math.cos(a*RAD))}" stroke="var(--prop)" stroke-width="4" stroke-linecap="round"/><circle cx="${fx(w[0]+22*Math.sin(a*RAD))}" cy="${fx(w[1]-22*Math.cos(a*RAD))}" r="4.5" fill="var(--prop)"/>`;break}
      case'bar':{const h=J.haN;front+=`<line x1="${fx(h[0])}" y1="${fx(h[1])}" x2="${fx(h[0]+70)}" y2="${F}" stroke="var(--prop)" stroke-width="4" stroke-linecap="round"/>`;break}
      case'cup':case'cupHand':{const h=J.haN;front+=`<path d="M${fx(h[0]-4)} ${fx(h[1]-10)} l2 12 l8 0 l2 -12 Z" fill="var(--prop-soft)" stroke="var(--prop)"/>`;break}
      case'press':{const a=J.toN;back+=`<rect x="${fx(a[0]-2)}" y="${fx(a[1]-30)}" width="6" height="56" rx="2" fill="${pr}" transform="rotate(-20 ${fx(a[0])} ${fx(a[1])})"/>`;break}
      case'bike':{const h=J0.hip;back+=`<circle cx="${fx(h[0]+40)}" cy="${fx(h[1]+50)}" r="16" fill="none" stroke="${pr}" stroke-width="2.5"/><line x1="${fx(h[0])}" y1="${fx(h[1]+9)}" x2="${fx(h[0]+30)}" y2="${F}" stroke="${pr}" stroke-width="3"/>`;break}
      case'stoolLow':{const a=J0.anN;back+=`<rect x="${fx(a[0]-14)}" y="${F-30}" width="34" height="30" rx="3" fill="${ps}" stroke="${pr}"/>`;break}
      case'towelFloor':back+=`<rect x="${fx(J0.toN[0]-4)}" y="${F-3}" width="40" height="4" rx="2" fill="var(--prop-soft)"/>`;break;
      case'marbles':for(let i=0;i<3;i++)back+=`<circle cx="${fx(J0.toN[0]+10+i*8)}" cy="${F-3}" r="3" fill="var(--accent)"/>`;break;
      case'weightKnee':front+=`<rect x="${fx(J.knN[0]-8)}" y="${fx(J.knN[1]-14)}" width="16" height="9" rx="2" fill="var(--prop)"/>`;break;
      case'wallFoot':back+=`<rect x="${fx(J0.toN[0]+2)}" y="${F-40}" width="6" height="40" fill="${pr}"/>`;break;
      case'pushHand':front+=`<path d="M${fx(box[0]-4)} ${fx(J.chest[1])} l12 0" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" opacity="${p<.2?1:.25}"/>`;break;
      case'pushHandBack':front+=`<path d="M${fx(box[0]-4)} ${fx(J.chest[1])} l12 0" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/>`;break;
      case'breath':{const s=(Math.sin(p*2*Math.PI)+1)/2;const m=J.nose||J.head;front+=`<circle cx="${fx(m[0]+6+6*s)}" cy="${fx(m[1]-4)}" r="${fx(1.5+2*s)}" fill="var(--water)" opacity="${fx(.3+.5*(1-s))}"/>`;break}
      case'puff':{const s=(p*2)%1;const m=J.nose||J.head;front+=`<circle cx="${fx(m[0]+6+16*s)}" cy="${fx(m[1])}" r="${fx(1.5+3*s)}" fill="var(--water)" opacity="${fx(.8-.7*s)}"/>`;break}
      case'bandSide':case'bandFront':case'bandFrontLow':case'bandBack':case'bandHigh':{const h=n==='bandFrontLow'?J.anN:J.haN;const ax=n==='bandBack'?box[0]-6:box[2]+10;const ay=n==='bandHigh'?F-170:n==='bandFrontLow'?F-8:h[1];back+=`<rect x="${fx(ax-3)}" y="${fx(Math.min(ay,F-10)-6)}" width="6" height="12" rx="2" fill="${pr}"/>`;front+=`<line x1="${fx(h[0])}" y1="${fx(h[1])}" x2="${fx(ax)}" y2="${fx(Math.min(ay,F-10))}" stroke="var(--band)" stroke-width="2.4"/>`;break}
      case'bandAnchorR':case'bandAnchorL':case'bandAnchorRLow':case'bandAnchorLHigh':case'bandAnchorLLow':{const h=n==='bandAnchorLLow'?J.anL:J.haL;const ax=/R/.test(n.slice(10))?box[0]-10:box[2]+10;const ay=/Low/.test(n)?F-10:/High/.test(n)?F-170:(J.elL?J.elL[1]+6:F-100);back+=`<rect x="${fx(ax-3)}" y="${fx(ay-6)}" width="6" height="12" rx="2" fill="${pr}"/>`;front+=`<line x1="${fx(h[0])}" y1="${fx(h[1])}" x2="${fx(ax)}" y2="${fx(ay)}" stroke="var(--band)" stroke-width="2.4"/>`;break}
      case'bandKnees':{const k=J.knN;front+=`<ellipse cx="${fx(k[0])}" cy="${fx(k[1]+2)}" rx="9" ry="4" fill="none" stroke="var(--band)" stroke-width="2.5"/>`;break}
      case'bandKnee':{const k=J.knN;front+=`<line x1="${fx(k[0])}" y1="${fx(k[1])}" x2="${fx(k[0]+30)}" y2="${F-10}" stroke="var(--band)" stroke-width="2.4"/>`;break}
      case'bandAnkles':front+=`<line x1="${fx(J.anL[0])}" y1="${fx(J.anL[1]-6)}" x2="${fx(J.anR[0])}" y2="${fx(J.anR[1]-6)}" stroke="var(--band)" stroke-width="3"/>`;break;
      case'bandAnkle':case'bandAnkleFront':case'bandAnkleBack':{const a=J.anN;const x=n==='bandAnkleBack'?box[0]-6:n==='bandAnkle'?a[0]-40:box[2]+6;front+=`<line x1="${fx(a[0])}" y1="${fx(a[1])}" x2="${fx(x)}" y2="${F-6}" stroke="var(--band)" stroke-width="2.4"/>`;break}
      case'bandFoot':{const a=J.toN;front+=`<line x1="${fx(a[0])}" y1="${fx(a[1])}" x2="${fx(a[0]+30)}" y2="${fx(a[1]+10)}" stroke="var(--band)" stroke-width="2.4"/>`;break}
      case'strapAnkles':front+=`<line x1="${fx(J.anN[0])}" y1="${fx(J.anN[1])}" x2="${fx(J.anN[0]-20)}" y2="${F}" stroke="var(--band)" stroke-width="2.4"/>`;break;
      case'strapKnees':front+=`<line x1="${fx(J.knN[0])}" y1="${fx(J.knN[1])}" x2="${fx(J.knN[0]+40)}" y2="${fx(J.knN[1]+10)}" stroke="var(--band)" stroke-width="3"/>`;break;
    }
  }
  return{back,front};
}

/* ---------- motion evaluation ---------- */
function poseAt(m,p){
  const view=m.v||'s';
  if(m.fn)return mk(view,m.fn(p));
  const K=m.k.map(x=>mk(view,x));
  let t,a,b;
  if(K.length===2){
    // there and back, with a pause at the end pose (longer for stretches)
    const hold=m.hold?.22:m.pulse?.1:.08,go=(1-2*hold)/2;
    let q;if(p<go)q=p/go;else if(p<go+hold)q=1;else if(p<2*go+hold)q=1-(p-go-hold)/go;else q=0;
    if(m.slow&&p>=go+hold)q=1-Math.pow((p-go-hold)/go,.6);
    t=ease(Math.max(0,Math.min(1,q)));a=K[0];b=K[1];
  }else{
    const n=K.length,seg=p*(n)%n,i=Math.floor(seg);t=ease(seg-i);a=K[i];b=K[(i+1)%n];
  }
  const out={};
  for(const k in a){const x=a[k],y=b[k];out[k]=typeof x==='number'?(ANG.test(k)&&k!=='ts'&&k!=='tw'&&k!=='lsL'&&k!=='lsR'&&!/^(fs|ss|ls)/.test(k)?angLerp(x,y,t):lerp(x,y,t)):x}
  if(m.pulse)out._pulse=1;
  return out;
}
const mirrorAlt=P=>{const Q=Object.assign({},P);for(const[a,b]of[['uN','uF'],['fN','fF'],['tN','tF'],['sN','sF'],['pN','pF'],['hN','hF'],['kN','kF']]){Q[a]=P[b];Q[b]=P[a]}return Q};
const mirrorBoth=P=>{const Q=Object.assign({},P);for(const[a,b]of[['uL','uR'],['fL','fR'],['tL','tR'],['sL','sR'],['fsL','fsR'],['lsL','lsR'],['ssL','ssR'],['pL','pR']]){Q[a]=P[b];Q[b]=P[a]}Q.hr=-(P.hr||0);Q.N=-(P.N||0);Q.tw=-(P.tw||0);Q.T=360-P.T;Q.X=-(P.X||0);return Q};
function pose(m,p){
  if(m.alt||m.both){const half=p<.5;let P=poseAt(m,(p%.5)*2);if(!half)P=m.alt?mirrorAlt(P):mirrorBoth(P);return P}
  return poseAt(m,p);
}

/* ---------- layout (computed once per motion) ---------- */
const cache={};
function layout(key){
  if(cache[key])return cache[key];
  const m=M[key];const view=m.v||'s';
  const fk=view==='s'?fkSide:fkFront;
  const frame=p=>{const P=pose(m,p),J=fk(P);const cs=contactPts(J,m.on||['feet'],view);
    let dy=Infinity;for(const c of cs)dy=Math.min(dy,FLOOR-c.l-c.pt[1]-c.r);if(!isFinite(dy))dy=FLOOR-80;
    return{P,J,dy}};
  const f0=frame(0);
  const ax=m.ax?f0.J[m.ax]:null;
  const first=(m.on||['feet'])[0];const anchorName=Array.isArray(first)?first[0]:first;
  const anchorPt=J=>{const cs=contactPts(J,[anchorName],view);return cs.length?cs[0].pt:J.hip};
  const x0=anchorPt(f0.J)[0];
  const place=(fr)=>{const dx=m.ax?0:x0-anchorPt(fr.J)[0];const ox=(fr.P.X||0)+dx,oy=fr.dy+(fr.P.Y||0);const J={};for(const k in fr.J){const q=fr.J[k];J[k]=Array.isArray(q)&&q.length===2&&typeof q[0]==='number'&&!['td','fr','hd','hf','pr','hpr'].includes(k)?[q[0]+ox,q[1]+oy]:q}return J};
  let bx=[Infinity,Infinity,-Infinity,-Infinity];
  for(let i=0;i<=12;i++){const J=place(frame(i/12));for(const k in J){const q=J[k];if(Array.isArray(q)&&q.length===2&&typeof q[0]==='number'&&!['td','fr','hd','hf','pr','hpr'].includes(k)){bx[0]=Math.min(bx[0],q[0]-14);bx[1]=Math.min(bx[1],q[1]-14);bx[2]=Math.max(bx[2],q[0]+14);bx[3]=Math.max(bx[3],q[1]+14)}}}
  const J0=place(f0);
  cache[key]={m,view,fk,frame,place,box:bx,J0};
  return cache[key];
}
function viewBox(L,zoom){
  let[x0,y0,x1,y1]=L.box;y1=Math.max(y1,FLOOR+8);
  if(zoom&&L.J0[zoom]){const c=L.J0[zoom];const w=zoom==='head'?(L.view==='f'?84:90):/^wr/.test(zoom)?150:135;x0=c[0]-w/2;x1=c[0]+w/2;y0=c[1]-w*.38;y1=c[1]+w*.38}
  let w=x1-x0,h=y1-y0;const R=4/3;
  if(w/h<R){const nw=h*R;x0-=(nw-w)/2;w=nw}else{const nh=w/R;y0-=(nh-h)/2;h=nh}
  const pad=w*.06;return[x0-pad,y0-pad,w+pad*2,h+pad*2];
}

/* ---------- public API ---------- */
function svgFor(key,p){
  if(key&&key.startsWith('hand:')){
    const h=handPose(key.slice(5),p);
    return`<svg viewBox="40 40 160 160" class="exfig" role="img" aria-hidden="true"><rect x="40" y="40" width="160" height="160" fill="var(--fig-bg)"/>${drawHand(h)}</svg>`;
  }
  const L=layout(M[key]?key:'stance');
  const fr=L.frame(p),J=L.place(fr);
  const vb=viewBox(L,L.m.z);
  const hl=L.m.hl||[];const pulse=!!L.m.pulse;
  const pr=props(L.m.props||[],L.J0,J,fr.P,L.view,p,L.box);
  const body=L.view==='s'?drawSide(J,fr.P,hl,pulse):drawFront(J,fr.P,hl,pulse);
  const floor=`<line x1="${fx(vb[0])}" y1="${FLOOR}" x2="${fx(vb[0]+vb[2])}" y2="${FLOOR}" stroke="var(--prop)" stroke-width="1.5" opacity=".6"/>`;
  return`<svg viewBox="${vb.map(fx).join(' ')}" class="exfig${pulse?' pulse':''}" role="img" aria-hidden="true"><rect x="${fx(vb[0])}" y="${fx(vb[1])}" width="${fx(vb[2])}" height="${fx(vb[3])}" fill="var(--fig-bg)"/>${floor}${pr.back}${body}${pr.front}</svg>`;
}
const PERIOD=3200;
let running=false;const live=new Set();
let io=null;
function tick(now){
  if(!live.size){running=false;return}
  for(const el of live){const key=el.dataset.anim;if(!key)continue;const per=(M[key]&&(M[key].fast?.5:M[key].slow?1.4:M[key].cyc?1.2:1))*PERIOD||PERIOD;el.innerHTML=svgFor(key,((now+(+el.dataset.off||0))%per)/per)}
  requestAnimationFrame(tick);
}
function watch(root){
  const els=(root||document).querySelectorAll('[data-anim]');
  const reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!io&&'IntersectionObserver'in window)io=new IntersectionObserver(es=>{for(const e of es){if(e.isIntersecting&&!reduce)live.add(e.target);else live.delete(e.target)}if(live.size&&!running){running=true;requestAnimationFrame(tick)}},{rootMargin:'40px'});
  els.forEach(el=>{el.innerHTML=svgFor(el.dataset.anim,.35);if(io)io.observe(el)});
  for(const el of [...live])if(!el.isConnected)live.delete(el);
}
window.PhysioAnim={svgFor,watch,motions:M,has:k=>!!(k&&(k.startsWith('hand:')||M[k]))};
})();
