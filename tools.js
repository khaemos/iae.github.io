const toolsBody=document.body;
const toolsNavToggle=document.querySelector("[data-nav-toggle]");
toolsNavToggle?.addEventListener("click",()=>{
  toolsBody.classList.toggle("nav-open");
  toolsNavToggle.setAttribute("aria-label",toolsBody.classList.contains("nav-open")?"Close navigation":"Open navigation");
});
document.querySelectorAll(".nav a").forEach(link=>link.addEventListener("click",()=>toolsBody.classList.remove("nav-open")));
// IAE engineering tools
const siteColpittsForm=document.querySelector("[data-site-colpitts-form]");
let siteColpittsMode="analyze";
let siteColpittsSummary="";
function siteMetric(value,kind){
  if(!Number.isFinite(value))return "-";
  const sets={frequency:[[1e6,"MHz"],[1e3,"kHz"],[1,"Hz"]],capacitance:[[1e-6,"uF"],[1e-9,"nF"],[1e-12,"pF"]],inductance:[[1,"H"],[1e-3,"mH"],[1e-6,"uH"]],time:[[1,"s"],[1e-3,"ms"],[1e-6,"us"],[1e-9,"ns"]],impedance:[[1e6,"Mohm"],[1e3,"kohm"],[1,"ohm"]]};
  const set=sets[kind],unit=set.find(item=>Math.abs(value)>=item[0])||set[set.length-1];
  return (value/unit[0]).toLocaleString(undefined,{maximumSignificantDigits:5})+" "+unit[1];
}
function calculateSiteColpitts(){
  if(!siteColpittsForm)return;
  const d=new FormData(siteColpittsForm),c1=+d.get("c1")*+d.get("c1Unit"),c2=+d.get("c2")*+d.get("c2Unit");
  const third=siteColpittsMode==="analyze"?+d.get("inductance")*+d.get("inductanceUnit"):+d.get("targetFrequency")*+d.get("frequencyUnit");
  const vplus=+d.get("vplus")*+d.get("vplusUnit"),r1=+d.get("r1")*+d.get("r1Unit"),r2=+d.get("r2")*+d.get("r2Unit");
  const valid=[c1,c2,third,vplus,r1,r2].every(value=>Number.isFinite(value)&&value>0);
  document.querySelector("[data-site-colpitts-warning]").hidden=valid;
  if(!valid){document.querySelectorAll("[data-site-result]").forEach(node=>node.textContent="-");document.querySelector("[data-site-primary-value]").textContent="-";siteColpittsSummary="";return}
  const ct=c1*c2/(c1+c2),frequency=siteColpittsMode==="analyze"?1/(2*Math.PI*Math.sqrt(third*ct)):third;
  const inductance=siteColpittsMode==="analyze"?third:1/(Math.pow(2*Math.PI*frequency,2)*ct),beta=c1/c2,gain=1/beta,period=1/frequency;
  const xc1=1/(2*Math.PI*frequency*c1),xc2=1/(2*Math.PI*frequency*c2),xl=2*Math.PI*frequency*inductance,vr2=vplus*r2/(r1+r2);
  document.querySelector("[data-site-primary-label]").textContent=siteColpittsMode==="analyze"?"Resonant frequency":"Required inductance";
  document.querySelector("[data-site-primary-value]").textContent=siteColpittsMode==="analyze"?siteMetric(frequency,"frequency"):siteMetric(inductance,"inductance");
  document.querySelector("[data-site-primary-note]").textContent=siteColpittsMode==="analyze"?"Ideal unloaded tank":"For "+siteMetric(frequency,"frequency")+" target";
  const put=(key,value)=>document.querySelector('[data-site-result="'+key+'"]').textContent=value;
  put("ct",siteMetric(ct,"capacitance"));put("beta",beta.toPrecision(5)+" ("+(beta*100).toPrecision(4)+"%)");put("gain",gain.toPrecision(5)+" V/V");put("period",siteMetric(period,"time"));put("xc1",siteMetric(xc1,"impedance"));put("xc2",siteMetric(xc2,"impedance"));put("vr2",vr2.toPrecision(5)+" V");put("xl",siteMetric(xl,"impedance")+" = "+siteMetric(xc1+xc2,"impedance"));
  siteColpittsSummary=["IAE / Colpitts Oscillator Calculation","Mode: "+(siteColpittsMode==="analyze"?"Analyze existing tank":"Design for target frequency"),"C1: "+siteMetric(c1,"capacitance"),"C2: "+siteMetric(c2,"capacitance"),"Equivalent capacitance: "+siteMetric(ct,"capacitance"),"Resonant frequency: "+siteMetric(frequency,"frequency"),"Inductance: "+siteMetric(inductance,"inductance"),"Feedback fraction: "+beta.toPrecision(5),"Estimated minimum gain: "+gain.toPrecision(5)+" V/V","Oscillation period: "+siteMetric(period,"time"),"XC1: "+siteMetric(xc1,"impedance"),"XC2: "+siteMetric(xc2,"impedance"),"XL: "+siteMetric(xl,"impedance"),"Resonance check (XC1 + XC2): "+siteMetric(xc1+xc2,"impedance"),"Supply V+: "+vplus.toPrecision(5)+" V","R1: "+siteMetric(r1,"impedance"),"R2: "+siteMetric(r2,"impedance"),"DC bias VR2: "+vr2.toPrecision(5)+" V"].join("\n");
}
function setSiteColpittsMode(mode){
  siteColpittsMode=mode;
  document.querySelectorAll("[data-site-colpitts-mode]").forEach(button=>{const active=button.dataset.siteColpittsMode===mode;button.classList.toggle("active",active);button.setAttribute("aria-pressed",String(active))});
  document.querySelectorAll(".iae-analyze-field").forEach(field=>field.hidden=mode!=="analyze");
  document.querySelectorAll(".iae-design-field").forEach(field=>field.hidden=mode!=="design");
  calculateSiteColpitts();
}
siteColpittsForm?.addEventListener("input",calculateSiteColpitts);
siteColpittsForm?.addEventListener("change",calculateSiteColpitts);
document.addEventListener("click",event=>{
  const button=event.target.closest("button");if(!button)return;
  if(button.matches("[data-open-colpitts]")){document.querySelector("[data-iae-tool-catalog]").hidden=true;document.querySelector("[data-colpitts-workspace]").hidden=false;calculateSiteColpitts();document.querySelector("#tools").scrollIntoView({behavior:"smooth"})}
  if(button.matches("[data-close-colpitts]")){document.querySelector("[data-colpitts-workspace]").hidden=true;document.querySelector("[data-iae-tool-catalog]").hidden=false;document.querySelector("#tools").scrollIntoView({behavior:"smooth"})}
  if(button.matches("[data-site-colpitts-mode]"))setSiteColpittsMode(button.dataset.siteColpittsMode);
  if(button.matches("[data-site-colpitts-reset]")){siteColpittsForm.reset();setSiteColpittsMode("analyze")}
  if(button.matches("[data-site-swap-capacitors]")){const value=siteColpittsForm.elements.c1.value,unit=siteColpittsForm.elements.c1Unit.value;siteColpittsForm.elements.c1.value=siteColpittsForm.elements.c2.value;siteColpittsForm.elements.c1Unit.value=siteColpittsForm.elements.c2Unit.value;siteColpittsForm.elements.c2.value=value;siteColpittsForm.elements.c2Unit.value=unit;calculateSiteColpitts()}
  if(button.matches("[data-site-copy-colpitts]")&&siteColpittsSummary){navigator.clipboard.writeText(siteColpittsSummary).then(()=>{const original=button.textContent;button.textContent="Calculation copied";setTimeout(()=>button.textContent=original,1600)})}
});
calculateSiteColpitts();
// Class A transistor amplifier calculator
const classAForm=document.querySelector("[data-class-a-form]");
let classASummary="";
function classMetric(value,kind){
  if(!Number.isFinite(value))return "-";
  const sets={current:[[1,"A"],[1e-3,"mA"],[1e-6,"uA"],[1e-9,"nA"]],resistance:[[1e6,"Mohm"],[1e3,"kohm"],[1,"ohm"]],power:[[1,"W"],[1e-3,"mW"],[1e-6,"uW"]]};
  const set=sets[kind],unit=set.find(item=>Math.abs(value)>=item[0])||set[set.length-1];
  return (value/unit[0]).toLocaleString(undefined,{maximumSignificantDigits:6})+" "+unit[1];
}
function calculateClassA(){
  if(!classAForm)return;
  const d=new FormData(classAForm),vcc=+d.get("vcc"),r1=+d.get("r1")*+d.get("r1Unit"),r2=+d.get("r2")*+d.get("r2Unit"),rc=+d.get("rc")*+d.get("rcUnit"),re=+d.get("re")*+d.get("reUnit"),rl=+d.get("rl")*+d.get("rlUnit"),beta=+d.get("beta"),vbe=+d.get("vbe"),vcesat=+d.get("vcesat");
  const valid=[vcc,r1,r2,rc,re,rl,beta,vbe].every(value=>Number.isFinite(value)&&value>0)&&Number.isFinite(vcesat)&&vcesat>=0;
  document.querySelector("[data-class-a-warning]").hidden=valid;
  if(!valid){document.querySelector("[data-class-primary-value]").textContent="-";document.querySelector("[data-class-region]").textContent="Invalid input";document.querySelectorAll("[data-class-result]").forEach(node=>node.textContent="-");classASummary="";return}
  const vth=vcc*r2/(r1+r2),rth=r1*r2/(r1+r2),ib=Math.max(0,(vth-vbe)/(rth+(beta+1)*re)),ic=beta*ib,ie=(beta+1)*ib;
  const vb=vth-ib*rth,ve=ie*re,vc=vcc-ic*rc,vce=vc-ve,pq=Math.max(0,vce*ic),thermal=0.02585,reIntrinsic=ie>0?thermal/ie:Infinity;
  const acLoad=rc*rl/(rc+rl),gain=ie>0?-acLoad/reIntrinsic:0,rinBase=beta*reIntrinsic,rin=1/(1/r1+1/r2+1/rinBase),rout=rc;
  const upperHeadroom=Math.max(0,vcc-vc),lowerHeadroom=Math.max(0,vce-vcesat),swing=Math.min(upperHeadroom,lowerHeadroom),power=rl>0?swing*swing/(2*rl):0;
  const region=ib<=0?"Cutoff":vce<=vcesat||vc<=ve?"Saturation":"Forward-active";
  document.querySelector("[data-class-primary-value]").textContent=vce.toLocaleString(undefined,{maximumSignificantDigits:6})+" V";
  document.querySelector("[data-class-region]").textContent=region+" operating region";
  const put=(key,value)=>document.querySelector('[data-class-result="'+key+'"]').textContent=value;
  put("vth",vth.toPrecision(6)+" V");put("rth",classMetric(rth,"resistance"));put("ib",classMetric(ib,"current"));put("ic",classMetric(ic,"current"));put("ie",classMetric(ie,"current"));put("vb",vb.toPrecision(6)+" V");put("ve",ve.toPrecision(6)+" V");put("vc",vc.toPrecision(6)+" V");put("pq",classMetric(pq,"power"));put("re",classMetric(reIntrinsic,"resistance"));put("gain",gain.toLocaleString(undefined,{maximumSignificantDigits:6})+" V/V");put("rin",classMetric(rin,"resistance"));put("rout",classMetric(rout,"resistance"));put("swing",swing.toPrecision(6)+" V peak");put("power",classMetric(power,"power"));
  classASummary=["IAE / Class A Transistor Amplifier Calculation","Operating region: "+region,"VCC: "+vcc.toPrecision(6)+" V","R1: "+classMetric(r1,"resistance"),"R2: "+classMetric(r2,"resistance"),"RC: "+classMetric(rc,"resistance"),"RE: "+classMetric(re,"resistance"),"RL: "+classMetric(rl,"resistance"),"Beta: "+beta.toPrecision(6),"VBE: "+vbe.toPrecision(6)+" V","VTH: "+vth.toPrecision(6)+" V","RTH: "+classMetric(rth,"resistance"),"IB: "+classMetric(ib,"current"),"IC: "+classMetric(ic,"current"),"IE: "+classMetric(ie,"current"),"VB: "+vb.toPrecision(6)+" V","VE: "+ve.toPrecision(6)+" V","VC: "+vc.toPrecision(6)+" V","VCE: "+vce.toPrecision(6)+" V","Transistor dissipation: "+classMetric(pq,"power"),"Intrinsic emitter resistance: "+classMetric(reIntrinsic,"resistance"),"Loaded voltage gain: "+gain.toPrecision(6)+" V/V","Input resistance: "+classMetric(rin,"resistance"),"Output resistance: "+classMetric(rout,"resistance"),"Maximum unclipped peak swing: "+swing.toPrecision(6)+" V","Maximum sine power into RL: "+classMetric(power,"power")].join("\n");
}
classAForm?.addEventListener("input",calculateClassA);
classAForm?.addEventListener("change",calculateClassA);
document.addEventListener("click",event=>{const button=event.target.closest("button");if(!button)return;if(button.matches("[data-class-a-reset]")){classAForm.reset();calculateClassA()}if(button.matches("[data-copy-class-a]")&&classASummary){navigator.clipboard.writeText(classASummary).then(()=>{const original=button.textContent;button.textContent="Calculation copied";setTimeout(()=>button.textContent=original,1600)})}});
calculateClassA();

