// Brand configuration — change BRAND.name here to rename across the app
const BRAND = window.SYSCANVAS_CONFIG;

const DMETA = {
  Powertrain:{icon:"⚡",color:"#D4864A",c:"copper"},
  Chassis:{icon:"🛞",color:"#4A90D9",c:"blue"},
  Body:{icon:"💡",color:"#2DD4A8",c:"teal"},
  ADAS:{icon:"📡",color:"#E8655A",c:"coral"},
  Infotainment:{icon:"🖥️",color:"#9B8FD4",c:"lav"},
  Connectivity:{icon:"🌐",color:"#5CB8E4",c:"sky"}
};

const REALISTIC_OEM_SCENARIO = {
  id: "premium_evm_zonal_program_v1",
  name: "Premium EV Zonal E/EA",
  note: "Non-proprietary but structurally realistic OEM zonal architecture.",
  interfaces: [
    { id: "if_vehicle_state", name: "SomeIpVehicleStateService", kind: "field" },
    { id: "if_energy_opt", name: "SomeIpEnergyOptimizerService", kind: "method" },
    { id: "if_thermal", name: "SomeIpThermalSupervisorService", kind: "method" },
    { id: "if_route", name: "SomeIpRouteEnergyService", kind: "method" },
    { id: "if_body_cmd", name: "ZonalActuationCommandInterface", kind: "method" },
    { id: "if_diag_rw", name: "DiagReadWriteInterface", kind: "method" },
    { id: "if_ota", name: "OtaCampaignControlInterface", kind: "method" },
    { id: "if_adas_obj", name: "AdasObjectSignalSet", kind: "event" },
    { id: "if_dyn", name: "VehicleDynamicsSignalSet", kind: "event" },
    { id: "if_batt", name: "BatteryStateSignalSet", kind: "event" },
    { id: "if_diag_evt", name: "DiagEventChannel", kind: "event" },
    { id: "if_ota_evt", name: "OtaEventChannel", kind: "event" },
    { id: "if_cyber_evt", name: "CyberEventChannel", kind: "event" }
  ],
  components: [
    {id:"c_ccu", name:"CentralComputePlatform", domain:"Connectivity", ecu:"CCU-A", partition:"AP-Core", role:"Central service orchestration", safety:["QM"], security:["SecOC","Policy"], kind:"instance", typeName:"CentralComputePlatformType", provided:["if_vehicle_state","if_energy_opt","if_thermal","if_route","if_body_cmd"], required:["if_adas_obj","if_dyn","if_batt"]},
    {id:"c_diag", name:"DiagnosticsManager", domain:"Connectivity", ecu:"Gateway-1", partition:"Diag", role:"UDS diagnostics service", safety:["QM"], security:["TLS"], kind:"instance", typeName:"DiagnosticsManagerType", provided:["if_diag_rw"], required:["if_diag_evt"]},
    {id:"c_ota", name:"OtaManager", domain:"Connectivity", ecu:"Gateway-1", partition:"OTA", role:"Campaign manager", safety:["QM"], security:["TLS","SecureBoot"], kind:"instance", typeName:"OtaManagerType", provided:["if_ota","if_ota_evt"], required:["if_diag_rw"]},
    {id:"c_cyber", name:"CybersecurityManager", domain:"Connectivity", ecu:"Gateway-1", partition:"Cyber", role:"Security events + policy", safety:["QM"], security:["IDS","Firewall"], kind:"instance", typeName:"CybersecurityManagerType", provided:["if_cyber_evt"], required:[]},
    {id:"c_zfl", name:"ZonalFrontLeft", domain:"Body", ecu:"Zone-FL", partition:"BodyAct", role:"Front-left zonal control", safety:["ASIL-B"], security:["SecOC"], kind:"instance", typeName:"ZonalControllerType", provided:["if_diag_evt"], required:["if_body_cmd"]},
    {id:"c_zfr", name:"ZonalFrontRight", domain:"Body", ecu:"Zone-FR", partition:"BodyAct", role:"Front-right zonal control", safety:["ASIL-B"], security:["SecOC"], kind:"instance", typeName:"ZonalControllerType", provided:["if_diag_evt"], required:["if_body_cmd"]},
    {id:"c_zrl", name:"ZonalRearLeft", domain:"Body", ecu:"Zone-RL", partition:"BodyAct", role:"Rear-left zonal control", safety:["ASIL-B"], security:["SecOC"], kind:"instance", typeName:"ZonalControllerType", provided:["if_diag_evt"], required:["if_body_cmd"]},
    {id:"c_zrr", name:"ZonalRearRight", domain:"Body", ecu:"Zone-RR", partition:"BodyAct", role:"Rear-right zonal control", safety:["ASIL-B"], security:["SecOC"], kind:"instance", typeName:"ZonalControllerType", provided:["if_diag_evt"], required:["if_body_cmd"]},
    {id:"c_bms", name:"BatteryManagementPrimary", domain:"Powertrain", ecu:"PT-1", partition:"Energy", role:"Battery state estimation", safety:["ASIL-C"], security:["SecOC"], kind:"instance", typeName:"BatteryManagementType", provided:["if_batt","if_diag_evt"], required:["if_energy_opt"]},
    {id:"c_vmotion", name:"VehicleMotionProvider", domain:"Chassis", ecu:"CH-1", partition:"Motion", role:"Vehicle dynamics publisher", safety:["ASIL-D"], security:["SecOC"], kind:"instance", typeName:"VehicleMotionProviderType", provided:["if_dyn"], required:[]},
    {id:"c_adas", name:"AdasPerceptionStack", domain:"ADAS", ecu:"ADAS-HPC", partition:"Perception", role:"Perception fusion", safety:["ASIL-B"], security:["SecureBoot"], kind:"instance", typeName:"AdasPerceptionStackType", provided:["if_adas_obj"], required:[]},
    {id:"c_hmi", name:"CockpitHmi", domain:"Infotainment", ecu:"IVI-1", partition:"HMI", role:"Driver interface", safety:["QM"], security:["Sandbox"], kind:"instance", typeName:"CockpitHmiType", provided:[], required:["if_vehicle_state","if_route"]}
  ],
  connectors: [
    {id:"k1",from:"c_vmotion",to:"c_ccu",iface:"if_dyn",providerPort:"dyn_out",requesterPort:"vehicle_dyn_in"},
    {id:"k2",from:"c_bms",to:"c_ccu",iface:"if_batt",providerPort:"battery_state_out",requesterPort:"battery_state_in"},
    {id:"k3",from:"c_adas",to:"c_ccu",iface:"if_adas_obj",providerPort:"objects_out",requesterPort:"adas_objects_in"},
    {id:"k4",from:"c_ccu",to:"c_bms",iface:"if_energy_opt",providerPort:"energy_opt_srv",requesterPort:"energy_plan_in"},
    {id:"k5",from:"c_ccu",to:"c_hmi",iface:"if_vehicle_state",providerPort:"vehicle_state_srv",requesterPort:"vehicle_state_in"},
    {id:"k6",from:"c_ccu",to:"c_hmi",iface:"if_route",providerPort:"route_energy_srv",requesterPort:"route_energy_in"},
    {id:"k7",from:"c_ccu",to:"c_zfl",iface:"if_body_cmd",providerPort:"zonal_body_cmd",requesterPort:"body_cmd_in"},
    {id:"k8",from:"c_ccu",to:"c_zfr",iface:"if_body_cmd",providerPort:"zonal_body_cmd",requesterPort:"body_cmd_in"},
    {id:"k9",from:"c_ccu",to:"c_zrl",iface:"if_body_cmd",providerPort:"zonal_body_cmd",requesterPort:"body_cmd_in"},
    {id:"k10",from:"c_ccu",to:"c_zrr",iface:"if_body_cmd",providerPort:"zonal_body_cmd",requesterPort:"body_cmd_in"},
    {id:"k11",from:"c_zfl",to:"c_diag",iface:"if_diag_evt",providerPort:"diag_evt_out",requesterPort:"diag_evt_in"},
    {id:"k12",from:"c_zfr",to:"c_diag",iface:"if_diag_evt",providerPort:"diag_evt_out",requesterPort:"diag_evt_in"},
    {id:"k13",from:"c_zrl",to:"c_diag",iface:"if_diag_evt",providerPort:"diag_evt_out",requesterPort:"diag_evt_in"},
    {id:"k14",from:"c_zrr",to:"c_diag",iface:"if_diag_evt",providerPort:"diag_evt_out",requesterPort:"diag_evt_in"},
    {id:"k15",from:"c_diag",to:"c_ota",iface:"if_diag_rw",providerPort:"diag_rw_srv",requesterPort:"diag_rw_in"}
  ]
};

