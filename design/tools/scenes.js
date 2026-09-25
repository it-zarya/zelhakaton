const MAKET={ground:'#E6DFD0',plate:'#EFE9DC',white:'#FBF8F2',panel:'#F4F0E8',slab70:'#E9E5DC',brick:'#CF8C6B',ind:'#D5D0C6',priv:'#E3D3B5',mark:'#E4572E',felt:'#9DB080',felt2:'#869C6C',water:'#A9C6CC',glass:'#BCD2D4',wood:'#C4935F',steel:'#D2CFC7',bronze:'#846F58',road:'#F8F5EE',street:'#F1EDE4',rail:'#5B574F',grown:'#FFD98A',ghost:'#DAD2C1',trunk:'#8A7458',paving:'#EDE8DE',sh:'#6F604C',amb:0.72,edge:'#5E5242',edgeOp:0.42,shOp:0.18,ts:1.6};
const out={};
function tower(x,y,w,d,h,col){B(x,y,0,w,d,h,col,{fl:2.8,lk:.86});box(x+w*.3,y+d*.3,h,w*.4,d*.4,2.6,col);for(const k of[0.2,0.5,0.8]){Ln([x+w*k,y+d,0],[x+w*k,y+d,h],dk(col,.78))}Ln([x+w,y+d*.5,0],[x+w,y+d*.5,h],dk(col,.78))}
function sFleyta(){reset(MAKET);plate(172,66);begin(2);flat([[0,44],[172,44],[172,50],[0,50]],0.03,P.road);
[12,40,70,100,132,160].forEach((x,i)=>pine(x,6+(i%2)*4,1.1));
shadow(rect(12,22,146,13),31);begin(3);
for(let x=14;x<157;x+=6){box(x,23,0,1.2,1.2,3.3,P.steel)}for(let x=14;x<157;x+=6){box(x,33,0,1.2,1.2,3.3,P.steel)}
box(12,22,3.3,146,13,26.2,P.white);floors(12,22,3.3,146,13,26.2,2.9,dk(P.white,.8));ribs(12,22,3.3,146,13,26.2,6,dk(P.white,.88));
box(12,22,29.5,146,13,2.2,P.panel);[28,64,100,136].forEach(x=>box(x,25,31.7,6,7,2.6,P.panel));
[[28,58,1.2],[70,60,1],[122,57,1.3]].forEach(t=>pine(...t));leafy(96,58,1.1);leafy(150,60,1);
out['buildings/fleyta-360.svg']=render(720)}
function sKC(){reset(MAKET);plate(120,120);begin(2);flat(circ(60,60,56,3,Math.PI/4),0.03,P.paving);
const tri=(r,a0=Math.PI/4)=>circ(60,60,r,3,a0);
shadow(tri(50),22);begin(3);prism(tri(50),0,4,P.white);prism(tri(41),4,16,P.white);
const T=tri(41);const edgeRibs=(a,b)=>{for(let k=1;k<7;k++){const t=k/7;const p=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];Ln([p[0],p[1],4],[p[0],p[1],20],dk(P.white,.84))}};edgeRibs(T[0],T[1]);edgeRibs(T[2],T[0]);
Ln([...T[0],12],[...T[1],12],dk(P.white,.84));Ln([...T[2],12],[...T[0],12],dk(P.white,.84));
pyr(tri(16),20,[60,60,31],P.glass);
[[8,20],[16,8],[104,104],[112,88],[8,100],[20,112],[100,10]].forEach(([x,y],i)=>i%2?leafy(x,y,1.2):pine(x,y,1.2));
out['buildings/kc-zelenograd.svg']=render(640)}
function sShtyki(){reset(MAKET);plate(76,76);
shadow(circ(38,38,20,16),12);begin(3);frus(circ(38,38,22,16),0,10,0.3,P.felt);
const bs=[0,1,2].map(i=>{const a=Math.PI/4+i*2*Math.PI/3;return {x:38+Math.cos(a)*2.6,y:38+Math.sin(a)*2.6,a}}).sort((p,q)=>(p.x+p.y)-(q.x+q.y));
box(33,33,10,10,10,0.6,P.paving);
bs.forEach(b=>{pyr(circ(b.x,b.y,2.2,3,b.a),10.6,[38+Math.cos(b.a)*0.5,38+Math.sin(b.a)*0.5,10+42],P.steel)});
[[6,8],[18,5],[70,14],[8,68],[70,62],[62,72]].forEach(t=>pine(t[0],t[1],1));
out['buildings/shtyki.svg']=render(560)}
function sVulykh(){reset(MAKET);plate(120,104);
[[6,8],[30,4],[100,6],[8,60],[112,50],[52,40],[92,40],[18,96],[70,96],[110,94],[84,70],[4,34]].forEach((t,i)=>pine(t[0],t[1],1.15+(i%3)*0.12));
tower(18,14,17,14,40,P.brick);tower(62,18,17,14,40,P.brick);tower(34,60,17,14,40,P.brick);
out['buildings/vulykh-towers.svg']=render(600)}
function sTowers(){reset(MAKET);plate(136,90);begin(2);flat([[0,62],[136,62],[136,74],[0,74]],0.03,P.road);flat([[0,54],[136,54],[136,60],[0,60]],0.03,P.paving);
shadow(rect(10,30,114,20),6);begin(3);box(10,30,0,114,20,5,P.panel);box(10.2,49.6,0.5,113.6,0.4,3.4,P.glass);
tower(22,28,20,20,46,P.white);tower(84,28,20,20,46,P.white);
[8,30,52,74,96,118].forEach(x=>leafy(x,82,0.9));
out['buildings/towers-central.svg']=render(600)}
function sDvorets(){reset(MAKET);plate(146,96);begin(2);flat(rect(4,68,138,24),0.03,P.paving);
B(10,22,0,30,30,8,P.white,{fl:4});
shadow(rect(40,8,26,20),15);begin(3);box(40,8,0,26,20,14,P.white);box(49,14,14,8,8,2,P.white);frus(circ(53,18,4,10),16,2,0.7,P.steel);pyr(circ(53,18,2.8,10),18,[53,18,21],P.steel);
shadow(rect(56,34,64,28),7);begin(3);box(58,36,0,60,24,4.2,P.glass);ribs(58,36,0,60,24,4.2,4,dk(P.glass,.8));box(56,34,4.2,64,28,2.4,P.white);box(96,40,6.6,22,18,3.4,P.white);
[[8,76,1],[26,82,1.1],[128,80,1],[132,16,1.2],[20,8,1.2]].forEach((t,i)=>i%2?pine(...t):leafy(...t));
out['buildings/dvorets-kolumba.svg']=render(640)}
function sElectron(){reset(MAKET);plate(116,96);begin(2);flat(rect(10,62,96,30),0.03,P.paving);
tower(74,4,15,15,40,P.brick);
shadow(rect(20,18,44,32),13);begin(3);box(20,18,0,44,32,13,P.white);ribs(20,18,0,44,32,13,5.5,dk(P.white,.88));box(18,16,13,48,36,1,P.panel);
shadow(rect(20,50,44,9),6);begin(3);box(20,50,0,44,9,6,P.glass);ribs(20,50,0,44,9,6,4,dk(P.glass,.78));box(17,48,6,50,13,0.9,P.white);
[[8,20],[8,44],[96,84],[100,60]].forEach(t=>leafy(t[0],t[1],1.1));
out['buildings/electron.svg']=render(560)}
function s118(){reset(MAKET);plate(92,64);begin(2);flat(rect(0,44,92,5),0.03,P.street);
B(14,18,0,62,12,11.2,P.white,{fl:2.8});
for(let z of[2.8,5.6,8.4])for(let x=17;x<74;x+=7.6){box(x,30,z,2.6,1.3,0.9,P.panel)}
[[6,8],[84,10],[40,6]].forEach(t=>leafy(t[0],t[1],1.1));[[10,56],[46,58],[82,56]].forEach(t=>leafy(t[0],t[1],1));
out['buildings/korp-118.svg']=render(560)}
function sHram(){reset(MAKET);plate(70,62);begin(2);flat(rect(18,42,30,16),0.03,P.paving);
shadow(rect(24,20,18,14),14);begin(3);
box(35,23,0,6,8,4.6,P.wood);pyr(rect(35,23,6,8),4.6,[38,27,7],P.wood);prism(circ(38,27,0.7,8),7,1,P.wood);pyr(circ(38,27,0.9,8),8,[38,27,9.6],P.felt2);
box(25,22,0,10,10,6.5,P.wood);floors(25,22,0,10,10,6.5,0.8,dk(P.wood,.82),0.1);pyr(rect(24.6,21.6,10.8,10.8),6.5,[30,27,10],P.wood);
prism(circ(30,27,1.3,8),9.2,1.8,P.wood);frus(circ(30,27,1.3,8),11,0.9,1.35,P.felt2);pyr(circ(30,27,1.75,8),11.9,[30,27,14.4],P.felt2);
box(29.88,26.88,14.2,0.24,0.24,2.2,P.steel);box(29.4,26.88,15.5,1.2,0.24,0.24,P.steel);
box(27,32,0,6,4,3.4,P.wood);pyr(rect(26.8,31.8,6.4,4.4),3.4,[30,34,5.4],P.wood);
[[8,8],[20,6],[52,8],[62,20],[6,30],[62,46]].forEach(t=>pine(t[0],t[1],1.1));
out['buildings/hram-sergiya.svg']=render(520)}
function sArch(){reset(MAKET);plate(34,26);begin(2);flat(circ(28,5,5,10,0,3.4),0.03,P.water);flat(rect(0,18,34,5),0.03,P.street);
shadow(rect(5,8,17,6),3);begin(3);
const c=P.bronze;box(6,9,0,0.8,4,1.8,c);box(20,9,0,0.8,4,1.8,c);box(5,8,1.8,17,5.4,0.4,c);box(5,8,2.2,17,0.6,3.4,c);
box(11.8,8.8,2.2,3.2,1.8,3.8,c);box(10.4,9,3.1,1,1.4,2.6,c);box(15.4,9,3.1,1,1.4,2.6,c);
box(11.8,10.6,2.2,3.2,3.4,1.2,c);box(12,13.4,0,2.8,1.1,2.4,c);box(11.8,13.2,0,3.2,1.8,0.5,c);
prism(circ(13.4,9.8,0.95,8),6,1.9,c);box(15.8,10.4,3.4,0.5,3.6,2.8,P.white);
out['buildings/arkhitektor.svg']=render(480)}
function sEgg(){reset(MAKET);plate(40,40,P.paving,1.5);
begin(3);prism(circ(20,20,2,12),0,22.5,P.white);
for(let i=0;i<22;i++){const a=-Math.PI*0.25+i*(Math.PI/10.5),b=a+Math.PI/10.5;begin(3);prism([[20+Math.cos(a)*2,20+Math.sin(a)*2],[20+Math.cos(a)*9,20+Math.sin(a)*9],[20+Math.cos(b)*9,20+Math.sin(b)*9],[20+Math.cos(b)*2,20+Math.sin(b)*2]],i,0.5,P.mark)}
out['buildings/egg-pokrovskogo.svg']=render(420)}
[sFleyta,sKC,sShtyki,sVulykh,sTowers,sDvorets,sElectron,s118,sHram,sArch,sEgg].forEach(f=>f());

