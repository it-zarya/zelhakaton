// Генератор изометрических SVG (стиль «макет»). Запуск: run_script → eval(readFile).
const C=Math.cos(Math.PI/6);
const proj=p=>[(p[0]-p[1])*C,(p[0]+p[1])*0.5-p[2]];
const h2=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const toHex=c=>'#'+c.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
const mix=(a,b,t)=>{const A=h2(a),B=h2(b);return toHex(A.map((v,i)=>v+(B[i]-v)*t))};
const norm=v=>{const l=Math.hypot(...v)||1;return v.map(x=>x/l)};
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const avg=ps=>{const s=[0,0,0];ps.forEach(p=>{s[0]+=p[0];s[1]+=p[1];s[2]+=p[2]});return s.map(v=>v/ps.length)};
function newell(pts){let n=[0,0,0];for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];n[0]+=(a[1]-b[1])*(a[2]+b[2]);n[1]+=(a[2]-b[2])*(a[0]+b[0]);n[2]+=(a[0]-b[0])*(a[1]+b[1]);}return norm(n)}
const L=norm([-0.25,0.75,1.3]);
let P,OBJS,O;
function reset(pal){P=pal;OBJS=[];O=null}
function begin(layer=3){O={layer,items:[],pts:[]};OBJS.push(O);return O}
function S(faces,col,op){O.items.push({t:'s',faces,col:col||P.white,op});faces.forEach(f=>f.forEach(p=>O.pts.push(p)))}
function Ln(a,b,col,w=0.6){O.items.push({t:'l',a,b,col,w});}
const rect=(x,y,w,d)=>[[x,y],[x+w,y],[x+w,y+d],[x,y+d]];
const cent2=p=>[p.reduce((s,q)=>s+q[0],0)/p.length,p.reduce((s,q)=>s+q[1],0)/p.length];
function prism(poly,z0,h,col,op){const bot=poly.map(p=>[p[0],p[1],z0]),top=poly.map(p=>[p[0],p[1],z0+h]);const f=[bot,top];for(let i=0;i<poly.length;i++){const j=(i+1)%poly.length;f.push([bot[i],bot[j],top[j],top[i]])}S(f,col,op)}
function box(x,y,z,w,d,h,col,op){prism(rect(x,y,w,d),z,h,col,op)}
function pyr(poly,z0,apex,col){const bot=poly.map(p=>[p[0],p[1],z0]);const f=[bot];for(let i=0;i<poly.length;i++){const j=(i+1)%poly.length;f.push([bot[i],bot[j],apex])}S(f,col)}
function frus(poly,z0,h,s,col){const c=cent2(poly);const top=poly.map(p=>[c[0]+(p[0]-c[0])*s,c[1]+(p[1]-c[1])*s,z0+h]);const bot=poly.map(p=>[p[0],p[1],z0]);const f=[bot,top];for(let i=0;i<poly.length;i++){const j=(i+1)%poly.length;f.push([bot[i],bot[j],top[j],top[i]])}S(f,col)}
const circ=(cx,cy,r,n=12,a0=0,ry)=>Array.from({length:n},(_,i)=>{const a=a0+i/n*Math.PI*2;return [cx+Math.cos(a)*r,cy+Math.sin(a)*(ry??r)]});
function flat(poly,z,col,op){S([poly.map(p=>[p[0],p[1],z])],col,op)}
function hull(pts){pts=pts.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);const lo=[],up=[];for(const p of pts){while(lo.length>=2&&cr(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();lo.push(p)}for(const p of pts.slice().reverse()){while(up.length>=2&&cr(up[up.length-2],up[up.length-1],p)<=0)up.pop();up.push(p)}return lo.slice(0,-1).concat(up.slice(0,-1))}
function shadow(poly,h,z=0){if(!P.shOp)return;const k=0.55;const sd=[-L[0]/L[2]*h*k,-L[1]/L[2]*h*k];const cur=O;begin(1);flat(hull(poly.concat(poly.map(p=>[p[0]+sd[0],p[1]+sd[1]]))),z+0.02,P.sh,P.shOp);O=cur}
const dk=(c,t)=>mix(P.sh,c,t);
function floors(x,y,z,w,d,h,step,col,skipTop=0.3){for(let k=step;k<h-skipTop;k+=step){Ln([x,y+d,z+k],[x+w,y+d,z+k],col);Ln([x+w,y,z+k],[x+w,y+d,z+k],col)}}
function ribs(x,y,z,w,d,h,step,col){for(let k=step;k<w-0.1;k+=step)Ln([x+k,y+d,z],[x+k,y+d,z+h],col);for(let k=step;k<d-0.1;k+=step)Ln([x+w,y+k,z],[x+w,y+k,z+h],col)}
function B(x,y,z,w,d,h,col,opt={}){if(z<1)shadow(rect(x,y,w,d),h+z);begin(3);box(x,y,z,w,d,h,col);if(opt.fl)floors(x,y,z,w,d,h,opt.fl,dk(col,opt.lk??0.82));if(opt.rb)ribs(x,y,z,w,d,h,opt.rb,dk(col,opt.lk??0.82));return O}
function pine(x,y,s=1){s*=(P.ts||1);shadow(circ(x,y,1.8*s,6),9*s);begin(3);box(x-.3*s,y-.3*s,0,.6*s,.6*s,1.4*s,P.trunk);pyr(circ(x,y,2.4*s,7,0.3),1.2*s,[x,y,6.2*s],P.felt2);pyr(circ(x,y,1.8*s,7,0.7),4*s,[x,y,9*s],P.felt2)}
function leafy(x,y,s=1){s*=(P.ts||1);shadow(circ(x,y,2.4*s,6),7*s);begin(3);box(x-.3*s,y-.3*s,0,.6*s,.6*s,2*s,P.trunk);const c=circ(x,y,2.6*s,7,0.2);pyr(c,3.8*s,[x,y,1.6*s],P.felt);prism(c,3.8*s,1.4*s,P.felt);pyr(c,5.2*s,[x,y,7.4*s],P.felt)}
function plate(w,d,col,t=3){col=col||P.ground;begin(0);box(0,0,-t,w,d,t,col);Ln([0,d,-t/2],[w,d,-t/2],dk(col,.85),0.5);Ln([w,0,-t/2],[w,d,-t/2],dk(col,.85),0.5)}
function topo(objs){const s=objs.filter(o=>o.layer===3);const info=s.map(o=>{const xs=o.pts.map(p=>p[0]),ys=o.pts.map(p=>p[1]);const sc=o.pts.map(proj);return {o,x0:Math.min(...xs),x1:Math.max(...xs),y0:Math.min(...ys),y1:Math.max(...ys),sx0:Math.min(...sc.map(q=>q[0])),sx1:Math.max(...sc.map(q=>q[0])),sy0:Math.min(...sc.map(q=>q[1])),sy1:Math.max(...sc.map(q=>q[1]))}});const n=info.length,adj=info.map(()=>[]);const e=0.01;for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){const a=info[i],b=info[j];if(a.sx1<=b.sx0||b.sx1<=a.sx0||a.sy1<=b.sy0||b.sy1<=a.sy0)continue;const ab=a.x1<=b.x0+e||a.y1<=b.y0+e, ba=b.x1<=a.x0+e||b.y1<=a.y0+e;let first;if(ab&&!ba)first=i;else if(ba&&!ab)first=j;else first=((a.x0+a.x1+a.y0+a.y1)<=(b.x0+b.x1+b.y0+b.y1))?i:j;if(first===i)adj[i].push(j);else adj[j].push(i)}
const order=[],st=new Array(n).fill(0);const idx=[...Array(n).keys()].sort((p,q)=>(info[q].x0+info[q].y0)-(info[p].x0+info[p].y0));function dfs(u){if(st[u])return;st[u]=1;adj[u].forEach(dfs);order.push(u)}idx.forEach(dfs);order.reverse();return order.map(i=>info[i].o)}
function render(outW=640,strokePx=0.9,pad=0.05){const objs=[...OBJS.filter(o=>o.layer<3).sort((a,b)=>a.layer-b.layer),...topo(OBJS)];const paths=[];const all=[];objs.forEach(o=>o.pts.forEach(p=>all.push(proj(p))));let x0=Math.min(...all.map(p=>p[0])),x1=Math.max(...all.map(p=>p[0])),y0=Math.min(...all.map(p=>p[1])),y1=Math.max(...all.map(p=>p[1]));const pw=(x1-x0)*pad,ph=(y1-y0)*pad+(x1-x0)*0.02;x0-=pw;x1+=pw;y0-=ph;y1+=ph;const W=x1-x0,H=y1-y0;const sw=strokePx*W/outW;const f2=v=>(+v.toFixed(2));
for(const o of objs)for(const it of o.items){if(it.t==='l'){const a=proj(it.a),b=proj(it.b);paths.push(`<path d="M${f2(a[0])} ${f2(a[1])}L${f2(b[0])} ${f2(b[1])}" stroke="${it.col}" stroke-width="${f2(sw*it.w)}" fill="none"/>`);continue}
const cen=it.faces.length>1?avg(it.faces.flat()):null;const vis=[];for(const f of it.faces){let n=newell(f);if(cen){if(dot(n,sub(avg(f),cen))<0)n=n.map(v=>-v)}else if(n[2]<0)n=n.map(v=>-v);if(dot(n,[1,1,1])<=1e-4)continue;const t=Math.min(1,P.amb+(1-P.amb)*Math.max(0,dot(n,L))/L[2]);vis.push({f,col:mix(P.sh,it.col,t)})}
for(const v of vis){const d='M'+v.f.map(p=>{const q=proj(p);return f2(q[0])+' '+f2(q[1])}).join('L')+'Z';const op=it.op!=null?` fill-opacity="${it.op}"`:'';const stroke=(it.op!=null&&it.op<1)?'':` stroke="${P.edge}" stroke-opacity="${P.edgeOp}" stroke-width="${f2(sw)}"`;paths.push(`<path d="${d}" fill="${v.col}"${op}${stroke}/>`)}}
const outH=Math.round(outW*H/W);return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f2(x0)} ${f2(y0)} ${f2(W)} ${f2(H)}" width="${outW}" height="${outH}" stroke-linejoin="round">\n${paths.join('\n')}\n</svg>\n`}