function scenarioModel() {
  const iMap = new Map(REALISTIC_OEM_SCENARIO.interfaces.map(i => [i.id, i]));
  const components = REALISTIC_OEM_SCENARIO.components.map(c => ({
    id: c.id,
    name: c.name,
    type: `${c.typeName} (instance)`,
    domain: c.domain,
    provided: c.provided.map((iid, ix) => ({ name: `${c.name.toLowerCase()}_p${ix+1}`, iface: iMap.get(iid).name })),
    required: c.required.map((iid, ix) => ({ name: `${c.name.toLowerCase()}_r${ix+1}`, iface: iMap.get(iid).name })),
    metadata: { ...c, placement: `${c.ecu}/${c.partition}`, source: "scenario" }
  }));
  const byId = new Map(components.map(c => [c.id, c]));
  const interfaces = REALISTIC_OEM_SCENARIO.interfaces.map(i => ({ name: i.name, methods: i.kind === "method" ? ["Invoke"] : [], events: i.kind === "event" ? ["Signal"] : [], fields: i.kind === "field" ? ["Value"] : [] }));
  const connections = REALISTIC_OEM_SCENARIO.connectors.map(k => ({
    from: byId.get(k.from).name,
    to: byId.get(k.to).name,
    label: iMap.get(k.iface).name,
    type: iMap.get(k.iface).kind,
    inferred: false,
    context: { kind: "scenario", providerPortRef: k.providerPort, requesterPortRef: k.requesterPort, connectorId: k.id }
  }));
  return { components, interfaces, connections, sourceType: "scenario" };
}

