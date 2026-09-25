// Этап 4 v3: свободная расстановка на сетке. Зависит от iso-gen.js.
const M4={ground:'#E6DFD0',plate:'#EFE9DC',white:'#FBF8F2',panel:'#F4F0E8',slab70:'#E9E5DC',mark:'#E4572E',felt:'#9DB080',felt2:'#869C6C',water:'#A9C6CC',glass:'#BCD2D4',steel:'#D2CFC7',road:'#F8F5EE',trunk:'#8A7458',paving:'#EDE8DE',sh:'#6F604C',amb:0.72,edge:'#5E5242',edgeOp:0.42,shOp:0.18,ts:1.2};
const G=8,COLS=30,ROWS=14;
// zones by row: 0-5 depth, 6-8 south, 9-10 road, 11-13 north
const OBS=[ // [type,c0,r0,w,h]
 ['F',0,0,6,4],['H',8,0,6,2],['W',20,0,5,3],['F',25,0,5,6],['H',14,2,2,4],['F',8,4,4,2],['H',20,4,5,2],['F',0,6,4,3]];
const grid=[...Array(ROWS)].map((_,r)=>[...Array(COLS)].map(()=>r>=9&&r<=10?'R':'.'));
OBS.forEach(([t,c0,r0,w,h])=>{for(let r=r0;r<r0+h;r++)for(let c=c0;c<c0+w;c++)grid[r][c]=t});
// packing check for 5×2 nine-storeys in depth
function maxPack(){const g=grid.slice(0,6).map(r=>r.slice());let best=0,rot=0;function fits(c,r,w,h){if(c+w>COLS||r+h>6)return false;for(let y=r;y<r+h;y++)for(let x=c;x<c+w;x++)if(g[y][x]!=='.')return false;return true}function set(c,r,w,h,v){for(let y=r;y<r+h;y++)for(let x=c;x<c+w;x++)g[y][x]=v}
function rec(i,n){if(n>best)best=n;if(i>=6*COLS)return;const r=Math.floor(i/COLS),c=i%COLS;if(g[r][c]==='.'){for(const [w,h] of[[5,2],[2,5]])if(fits(c,r,w,h)){set(c,r,w,h,'N');rec(i+1,n+1);set(c,r,w,h,'.')}}rec(i+1,n)}rec(0,0);return best}
const pack=maxPack();
// ---- board ----
reset(M4);
begin(0);box(-16,-40,-3,COLS*G+32,ROWS*G+72,3,P.ground);
begin(2);flat(rect(0,0,COLS*G,9*G),0.03,P.plate);flat(rect(0,11*G,COLS*G,3*G),0.03,P.plate);
flat(rect(-16,9*G,COLS*G+32,2*G),0.05,P.road);for(let x=-12;x<COLS*G+16;x+=12)Ln([x,10*G,0.06],[x+6,10*G,0.06],'#CFC7B7',1.4);
Ln([-16,9*G,0.06],[COLS*G+16,9*G,0.06],'#C9C0AE',0.8);Ln([-16,11*G,0.06],[COLS*G+16,11*G,0.06],'#C9C0AE',0.8);
for(let c=0;c<=COLS;c++){Ln([c*G,0,0.04],[c*G,9*G,0.04],'#E0D8C8',0.45);Ln([c*G,11*G,0.04],[c*G,14*G,0.04],'#E0D8C8',0.45)}
for(let r=0;r<=14;r++){if(r>9&&r<11)continue;Ln([0,r*G,0.04],[COLS*G,r*G,0.04],'#E0D8C8',0.45)}
begin(2);prism([[-16,-40],[COLS*G+16,-40],[COLS*G+16,0],[-16,0]],0,1.2,P.felt);
begin(2);prism([[-16,14*G],[COLS*G+16,14*G],[COLS*G+16,ROWS*G+32],[-16,ROWS*G+32]],0,1.2,P.felt);
OBS.forEach(([t,c0,r0,w,h])=>{const x=c0*G,y=r0*G,W=w*G,D=h*G;if(t==='F'){begin(2);prism(rect(x,y,W,D),0,1.2,P.felt)}else if(t==='W'){begin(2);flat(rect(x+1,y+1,W-2,D-2),0.06,P.water)}});
OBS.forEach(([t,c0,r0,w,h])=>{if(t==='H')B(c0*G+1.5,r0*G+1.5,0,w*G-3,h*G-3,14,P.slab70,{fl:2.8,lk:.88})});
const trees=[];OBS.forEach(([t,c0,r0,w,h])=>{if(t!=='F')return;for(let r=r0;r<r0+h;r+=2)for(let c=c0;c<c0+w;c+=2)trees.push([c*G+G*(0.8+((c*7+r*3)%5)/5),r*G+G*(0.8+((c*3+r*5)%5)/5),(c+r)%3]);});
[[10,-24],[40,-30],[90,-20],[150,-28],[200,-22],[230,-30],[20,122],[70,128],[130,120],[190,126],[230,122]].forEach((t,i)=>trees.push([t[0],t[1],i%3]));
trees.forEach(([x,y,v])=>v===1?leafy(x,y,0.9):pine(x,y,0.95));
const pts=[];OBS&&OBJS.forEach(o=>o.pts.forEach(p=>pts.push(proj(p))));pts.push(proj([4*G,6*G,52]));
let bx0=Math.min(...pts.map(p=>p[0])),bx1=Math.max(...pts.map(p=>p[0])),by0=Math.min(...pts.map(p=>p[1])),by1=Math.max(...pts.map(p=>p[1]));
const BW=884,BH=600;const k=Math.min(BW/(bx1-bx0),BH/(by1-by0));const vbW=BW/k,vbH=BH/k;const vbX=(bx0+bx1)/2-vbW/2,vbY=by0-(vbH-(by1-by0))/2;
const out={files:{},layout:{G,COLS,ROWS,k:+k.toFixed(5),vbX:+vbX.toFixed(4),vbY:+vbY.toFixed(4),grid:grid.map(r=>r.join('')),pack}};
out.files['board.svg']=render(BW,0.8,0,[vbX,vbY,vbW,vbH]);
// ---- sprites (anchor: footprint centre) ----
const PVB=[-50,-82,100,114];const pw=Math.round(PVB[2]*k),ph=Math.round(PVB[3]*k);out.layout.sprite={w:pw,h:ph,ax:Math.round(-PVB[0]*k),ay:Math.round(-PVB[1]*k)};
function towers(o){reset(M4);const along=o==='front'||o==='back';const W=along?46:20,D=along?20:46;shadow(rect(-W/2,-D/2,W,D),48);begin(3);box(-W/2,-D/2,0,W,D,5.5,P.panel);
 const shop=(x,y,w,d)=>{box(x,y,0.5,w,d,3.6,P.glass)};
 if(o==='front'){shop(-W/2+0.4,D/2,W-0.8,0.4);box(-W/2,D/2,4.3,W,1.8,0.35,P.mark)}
 if(o==='back'){shop(-W/2+0.4,-D/2-0.4,W-0.8,0.4);box(-W/2,-D/2-1.8,4.3,W,1.8,0.35,P.mark);box(-2.5,D/2,0,5,1.2,2.8,P.white)}
 if(o==='east'){shop(W/2,-D/2+0.4,0.4,D-0.8);box(W/2,-D/2,4.3,1.8,D,0.35,P.mark)}
 if(o==='west'){shop(-W/2-0.4,-D/2+0.4,0.4,D-0.8);box(-W/2-1.8,-D/2,4.3,1.8,D,0.35,P.mark);box(W/2,-2.5,0,1.2,5,2.8,P.white)}
 const T=along?[[-21,-6.5],[8,-6.5]]:[[-6.5,-21],[-6.5,8]];
 for(const [tx,ty] of T){box(tx,ty,5.5,13,13,44,P.white);floors(tx,ty,5.5,13,13,44,2.6,dk(P.white,.84));for(const f of[0.33,0.66]){Ln([tx+13*f,ty+13,5.5],[tx+13*f,ty+13,49.5],dk(P.white,.8));Ln([tx+13,ty+13*f,5.5],[tx+13,ty+13*f,49.5],dk(P.white,.8))}box(tx+4,ty+4,49.5,5,5,2.4,P.panel)}
 return render(pw,0.9,0,PVB)}