const ICON={...MAKET,white:'#FFFFFF',panel:'#FFFFFF',sh:'#9C9181',amb:0.62,edge:'#1E1D1A',edgeOp:1,shOp:0};
function ib(x,y,z,w,d,h,col){begin(3);box(x,y,z,w,d,h,col||P.white)}
const icons=[
 ()=>{ib(0,0,0,24,8,10)},
 ()=>{ib(0,8,0,20,12,5);ib(14,0,0,7,7,22)},
 ()=>{begin(3);for(let x=1;x<30;x+=5){box(x,1,0,1,1,3)}box(0,0,3,32,6,9)},
 ()=>{ib(0,0,0,9,9,24);ib(14,0,0,9,9,24)},
 ()=>{ib(0,0,0,7,7,18);ib(11,4,0,7,7,18);ib(3,13,0,7,7,18)},
 ()=>{ib(0,0,0,30,30,1);[[3,3],[17,3],[3,17],[17,17]].forEach(([x,y])=>ib(x,y,1,10,10,1.5))},
 ()=>{begin(3);prism(circ(0,0,16,3,Math.PI/4),0,7);pyr(circ(0,0,7,3,Math.PI/4),7,[0,0,14],P.mark)},
 ()=>{begin(2);flat([[-2,12],[34,12],[34,15],[-2,15]],0,'#1E1D1A');ib(2,0,0,9,9,12);ib(18,20,0,9,9,16)},
 ()=>{ib(0,0,0,6,20,26);begin(2);flat(circ(22,12,7,10),0,'#FFFFFF')}
];
icons.forEach((f,i)=>{reset(ICON);f();out[`stages/stage-${i+1}.svg`]=render(96,1.6,0.12)});