function legalSafeName(name){return String(name||"").replace(/\b(electrobit|vector|dspace|bosch|continental|aptiv|zf|magna|valeo|hyundai|toyota|vw|volkswagen|mercedes|bmw|audi|ford|gm|stellantis|tesla)\b/gi,"vendor")}
function guessType(x){const t=(x||"").toLowerCase();return /event|signal|status|state|channel/.test(t)?"event":/field|value|service/.test(t)?"field":"method";}

let model={components:[],interfaces:[],connections:[],domains:{}},level="vehicle",curDom=null,selComp=null,tab="detail";

function parseARXML(xmlText){
  const doc=(new DOMParser).parseFromString(xmlText,"text/xml");
  if(doc.querySelector("parsererror"))return{components:[],interfaces:[],connections:[],sourceType:"import"};
  const arr=x=>Array.from(x||[]), q=(n,s)=>arr(n.querySelectorAll(s));
  const short=n=>{if(!n)return"";const s=q(n,":scope > SHORT-NAME")[0]||q(n,"SHORT-NAME")[0];return legalSafeName((s?.textContent||"").trim())};
  const tail=t=>legalSafeName((t||"").trim().split('/').filter(Boolean).pop()||"");
  const pkgPath=n=>{const names=[];let p=n.parentElement;while(p){if(p.localName==="AR-PACKAGE") names.unshift(short(p));p=p.parentElement;}return names.filter(Boolean)};

  const interfaces=[];const ifSeen=new Set();
  ["SERVICE-INTERFACE","CLIENT-SERVER-INTERFACE","SENDER-RECEIVER-INTERFACE"].forEach(tag=>q(doc,tag).forEach(node=>{
    const name=short(node); if(!name||ifSeen.has(name)) return; ifSeen.add(name);
    interfaces.push({name,methods:q(node,"OPERATION-PROTOTYPE").map(short).filter(Boolean),events:q(node,"EVENT,DATA-ELEMENT-PROTOTYPE").map(short).filter(Boolean),fields:q(node,"FIELD").map(short).filter(Boolean),interfaceKind:tag,pkgPath:pkgPath(node)});
  }));

  const typesByName=new Map();
  ["ADAPTIVE-APPLICATION-SW-COMPONENT-TYPE","APPLICATION-SW-COMPONENT-TYPE","SERVICE-SW-COMPONENT-TYPE","COMPOSITION-SW-COMPONENT-TYPE"].forEach(tag=>q(doc,tag).forEach(node=>{
    const name=short(node); if(!name||typesByName.has(name)) return;
    const provided=q(node,"P-PORT-PROTOTYPE,PROVIDED-PORT-PROTOTYPE").map(p=>({name:short(p),iface:tail((q(p,"PROVIDED-INTERFACE-TREF,REQUIRED-INTERFACE-TREF")[0]?.textContent)||"")}));
    const required=q(node,"R-PORT-PROTOTYPE,REQUIRED-PORT-PROTOTYPE").map(p=>({name:short(p),iface:tail((q(p,"REQUIRED-INTERFACE-TREF,PROVIDED-INTERFACE-TREF")[0]?.textContent)||"")}));
    typesByName.set(name,{typeTag:tag,name,provided,required,pkgPath:pkgPath(node),arxml:(new XMLSerializer).serializeToString(node)});
  }));

  const components=[]; const compByName=new Map();
  q(doc,"SW-COMPONENT-PROTOTYPE").forEach(p=>{
    const n=short(p); const typeName=tail(q(p,"TYPE-TREF,COMPONENT-TREF")[0]?.textContent||""); const t=typesByName.get(typeName); if(!n||!t)return;
    const comp={name:n,type:`${t.typeTag} (instance of ${typeName})`,provided:t.provided.map(x=>({...x})),required:t.required.map(x=>({...x})),arxml:t.arxml,context:{compositionPath:pkgPath(p),instanceName:n,typeName,pkgPath:t.pkgPath}};
    components.push(comp); compByName.set(n,comp);
  });
  if(!components.length){ typesByName.forEach(t=>{components.push({name:t.name,type:t.typeTag,provided:t.provided,required:t.required,arxml:t.arxml,context:{pkgPath:t.pkgPath,instanceName:t.name,typeName:t.name}}); compByName.set(t.name,components[components.length-1]);}); }

  const connections=[]; const dedupe=new Set();
  q(doc,"ASSEMBLY-SW-CONNECTOR,ASSEMBLY-CONNECTOR-PROTOTYPE").forEach(conn=>{
    const pi=q(conn,"PROVIDER-IREF")[0], ri=q(conn,"REQUESTER-IREF")[0];
    const from=tail(q(pi||conn,"CONTEXT-COMPONENT-REF")[0]?.textContent||"");
    const to=tail(q(ri||conn,"CONTEXT-COMPONENT-REF")[0]?.textContent||"");
    const pPort=tail(q(pi||conn,"TARGET-P-PORT-REF,PORT-PROTOTYPE-REF")[0]?.textContent||"");
    const rPort=tail(q(ri||conn,"TARGET-R-PORT-REF,PORT-PROTOTYPE-REF")[0]?.textContent||"");
    const src=compByName.get(from), dst=compByName.get(to);
    const lbl=(src?.provided.find(p=>p.name===pPort)?.iface)||(dst?.required.find(r=>r.name===rPort)?.iface)||pPort||rPort||"assemblyLink";
    const k=`${from}>${to}:${lbl}`; if(!from||!to||from===to||dedupe.has(k)) return; dedupe.add(k);
    connections.push({from,to,label:lbl,type:guessType(lbl),inferred:false,context:{kind:"arxml",connectorName:short(conn),providerRef:pPort,requesterRef:rPort,providerRole:"provider",requesterRole:"requester"}});
  });

  if(!connections.length){
    components.forEach(a=>a.provided.forEach(p=>components.forEach(b=>{if(a===b)return;b.required.forEach(r=>{if(p.iface&&p.iface===r.iface){const k=`${a.name}>${b.name}:${p.iface}`; if(dedupe.has(k))return; dedupe.add(k); connections.push({from:a.name,to:b.name,label:p.iface,type:guessType(p.iface),inferred:true,context:{kind:"inferred"}});}})})));
  }

  return {components,interfaces,connections,sourceType:"import"};
}

