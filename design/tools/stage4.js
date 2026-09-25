// Этап 4 «Двигаем коробки»: доска, элементы, слоты, схема. Зависит от iso-gen.js.
const M4={ground:'#E6DFD0',plate:'#EFE9DC',white:'#FBF8F2',panel:'#F4F0E8',slab70:'#E9E5DC',brick:'#CF8C6B',mark:'#E4572E',felt:'#9DB080',felt2:'#869C6C',water:'#A9C6CC',glass:'#BCD2D4',steel:'#D2CFC7',road:'#F8F5EE',street:'#F1EDE4',trunk:'#8A7458',paving:'#EDE8DE',sh:'#6F604C',amb:0.72,edge:'#5E5242',edgeOp:0.42,shOp:0.18,ts:1.3};
const res={files:{},layout:{}};
// ---- cells (world) ----
const CELLS=[
 {id:'D1',zone:'depth',x:36,y:0,w:56,d:26},{id:'D2',zone:'depth',x:140,y:0,w:56,d:26},
 {id:'S1',zone:'south',x:12,y:32,w:52,d:26},{id:'S2',zone:'south',x:70,y:32,w:52,d:26},{id:'S3',zone:'south',x:128,y:32,w:52,d:26},{id:'S4',zone:'south',x:186,y:32,w:52,d:26},
 {id:'N1',zone:'north',x:12,y:82,w:110,d:20},{id:'N2',zone:'north',x:128,y:82,w:110,d:20}];
// ---- board ----
reset(M4);
begin(0);box(-8,-34,-3,256,166,3,P.ground);
begin(2);prism([[-8,-34],[120,-34],[110,-14],[60,-8],[-8,-12]],0,1.2,P.felt);prism([[160,-34],[248,-34],[248,-2],[204,-6],[170,-16]],0,1.2,P.felt);
begin(2);prism([[-8,108],[90,106],[110,132],[-8,132]],0,1.2,P.felt);flat(circ(200,118,18,16,0,8),0.05,P.water);
begin(2);flat(rect(-8,-2,256,30),0.04,P.plate);flat(rect(-8,30,256,30),0.04,P.plate);
flat(rect(-8,58,256,4),0.06,P.paving);flat(rect(-8,62,256,14),0.07,P.road);flat(rect(-8,76,256,4),0.06,P.paving);flat(rect(-8,80,256,24),0.05,'#E9E3D3');
for(let x=-4;x<248;x+=12)Ln([x,69,0.08],[x+6,69,0.08],'#CFC7B7',1.4);
CELLS.forEach(c=>{const r=rect(c.x,c.y,c.w,c.d);const z=0.09;for(let i=0;i<4;i++){const a=r[i],b=r[(i+1)%4];Ln([a[0],a[1],z],[b[0],b[1],z],'#A99F8C',0.9)}});
[[0,4,28,10,14],[100,4,30,10,14],[206,2,34,12,14]].forEach(b=>B(b[0],b[1],0,b[2],b[3],b[4],P.slab70,{fl:2.8,lk:.88}));
[[4,-20],[30,-24],[70,-22],[180,-24],[220,-20],[10,116],[40,120],[70,118]].forEach((t,i)=>i%2?leafy(t[0],t[1],1):pine(t[0],t[1],1));
// bounds
const pts=[];OBJS.forEach(o=>o.pts.forEach(p=>pts.push(proj(p))));pts.push(proj([12,32,50]));pts.push(proj([186,32,50]));
let bx0=Math.min(...pts.map(p=>p[0])),bx1=Math.max(...pts.map(p=>p[0])),by0=Math.min(...pts.map(p=>p[1])),by1=Math.max(...pts.map(p=>p[1]));
const BW=884,BH=600;const k=Math.min(BW/(bx1-bx0),BH/(by1-by0));const vbW=BW/k,vbH=BH/k;const vbX=(bx0+bx1)/2-vbW/2,vbY=by0-(vbH-(by1-by0))/2;
res.files['board.svg']=render(BW,0.8,0,[vbX,vbY,vbW,vbH]);
const toPx=p=>{const q=proj(p);return [+((q[0]-vbX)*k).toFixed(1),+((q[1]-vbY)*k).toFixed(1)]};
res.layout.k=+k.toFixed(4);
res.layout.cells=CELLS.map(c=>({id:c.id,zone:c.zone,poly:rect(c.x,c.y,c.w,c.d).map(p=>toPx([p[0],p[1],0])),c:toPx([c.x+c.w/2,c.y+c.d/2,0])}));
// ---- pieces (anchor = cell centre on ground; common VB) ----
const PVB=[-66,-84,132,122];const pw=Math.round(PVB[2]*k),ph=Math.round(PVB[3]*k);
res.layout.piece={w:pw,h:ph,ax:Math.round(-PVB[0]*k),ay:Math.round(-PVB[1]*k)};
function towersPair(orient){reset(M4);shadow(rect(-20,-9,40,18),48);begin(3);
 box(-20,-9,0,40,18,5.5,P.panel);
 if(orient==='front'){box(-19.6,9,0.5,39.2,0.4,3.6,P.glass);for(let x=-15;x<20;x+=5)Ln([x,9.4,0.5],[x,9.4,4.1],'#8FA6A9',0.7);box(-20,9,4.3,40,1.8,0.35,P.mark)}
 else{box(-19.6,-9.4,0.5,39.2,0.4,3.6,P.glass);box(-20,-10.8,4.3,40,1.8,0.35,P.mark);box(-2.5,9,0,5,1.2,2.8,P.white);Ln([-8,9,2.8],[8,9,2.8],'#B9B0A0',0.6)}
 for(const tx of[-19,7]){box(tx,-6,5.5,12,12,44,P.white);floors(tx,-6,5.5,12,12,44,2.6,dk(P.white,.84));for(const f of[0.33,0.66])Ln([tx+12*f,6,5.5],[tx+12*f,6,49.5],dk(P.white,.8));box(tx+3.5,-2.5,49.5,5,5,2.4,P.panel)}
 return render(pw,0.9,0,PVB)}