const PAL={maket:MAKET,
 noon:{...MAKET,ground:'#CBD79E',plate:'#EAD9B4',white:'#F6F3EC',panel:'#F1EDE4',slab70:'#E6E3DC',brick:'#DA9463',ind:'#CFCBC2',priv:'#E7C79A',mark:'#F08A24',felt:'#8BAA63',felt2:'#779552',water:'#7DB3CA',road:'#DCCDA9',street:'#E4D8BC',rail:'#55504A',grown:'#FFE08A',ghost:'#BCC690',sh:'#56627A',amb:0.66,edge:'#4B4C52',edgeOp:0.3},
 postcard:{...MAKET,ground:'#E9DDC2',plate:'#F2E6CC',white:'#F7EEDD',panel:'#F1E5CF',slab70:'#EADCC2',brick:'#C96B4E',ind:'#D9CDB6',priv:'#E7C983',mark:'#D23F2E',felt:'#6E9E8A',felt2:'#5C8B79',water:'#6CA9B8',road:'#F7EFDD',street:'#EFE3CB',rail:'#4B4640',grown:'#F2C94C',ghost:'#DCCDB0',sh:'#6B4E3E',amb:0.7,edge:'#4B3A2E',edgeOp:0.5}};
function district(pal){reset(pal);plate(200,140);
begin(2);prism([[0,0],[60,0],[70,18],[50,32],[15,36],[0,26]],0,1.2,P.felt);begin(2);prism([[82,0],[130,0],[126,12],[92,16]],0,1.2,P.felt);begin(2);prism([[150,96],[200,86],[200,122],[134,122],[134,112]],0,1.2,P.felt);
begin(2);flat(circ(80,44,12,14,0,7),0.05,P.water);
begin(2);flat([[0,58],[200,58],[200,65],[0,65]],0.06,P.road);begin(2);flat([[98,0],[102,0],[102,140],[98,140]],0.07,P.street);
begin(2);flat(rect(6,68,88,50),0.08,P.plate);flat(rect(106,18,44,36),0.08,P.plate);flat(rect(154,12,42,42),0.08,P.plate);flat(rect(106,68,90,26),0.08,P.plate);
begin(2);box(0,124,0,200,3,0.6,P.rail);for(let x=1;x<200;x+=3)Ln([x,124,0.6],[x+1,127,0.6],mix(P.rail,'#ffffff',0.35),0.5);
B(10,72,0.1,36,9,13,P.panel,{fl:2.8});B(10,88,0.1,36,9,13,P.panel,{fl:2.8});B(52,72,0.1,9,30,13,P.panel,{fl:2.8});
begin(2);box(10,104,0.1,36,9,0.5,P.ghost);box(52,106,0.1,36,9,0.5,P.ghost);box(68,72,0.1,9,28,0.5,P.ghost);
B(110,22,0.1,10,28,36,P.slab70,{fl:2.8,lk:.88});B(126,22,0.1,10,28,42,P.slab70,{fl:2.8,lk:.88});
tower(158,16,11,11,40,P.brick);tower(178,30,11,11,44,P.brick);
B(8,42,0,26,12,7,P.ind);B(38,40,0,18,14,9,P.ind);
for(let i=0;i<6;i++){const x=6+i*9,y=130+(i%2)*3;shadow(rect(x,y,5,5),4);begin(3);box(x,y,0,5,5,2.4,P.priv);pyr(rect(x,y,5,5),2.4,[x+2.5,y+2.5,4.4],P.priv)}
shadow(rect(108,72,82,8),25);begin(3);for(let x=110;x<189;x+=8){box(x,73,0,1,1,3,P.steel);box(x,78,0,1,1,3,P.steel)}box(108,72,3,82,8,22,P.mark);floors(108,72,3,82,8,22,2.9,dk(P.mark,.84));
B(112,84,0.1,26,8,16,P.grown,{fl:2.8});B(150,84,0.1,26,8,16,P.grown,{fl:2.8});
[[20,20],[40,10],[10,6],[110,6],[120,4],[160,108],[180,100],[190,114]].forEach((t,i)=>i%2?leafy(t[0],t[1],1.2):pine(t[0],t[1],1.3));
return render(900,0.8,0.02)}
out['moodboard/diorama-maket.svg']=district(PAL.maket);out['moodboard/diorama-noon.svg']=district(PAL.noon);out['moodboard/diorama-postcard.svg']=district(PAL.postcard);