function inferDomain(name){const t=(name||"").toLowerCase();const map={Powertrain:["battery","power","inverter","charge","thermal"],Chassis:["brake","steer","motion","chassis"],Body:["zonal","body","door","seat","hvac"],ADAS:["adas","camera","radar","perception"],Infotainment:["hmi","cockpit","ivi","media"],Connectivity:["gateway","diag","ota","cyber","compute"]};for(const d of Object.keys(map))if(map[d].some(k=>t.includes(k)))return d;return"Connectivity"}
function buildModel(input){
  const seen=new Set();
  model.components=input.components.filter(c=>!seen.has(c.name)&&(seen.add(c.name),true));
  model.interfaces=input.interfaces||[];
  model.connections=(input.connections||[]).filter(c=>c.from&&c.to&&c.label);
  model.domains={};
  model.components.forEach(c=>{
    const mapped=(c.metadata&&c.metadata.domain)|| (c.context?.pkgPath||[]).find(p=>DMETA[p]) || null;
    const inferred=!mapped;
    c.domain=mapped||inferDomain(c.name);
    c.domainSource=inferred?"inferred":"explicit";
    (model.domains[c.domain]||(model.domains[c.domain]=[])).push(c);
  });
}

function handleFiles(files){if(!files||!files.length)return;const agg={components:[],interfaces:[],connections:[]};let done=0;Array.from(files).forEach(f=>{const r=new FileReader;r.onload=e=>{const p=parseARXML(e.target.result);agg.components.push(...p.components);agg.interfaces.push(...p.interfaces);agg.connections.push(...p.connections);if(++done===files.length){buildModel(agg);if(!model.components.length)return alert("No AUTOSAR components found.");hideDrop();nav("vehicle");}};r.readAsText(f);});}
function nav(l,d){level=l;if(l==="vehicle"){curDom=null;selComp=null;renderVehicle();}else{curDom=d;selComp=null;renderDomain(d);}document.getElementById("btnBack").style.display=l==="vehicle"?"none":"inline-block";updBC();updStatus();renderSide();}
function goBack(){if(level==="domain")nav("vehicle");}
function updBC(){const bc=document.getElementById("bc");bc.innerHTML=`<span class="cr ${level==='vehicle'?'act':''}" onclick="nav('vehicle')">Vehicle</span>${curDom?`<span class="cs">›</span><span class="cr ${level==='domain'?'act':''}">${curDom}</span>`:''}`;}
function updStatus(){document.getElementById("stL").textContent=`${model.components.length} components · ${model.connections.length} connections · ${model.interfaces.length} interfaces · ${Object.keys(model.domains).length} domains`;}
function hideDrop(){document.getElementById("dropZ").classList.add("hid");document.getElementById("view").style.display="block";document.getElementById("legend").style.display="flex";}
function showDrop(){document.getElementById("dropZ").classList.remove("hid");document.getElementById("view").style.display="none";document.getElementById("legend").style.display="none";}