['front','east','back','west'].forEach(o=>out.files[`towers-${o}.svg`]=towers(o));
function nine(along){reset(M4);const W=along?38:13,D=along?13:38;shadow(rect(-W/2,-D/2,W,D),27);begin(3);box(-W/2,-D/2,0,W,D,27,P.slab70);floors(-W/2,-D/2,0,W,D,27,2.8,dk(P.slab70,.84));ribs(-W/2,-D/2,0,W,D,27,5,dk(P.slab70,.9));box(along?-6:-3,along?-3:-6,27,along?12:6,along?6:12,2.2,P.slab70);return render(pw,0.9,0,PVB)}
out.files['nine-along.svg']=nine(true);out.files['nine-across.svg']=nine(false);
function boul(along){reset({...M4,ts:1});const W=along?62:22,D=along?22:62;begin(2);prism(rect(-W/2,-D/2,W,D),0,0.5,P.felt);flat(along?rect(-W/2,-2,W,4):rect(-2,-D/2,4,D),0.52,P.paving);
 const n=5;for(let i=0;i<n;i++){const t=-W/2+6+i*(Math.max(W,D)-12)/(n-1);if(along){leafy(t,-6,0.9);leafy(t,6,0.9)}else{leafy(-6,-D/2+6+i*(D-12)/(n-1),0.9);leafy(6,-D/2+6+i*(D-12)/(n-1),0.9)}}
 return render(pw,0.9,0,PVB)}
out.files['boulevard-along.svg']=boul(true);out.files['boulevard-across.svg']=boul(false);
out