// Air-core inductance calculator
const airCoreForm=document.querySelector("[data-air-core-form]");
let airCoreSummary="";
function airMetric(value,kind){
  if(!Number.isFinite(value))return "-";
  const sets={inductance:[[1,"H"],[1e-3,"mH"],[1e-6,"uH"],[1e-9,"nH"]],length:[[1,"m"],[1e-2,"cm"],[1e-3,"mm"]],area:[[1,"m2"],[1e-4,"cm2"],[1e-6,"mm2"]],density:[[1e3,"turns/mm"],[1e2,"turns/cm"],[1,"turns/m"]]};
  const set=sets[kind],unit=set.find(item=>Math.abs(value)>=item[0])||set[set.length-1];
  return (value/unit[0]).toLocaleString(undefined,{maximumSignificantDigits:6})+" "+unit[1];
}
function calculateAirCore(){
  if(!airCoreForm)return;
  const d=new FormData(airCoreForm),diameter=+d.get("diameter")*+d.get("diameterUnit"),wireDiameter=+d.get("wireDiameter")*+d.get("wireDiameterUnit"),turns=+d.get("turns");
  const valid=[diameter,wireDiameter,turns].every(value=>Number.isFinite(value)&&value>0);
  document.querySelector("[data-air-core-warning]").hidden=valid;
  if(!valid){document.querySelector("[data-air-primary-value]").textContent="-";document.querySelectorAll("[data-air-result]").forEach(node=>node.textContent="-");airCoreSummary="";return}
  const length=wireDiameter*turns,diameterIn=diameter/0.0254,lengthIn=length/0.0254;
  const wheelerUH=(diameterIn*diameterIn*turns*turns)/(18*diameterIn+40*lengthIn),wheelerH=wheelerUH*1e-6;
  const mu0=4*Math.PI*1e-7,area=Math.PI*Math.pow(diameter/2,2),solenoidH=mu0*turns*turns*area/length;
  const density=turns/length,ratio=length/diameter,turnHelix=Math.sqrt(Math.pow(Math.PI*diameter,2)+Math.pow(wireDiameter,2)),wireLength=turnHelix*turns;
  document.querySelector("[data-air-primary-value]").textContent=airMetric(wheelerH,"inductance");
  const put=(key,value)=>document.querySelector('[data-air-result="'+key+'"]').textContent=value;
  put("length",airMetric(length,"length"));put("solenoid",airMetric(solenoidH,"inductance"));put("area",airMetric(area,"area"));put("density",airMetric(density,"density"));put("ratio",ratio.toLocaleString(undefined,{maximumSignificantDigits:6}));put("wire",airMetric(wireLength,"length"));
  airCoreSummary=["IAE / Air-Core Inductance Calculation","Coil diameter: "+airMetric(diameter,"length"),"Wire diameter: "+airMetric(wireDiameter,"length"),"Number of turns: "+turns.toLocaleString(),"Calculated winding length: "+airMetric(length,"length"),"Wheeler inductance: "+airMetric(wheelerH,"inductance"),"Ideal solenoid comparison: "+airMetric(solenoidH,"inductance"),"Cross-sectional area: "+airMetric(area,"area"),"Turn density: "+airMetric(density,"density"),"Length / diameter ratio: "+ratio.toPrecision(6),"Approximate helical conductor length: "+airMetric(wireLength,"length")].join("\n");
}
airCoreForm?.addEventListener("input",calculateAirCore);
airCoreForm?.addEventListener("change",calculateAirCore);
document.addEventListener("click",event=>{const button=event.target.closest("button");if(!button)return;if(button.matches("[data-air-core-reset]")){airCoreForm.reset();calculateAirCore()}if(button.matches("[data-copy-air-core]")&&airCoreSummary){navigator.clipboard.writeText(airCoreSummary).then(()=>{const original=button.textContent;button.textContent="Calculation copied";setTimeout(()=>button.textContent=original,1600)})}});
calculateAirCore();