function renderVehicle(){document.getElementById("legend").style.display="none";const v=document.getElementById("view");const keys=Object.keys(DMETA).filter(d=>model.domains[d]?.length);v.innerHTML=`<div class="vview"><div class="ani" style="text-align:center"><div class="vt">Vehicle Architecture</div><div class="vs">${model.components.length} components across ${keys.length} domains</div></div><div class="dgrid">${keys.map((d,ix)=>{const meta=DMETA[d],arr=model.domains[d],cross=model.connections.filter(c=>{const fd=model.components.find(x=>x.name===c.from)?.domain;const td=model.components.find(x=>x.name===c.to)?.domain;return (fd===d&&td!==d)||(td===d&&fd!==d);});return `<div class="dcard ani d${ix+1}" data-c="${meta.c}" onclick="nav('domain','${d}')"><span class="dico">${meta.icon}</span><div class="dname">${d}</div><div class="dcnt">${arr.length} components · ${cross.length} cross-domain links</div><div>${arr.map(c=>`<span class='dtag'>${c.name}</span>`).join('')}</div></div>`;}).join('')}</div></div>`;}

function renderDomain(domain){
  document.getElementById("legend").style.display="flex";const t=document.getElementById("view");t.innerHTML='<svg id="dsvg" width="100%" height="100%"></svg>';
  const local=model.domains[domain]||[]; if(!local.length) return;
  const names=new Set(local.map(c=>c.name)); const ex=model.connections.filter(c=>names.has(c.from)||names.has(c.to));
  const allNames=new Set(); ex.forEach(c=>{allNames.add(c.from);allNames.add(c.to)});
  const nodes=[...Array.from(allNames).map(n=>{const c=model.components.find(x=>x.name===n);return {...c,ghost:!names.has(n)};})];
  const svg=d3.select("#dsvg"); svg.selectAll("*").remove(); const g=svg.append("g");
  svg.call(d3.zoom().on("zoom",e=>g.attr("transform",e.transform)));
  const nx=new Map(); nodes.forEach((n,i)=>{n._x=120+240*(i%4); n._y=80+160*Math.floor(i/4); nx.set(n.name,n);});
  ex.forEach(c=>{const s=nx.get(c.from),d=nx.get(c.to); if(!s||!d)return; g.append("line").attr("x1",s._x).attr("y1",s._y).attr("x2",d._x).attr("y2",d._y).attr("stroke",c.type==='event'?'#4A90D9':c.type==='field'?'#9B8FD4':'#1A1A1A').attr("stroke-dasharray",c.type==='event'?'4 3':c.type==='field'?'2 2':'none').attr("opacity",0.5); g.append("text").attr("x",(s._x+d._x)/2).attr("y",(s._y+d._y)/2-4).attr("font-size",8).text(c.label+(c.inferred?'*':''));});
  nodes.forEach(n=>{const card=g.append("g").attr("transform",`translate(${n._x-90},${n._y-36})`).on("click",()=>{selComp=model.components.find(c=>c.name===n.name);renderSide();}); card.append("rect").attr("width",180).attr("height",72).attr("rx",8).attr("fill",n.ghost?'#F9F6F0':'#fff').attr("stroke",(DMETA[n.domain]||{color:'#aaa'}).color); card.append("text").attr("x",90).attr("y",20).attr("text-anchor","middle").attr("font-size",11).text(n.name); card.append("text").attr("x",90).attr("y",36).attr("text-anchor","middle").attr("font-size",8).attr("fill","#7A7468").text(`${n.domain}${n.domainSource==='inferred'?' (inferred)':''}`);});
}