res.files['piece-towers-pair-front.svg']=towersPair('front');
res.files['piece-towers-pair-back.svg']=towersPair('back');
reset(M4);shadow(rect(-20,-6,40,12),27);begin(3);box(-20,-6,0,40,12,27,P.slab70);floors(-20,-6,0,40,12,27,2.8,dk(P.slab70,.84));ribs(-20,-6,0,40,12,27,5,dk(P.slab70,.9));box(-6,-3,27,12,6,2.2,P.slab70);
res.files['piece-nine-storey.svg']=render(pw,0.9,0,PVB);
reset({...M4,ts:1.05});begin(2);prism(rect(-50,-9,100,18),0,0.5,P.felt);flat(rect(-50,-2,100,4),0.52,P.paving);
for(const x of[-42,-26,-10,6,22,38]){leafy(x,-5.5,0.9);}for(const x of[-34,-18,-2,14,30,46]){leafy(x,5.5,0.9);}
res.files['piece-boulevard.svg']=render(pw,0.9,0,PVB);
// ---- slots (standalone, S-cell size) ----
const sp=rect(-26,-13,52,26).map(p=>proj([p[0],p[1],0]));const sx0=Math.min(...sp.map(p=>p[0])),sy0=Math.min(...sp.map(p=>p[1]));const sW=Math.max(...sp.map(p=>p[0]))-sx0,sH=Math.max(...sp.map(p=>p[1]))-sy0;
const spath=sp.map(p=>`${((p[0]-sx0)*k+6).toFixed(1)},${((p[1]-sy0)*k+6).toFixed(1)}`).join(' ');const SW=Math.round(sW*k+12),SH=Math.round(sH*k+12);
const slot=(fill,fo,stroke,dash)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SW} ${SH}" width="${SW}" height="${SH}"><polygon points="${spath}" fill="${fill}" fill-opacity="${fo}" stroke="${stroke}" stroke-width="3" ${dash?'stroke-dasharray="8 7"':''} stroke-linejoin="round"/></svg>\n`;
res.files['slot-empty.svg']=slot('#FBF8F2',0.5,'#5E5242',true);
res.files['slot-can.svg']=slot('#9DB080',0.45,'#5E7F45',false);
res.files['slot-cannot.svg']=slot('#FFD98A',0.5,'#E4572E',true);
res.files['slot-drop-hover.svg']=slot('#FFFFFF',0.7,'#1E1D1A',false);
// ---- Pokrovsky scheme (plan, schematic) ----
const sc=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 260" width="400" height="260" font-family="IBM Plex Mono, monospace">
<rect width="400" height="260" fill="#E6DFD0"/>
<rect x="0" y="0" width="400" height="70" fill="#EFE9DC"/><rect x="0" y="74" width="400" height="56" fill="#EFE9DC"/>
<rect x="0" y="134" width="400" height="28" fill="#F8F5EE" stroke="#CFC7B7"/><text x="8" y="153" font-size="12" fill="#57524A">ЦЕНТРАЛЬНЫЙ ПРОСПЕКТ</text>
<rect x="0" y="168" width="400" height="44" fill="#9DB080"/><rect x="0" y="187" width="400" height="6" fill="#EDE8DE"/>
<g fill="#FBF8F2" stroke="#1E1D1A" stroke-width="1.5">
<rect x="70" y="20" width="80" height="24"/><rect x="245" y="20" width="80" height="24"/>
<rect x="18" y="86" width="72" height="36"/><rect x="116" y="86" width="72" height="36"/><rect x="214" y="86" width="72" height="36"/><rect x="312" y="86" width="72" height="36"/>
</g>
<g fill="#FFFFFF" stroke="#1E1D1A" stroke-width="1.5">
<rect x="20" y="90" width="22" height="22"/><rect x="66" y="90" width="22" height="22"/><rect x="118" y="90" width="22" height="22"/><rect x="164" y="90" width="22" height="22"/><rect x="216" y="90" width="22" height="22"/><rect x="262" y="90" width="22" height="22"/><rect x="314" y="90" width="22" height="22"/><rect x="360" y="90" width="22" height="22"/>
</g>
<g fill="#E4572E"><rect x="18" y="120" width="72" height="4"/><rect x="116" y="120" width="72" height="4"/><rect x="214" y="120" width="72" height="4"/><rect x="312" y="120" width="72" height="4"/></g>
<g font-size="11" fill="#1E1D1A"><text x="8" y="62">9-ЭТАЖКИ — В ГЛУБИНЕ МКР</text><text x="8" y="230">СЕВЕР · БУЛЬВАР</text><text x="232" y="230">ЮГ ↑ · МАГАЗИНЫ К ПРОСПЕКТУ</text></g>
<text x="8" y="252" font-size="10" fill="#57524A">СХЕМА, НЕ В МАСШТАБЕ · ПОЗИЦИИ ПАР УТОЧНИТЬ ПО OSM</text>
</svg>
`;
res.files['scheme-pokrovsky.svg']=sc;
res