function setTab(t){tab=t;document.querySelectorAll('.stab').forEach(b=>b.classList.toggle('act',b.dataset.t===t));renderSide();}
function renderSide(){
  const sb=document.getElementById('sb');
  if(tab==='tree'){ sb.innerHTML=`<div class='sec'><div class='sth'>Architecture Tree</div>${Object.keys(model.domains).map(d=>`<div style='margin-bottom:8px'><div style='font-weight:700;cursor:pointer' onclick="nav('domain','${d}')">${(DMETA[d]||{icon:'📦'}).icon} ${d}</div>${(model.domains[d]||[]).map(c=>`<div class='tree-item' onclick="selComp=model.components.find(x=>x.name==='${c.name}');setTab('detail')">${c.name}</div>`).join('')}</div>`).join('')}</div>`; return; }
  if(tab==='arxml'){ sb.innerHTML=selComp?.arxml?`<div class='ax-bar'><span>${selComp.name}</span></div><pre class='ax-code'>${escH(fmtXml(selComp.arxml))}</pre>`:`<div style='padding:24px'>Select a component to view ARXML</div>`; return; }
  if(!selComp){ sb.innerHTML=`<div style='padding:24px'>Click a component to see details.</div>`; return; }
  const out=model.connections.filter(c=>c.from===selComp.name),inc=model.connections.filter(c=>c.to===selComp.name);
  sb.innerHTML=`<div class='dh'><div class='dn'>${selComp.name}</div><div class='dt'>${selComp.type||''}</div><div class='dd' style='background:${(DMETA[selComp.domain]||{color:'#aaa'}).color}18'>${(DMETA[selComp.domain]||{icon:'📦'}).icon} ${selComp.domain}${selComp.domainSource==='inferred'?' (inferred)':''}</div></div>
  <div class='sec'><div class='sth'>Metadata</div><div class='conn-chip'>Role: ${selComp.metadata?.role||'—'}</div><div class='conn-chip'>Placement: ${selComp.metadata?.placement||`${selComp.metadata?.ecu||'—'}/${selComp.metadata?.partition||'—'}`}</div><div class='conn-chip'>Safety: ${(selComp.metadata?.safety||[]).join(', ')||'—'} · Security: ${(selComp.metadata?.security||[]).join(', ')||'—'}</div></div>
  <div class='sec'><div class='sth'>Connections</div>${out.map(c=>`<div class='conn-chip'>→ ${c.to} (${c.label}${c.inferred?'*':''})</div>`).join('')}${inc.map(c=>`<div class='conn-chip'>← ${c.from} (${c.label}${c.inferred?'*':''})</div>`).join('')}</div>`;
}
function escH(x){const d=document.createElement('div');d.textContent=x;return d.innerHTML;}
function fmtXml(xml){let out='',pad=0;xml.replace(/></g,'>\n<').split('\n').forEach(l=>{l=l.trim();if(!l)return;if(l.startsWith('</'))pad=Math.max(0,pad-1);out+='  '.repeat(pad)+l+'\n';if(l.startsWith('<')&&!l.startsWith('</')&&!l.endsWith('/>')&&!l.includes('</'))pad++;});return out;}
function loadSample(){buildModel(scenarioModel());hideDrop();nav('vehicle');}

const fIn=document.getElementById('fIn'); if(fIn) fIn.addEventListener('change',()=>handleFiles(fIn.files));
