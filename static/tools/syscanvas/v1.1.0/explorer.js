
// Brand configuration — change BRAND.name here to rename across the app
const BRAND = window.SYSCANVAS_CONFIG;
const DMETA={Powertrain:{icon:"⚡",color:"#D4864A",c:"copper"},Chassis:{icon:"🛞",color:"#4A90D9",c:"blue"},Body:{icon:"💡",color:"#2DD4A8",c:"teal"},ADAS:{icon:"📡",color:"#E8655A",c:"coral"},Infotainment:{icon:"🖥️",color:"#9B8FD4",c:"lav"},Connectivity:{icon:"🌐",color:"#5CB8E4",c:"sky"}},DKEYS=["battery","motor","inverter","charge","thermal","power","torque","engine","transmission","generator","temp_sensor","brake","steer","suspension","stability","traction","abs","esp","eps","wheel","speed_sensor","light","hvac","door","window","wiper","seat","climate","cabin","radar","camera","lidar","fusion","planning","emergency","lane","object","parking","cruise","autopilot","dashboard","hmi","display","media","audio","navigation","voice","screen","v2x","telematic","diagnostic","diag","ota","update","cloud","gateway"];function classifyDom(e){const t=e.toLowerCase();for(const[e,E]of Object.entries(DMETA))if(({Powertrain:["battery","motor","inverter","charge","thermal","power","torque","engine","temp"],Chassis:["brake","steer","suspension","stability","speed","wheel","abs","esp"],Body:["light","hvac","door","window","wiper","seat","climate","cabin"],ADAS:["radar","camera","lidar","fusion","planning","emergency","lane","object","parking"],Infotainment:["dashboard","hmi","display","media","audio","navigation","voice","screen"],Connectivity:["v2x","telematic","diagnostic","diag","ota","update","gateway","cloud"]}[e]||[]).some(e=>t.includes(e)))return e;return"Connectivity"}function guessType(e){const t=e.toLowerCase();return/event|notify|status|reading|report|fault|state|frame|detected|change|warning|active/.test(t)?"event":/field|value|data|config|level|temp|speed|angle|rate/.test(t)?"field":"method"}let model={components:[],interfaces:[],connections:[],domains:{}},level="vehicle",curDom=null,selComp=null,tab="detail";
let analysisState={mode:"logical",showSummary:!1,criticalPath:!1,filters:{domain:"all",ecu:"all",componentType:"all",interfaceKind:"all",connectionType:"all",linkSource:"all"}};
function legalSafeName(name){return String(name||"").replace(/\b(electrobit|vector|dspace|bosch|continental|aptiv|zf|magna|valeo|hyundai|toyota|vw|volkswagen|mercedes|bmw|audi|ford|gm|stellantis|tesla)\b/gi,"vendor")}
function parseARXML(xmlText){
  const doc=(new DOMParser).parseFromString(xmlText,"text/xml");
  if(doc.querySelector("parsererror"))return{components:[],interfaces:[],connections:[]};

  const components=[];
  const interfaces=[];
  const componentByName=new Map();
  const interfaceNames=new Set();

  const toArray=(list)=>Array.from(list||[]);
  const qAll=(scope,selectors)=>{
    const result=[];
    selectors.forEach(sel=>result.push(...toArray(scope.querySelectorAll(sel))));
    return result;
  };
  const shortName=(node)=>{
    if(!node)return null;
    for(const ch of toArray(node.children))if(ch.localName==="SHORT-NAME")return legalSafeName(ch.textContent.trim());
    return null;
  };
  const refTail=(text)=> legalSafeName((text||"").trim().split('/').filter(Boolean).pop()||"");
  const ifaceFromPort=(portNode)=>{
    const tref=qAll(portNode,["[DEST='SERVICE-INTERFACE']","[DEST='CLIENT-SERVER-INTERFACE']","[DEST='SENDER-RECEIVER-INTERFACE']","[DEST='MODE-SWITCH-INTERFACE']","[DEST='NV-DATA-INTERFACE']"])[0];
    return refTail(tref?.textContent||"");
  };

  const ifaceTags=["SERVICE-INTERFACE","CLIENT-SERVER-INTERFACE","SENDER-RECEIVER-INTERFACE","MODE-SWITCH-INTERFACE","NV-DATA-INTERFACE"];
  ifaceTags.forEach(tag=>{
    qAll(doc,[tag]).forEach(node=>{
      const name=shortName(node);
      if(!name||interfaceNames.has(name))return;
      interfaceNames.add(name);
      const entry={name,kind:tag,methods:[],events:[],fields:[]};
      qAll(node,["CLIENT-SERVER-OPERATION","OPERATION-PROTOTYPE"]).forEach(op=>{const n=shortName(op);if(n)entry.methods.push(n)});
      qAll(node,["EVENT","VARIABLE-DATA-PROTOTYPE"]).forEach(ev=>{const n=shortName(ev);if(n)entry.events.push(n)});
      qAll(node,["FIELD","DATA-ELEMENT-PROTOTYPE","MODE-GROUP"]).forEach(f=>{const n=shortName(f);if(n)entry.fields.push(n)});
      interfaces.push(entry);
    });
  });

  const componentTags=["ADAPTIVE-APPLICATION-SW-COMPONENT-TYPE","APPLICATION-SW-COMPONENT-TYPE","COMPOSITION-SW-COMPONENT-TYPE","SERVICE-SW-COMPONENT-TYPE","SENSOR-ACTUATOR-SW-COMPONENT-TYPE","COMPLEX-DEVICE-DRIVER-SW-COMPONENT-TYPE","ECU-ABSTRACTION-SW-COMPONENT-TYPE"];
  componentTags.forEach(tag=>{
    qAll(doc,[tag]).forEach(node=>{
      const name=shortName(node);
      if(!name||componentByName.has(name))return;
      const comp={name,type:tag,provided:[],required:[],arxml:(new XMLSerializer).serializeToString(node)};
      qAll(node,["P-PORT-PROTOTYPE","PROVIDED-PORT-PROTOTYPE"]).forEach(port=>{
        const pn=shortName(port)||"port";
        const iface=ifaceFromPort(port);
        comp.provided.push({name:pn,iface});
      });
      qAll(node,["R-PORT-PROTOTYPE","REQUIRED-PORT-PROTOTYPE"]).forEach(port=>{
        const pn=shortName(port)||"port";
        const iface=ifaceFromPort(port);
        comp.required.push({name:pn,iface});
      });
      qAll(node,["PR-PORT-PROTOTYPE"]).forEach(port=>{
        const pn=shortName(port)||"port";
        const iface=ifaceFromPort(port);
        comp.provided.push({name:pn,iface});
        comp.required.push({name:pn,iface});
      });
      components.push(comp);
      componentByName.set(name,comp);
    });
  });

  const compositionInstances=[];
  qAll(doc,["SW-COMPONENT-PROTOTYPE"]).forEach(proto=>{
    const instName=shortName(proto);
    const tref=qAll(proto,["TYPE-TREF","COMPONENT-TREF"])[0];
    const typeName=refTail(tref?.textContent||"");
    if(!instName||!typeName)return;
    const base=componentByName.get(typeName);
    if(!base)return;
    compositionInstances.push({instName,typeName,base});
  });

  if(compositionInstances.length){
    const scoped=[];
    compositionInstances.forEach(({instName,typeName,base})=>{
      const mapped={
        name:instName,
        type:`${base.type} (instance of ${typeName})`,
        provided:base.provided.map(p=>({name:`${instName}.${p.name}`,iface:p.iface})),
        required:base.required.map(p=>({name:`${instName}.${p.name}`,iface:p.iface})),
        arxml:base.arxml
      };
      scoped.push(mapped);
    });
    if(scoped.length) {
      components.length=0;
      components.push(...scoped);
      componentByName.clear();
      scoped.forEach(c=>componentByName.set(c.name,c));
    }
  }

  const connections=[];
  const dedupe=new Set();
  const pushConnection=(from,to,label,typeHint,meta={})=>{
    if(!from||!to||from===to)return;
    const key=`${from}>${to}:${label}`;
    if(dedupe.has(key))return;
    dedupe.add(key);
    connections.push({from,to,label:label||"interface",type:guessType(typeHint||label||""),explicit:!!meta.explicit,connectionType:meta.connectionType||"service",interfaceKind:meta.interfaceKind||"UNKNOWN"});
  };

  qAll(doc,["ASSEMBLY-SW-CONNECTOR","ASSEMBLY-CONNECTOR-PROTOTYPE"]).forEach(conn=>{
    const pi=qAll(conn,["PROVIDER-IREF"])[0];
    const ri=qAll(conn,["REQUESTER-IREF"])[0];
    const pc=refTail(qAll(pi||conn,["CONTEXT-COMPONENT-REF"])[0]?.textContent||"");
    const rc=refTail(qAll(ri||conn,["CONTEXT-COMPONENT-REF"])[0]?.textContent||"");
    const pp=refTail(qAll(pi||conn,["TARGET-P-PORT-REF","PORT-PROTOTYPE-REF"])[0]?.textContent||"");
    const rp=refTail(qAll(ri||conn,["TARGET-R-PORT-REF","PORT-PROTOTYPE-REF"])[0]?.textContent||"");
    const provider=componentByName.get(pc);
    const label=(provider?.provided.find(p=>p.name.endsWith(pp))?.iface)||(componentByName.get(rc)?.required.find(r=>r.name.endsWith(rp))?.iface)||pp||rp||"assemblyLink";
    const iface=interfaces.find(i=>i.name===label);pushConnection(pc,rc,label,label,{explicit:!0,connectionType:"assembly",interfaceKind:iface?.kind||"UNKNOWN"});
  });

  if(!connections.length){
    components.forEach(src=>src.provided.forEach(p=>{
      components.forEach(dst=>{
        if(src===dst)return;
        dst.required.forEach(r=>{if(p.iface&&r.iface&&p.iface===r.iface){const iface=interfaces.find(i=>i.name===p.iface);pushConnection(src.name,dst.name,p.iface,p.iface,{explicit:!1,connectionType:"interface-match",interfaceKind:iface?.kind||"UNKNOWN"})}});
      });
    }));
  }

  return{components,interfaces,connections};
}
function buildModel(e){const t=new Set;model.components=e.components.filter(e=>!t.has(e.name)&&(t.add(e.name),!0)),model.interfaces=e.interfaces;const E=new Set;model.connections=e.connections.filter(e=>{const t=`${e.from}>${e.to}:${e.label}`;return!E.has(t)&&(E.add(t),!0)});const n=new Set(model.components.map(e=>e.name));model.connections=model.connections.filter(e=>n.has(e.from)&&n.has(e.to)),model.domains={},model.components.forEach(e=>{e.domain=classifyDom(e.name),model.domains[e.domain]||(model.domains[e.domain]=[]),model.domains[e.domain].push(e)})}function handleFiles(e){if(!e||!e.length)return;const t={components:[],interfaces:[],connections:[]};let E=0;Array.from(e).forEach(n=>{const T=new FileReader;T.onload=n=>{const T=parseARXML(n.target.result);if(t.components.push(...T.components),t.interfaces.push(...T.interfaces),t.connections.push(...T.connections),++E===e.length){if(buildModel(t),!model.components.length)return void alert("No AUTOSAR components found.");hideDrop(),nav("vehicle")}},T.readAsText(n)})}function nav(e,t){level=e,"vehicle"===e?(curDom=null,selComp=null,renderVehicle()):"domain"===e&&(curDom=t,selComp=null,renderDomain(t)),document.getElementById("btnBack").style.display="vehicle"===e?"none":"inline-block",updBC(),updStatus(),renderSide()}function goBack(){"domain"===level&&nav("vehicle")}function updBC(){const e=document.getElementById("bc");let t=`<span class="cr${"vehicle"===level?" act":""}" onclick="nav('vehicle')">Vehicle</span>`;curDom&&(t+=`<span class="cs">›</span><span class="cr${"domain"===level?" act":""}">${curDom}</span>`),e.innerHTML=t}function updStatus(){document.getElementById("stL").textContent=`${model.components.length} components · ${model.connections.length} connections · ${model.interfaces.length} interfaces · ${Object.keys(model.domains).length} domains`}function hideDrop(){document.getElementById("dropZ").classList.add("hid"),document.getElementById("view").style.display="block",document.getElementById("legend").style.display="flex"}function showDrop(){document.getElementById("dropZ").classList.remove("hid"),document.getElementById("view").style.display="none",document.getElementById("legend").style.display="none"}function renderVehicle(){document.getElementById("legend").style.display="none";const e=document.getElementById("view");e.style.display="block";const t=["Powertrain","Chassis","Body","ADAS","Infotainment","Connectivity"].filter(e=>model.domains[e]&&model.domains[e].length);e.innerHTML=`<div class="vview"><div class="ani" style="text-align:center"><div class="vt">Vehicle Architecture</div><div class="vs">${model.components.length} components across ${t.length} domains</div></div>\n    <div class="dgrid">${t.map((e,t)=>{const E=DMETA[e],n=model.domains[e],T=model.connections.filter(t=>{const E=model.components.find(e=>e.name===t.from)?.domain,n=model.components.find(e=>e.name===t.to)?.domain;return E===e&&n!==e||n===e&&E!==e});return`<div class="dcard ani d${t+1}" data-c="${E.c}" onclick="nav('domain','${e}')"><span class="dico">${E.icon}</span><div class="dname">${e}</div><div class="dcnt">${n.length} component${1!==n.length?"s":""}${T.length?` · ${T.length} cross-domain link${1!==T.length?"s":""}`:""}</div><div>${n.map(e=>`<span class="dtag">${e.name}</span>`).join("")}</div></div>`}).join("")}</div></div>`}function renderDomain(e){document.getElementById("legend").style.display="flex";const t=document.getElementById("view");t.style.display="block",t.innerHTML='<svg id="dsvg" width="100%" height="100%"></svg>';const E=model.domains[e]||[];if(!E.length)return;const n=DMETA[e]||{icon:"?",color:"#A8A4A0"},T=n.color,a=new Set(E.map(e=>e.name)),o=model.connections.filter(e=>a.has(e.from)&&a.has(e.to)),R=model.connections.filter(e=>a.has(e.from)&&!a.has(e.to)||!a.has(e.from)&&a.has(e.to)),r=new Set;R.forEach(e=>{a.has(e.from)||r.add(e.from),a.has(e.to)||r.add(e.to)});const i=[...E.map(e=>({...e,ghost:!1})),...Array.from(r).map(e=>{const t=model.components.find(t=>t.name===e);return{name:e,domain:t?.domain||"?",provided:t?.provided||[],required:t?.required||[],ghost:!0}})],s=[...o,...R].filter(e=>i.find(t=>t.name===e.from)&&i.find(t=>t.name===e.to)),O={},c={},l={};i.forEach(e=>{O[e.name]=0,c[e.name]=[],l[e.name]=[]}),s.forEach(e=>{O[e.to]=(O[e.to]||0)+1,(c[e.from]=c[e.from]||[]).push(e.to),(l[e.to]=l[e.to]||[]).push(e.from)});const d=[],A=new Set;let P=i.filter(e=>!l[e.name]||0===l[e.name].length).map(e=>e.name);for(0===P.length&&(P=[i[0].name]);P.length>0&&d.length<10;){d.push(P),P.forEach(e=>A.add(e));const e=new Set;P.forEach(t=>{(c[t]||[]).forEach(t=>{A.has(t)||(l[t]||[]).every(e=>A.has(e))&&e.add(t)})}),P=Array.from(e)}const S=i.filter(e=>!A.has(e.name));S.length&&d.push(S.map(e=>e.name));const N=new Map;i.forEach(e=>{const t=Math.max(e.provided.length,e.required.length,1);e._height=Math.max(70,32+16*t+8),N.set(e.name,e)});let I=60;d.forEach(e=>{let t=-(e.reduce((e,t)=>{const E=N.get(t);return e+(E?E._height:70)},0)+30*(e.length-1))/2;e.forEach(e=>{const E=N.get(e);E&&(E._x=I,E._y=t,E._w=180,t+=E._height+30)}),I+=280});const m=i.map(e=>e._y||0),C=Math.min(...m),p=(Math.max(...m.map((e,t)=>e+(i[t]._height||70))),document.getElementById("cvs")),h=p.clientWidth,f=p.clientHeight,M=d3.select("#dsvg");M.selectAll("*").remove();const D=M.append("defs");D.append("pattern").attr("id","fg").attr("width",32).attr("height",32).attr("patternUnits","userSpaceOnUse").append("circle").attr("cx",16).attr("cy",16).attr("r",.5).attr("fill","#C8BFB0").attr("opacity",.5),M.append("rect").attr("width","100%").attr("height","100%").attr("fill","url(#fg)");const F={event:"#4A90D9",method:"#1A1A1A",field:"#9B8FD4"};["event","method","field"].forEach(e=>{D.append("marker").attr("id","ar-"+e).attr("viewBox","0 0 8 6").attr("refX",8).attr("refY",3).attr("markerWidth",7).attr("markerHeight",5).attr("orient","auto").append("path").attr("d","M0,0L8,3L0,6Z").attr("fill",F[e])});const u=M.append("g");M.call(d3.zoom().scaleExtent([.2,3]).on("zoom",e=>u.attr("transform",e.transform))),u.append("text").attr("x",20).attr("y",C-24).attr("font-size",15).attr("font-weight",700).attr("fill",T).attr("font-family","'DM Sans',sans-serif").text(`${n.icon} ${e}`),s.forEach(e=>{const t=N.get(e.from),E=N.get(e.to);if(!t||!E||void 0===t._x||void 0===E._x)return;const n=t.provided.findIndex(t=>t.iface===e.label),T=E.required.findIndex(t=>t.iface===e.label),a=32+16*Math.max(0,n)+8,o=32+16*Math.max(0,T)+8,R=t._x+180,r=t._y+a,i=E._x,s=E._y+o,O=(R+i)/2,c=F[e.type]||F.method,l="event"===e.type?"5 3":"field"===e.type?"2 2":"none";u.append("path").attr("d",`M${R},${r} C${O},${r} ${O},${s} ${i},${s}`).attr("fill","none").attr("stroke",c).attr("stroke-width",1.3).attr("stroke-dasharray",l).attr("opacity",.55).attr("marker-end",`url(#ar-${e.type})`);const d=O,A=(r+s)/2,P=e.label.length>22?e.label.slice(0,20)+"…":e.label,S=5.8*P.length+14;u.append("rect").attr("x",d-S/2).attr("y",A-9).attr("width",S).attr("height",17).attr("rx",4).attr("fill","#FFFFFF").attr("stroke","#1C2030").attr("stroke-width",.6),u.append("text").attr("x",d).attr("y",A+3).attr("text-anchor","middle").attr("font-size",8.5).attr("fill",c).attr("font-family","'Space Mono',monospace").text(P)}),i.forEach(e=>{if(void 0===e._x)return;const t=e._x,E=e._y,n=e._height,a=e.ghost,o=a?(DMETA[e.domain]||{color:"#7A7468"}).color:T,R=u.append("g").attr("transform",`translate(${t},${E})`).attr("cursor","pointer").on("click",()=>{selComp=model.components.find(t=>t.name===e.name)||e,renderSide()});R.append("rect").attr("width",180).attr("height",n).attr("rx",10).attr("fill",a?"#F9F6F0":"#FFFFFF").attr("stroke",selComp&&selComp.name===e.name?"#D4864A":o+(a?"44":"55")).attr("stroke-width",selComp&&selComp.name===e.name?2.5:1.2).attr("stroke-dasharray",a?"4 3":"none"),R.append("rect").attr("width",180).attr("height",3).attr("rx",1.5).attr("fill",o+(a?"66":"")),a&&R.append("text").attr("x",90).attr("y",14).attr("text-anchor","middle").attr("font-size",8).attr("fill","#A8A098").attr("font-family","'Space Mono',monospace").text(e.domain),R.append("text").attr("x",90).attr("y",a?28:20).attr("text-anchor","middle").attr("font-size",11).attr("font-weight",700).attr("fill",a?"#7A7468":"#1A1A1A").attr("font-family","'DM Sans',sans-serif").text(e.name.length>20?e.name.slice(0,18)+"…":e.name),e.provided.forEach((e,t)=>{const E=32+16*t;R.append("circle").attr("cx",180).attr("cy",E+8).attr("r",3.5).attr("fill","#2DD4A8").attr("stroke","#F5F0E8").attr("stroke-width",1),R.append("text").attr("x",172).attr("y",E+8+3).attr("text-anchor","end").attr("font-size",8).attr("fill","#2DD4A8").attr("font-family","'Space Mono',monospace").attr("opacity",.8).text(e.name.length>16?e.name.slice(0,14)+"…":e.name)}),e.required.forEach((e,t)=>{const E=32+16*t;R.append("circle").attr("cx",0).attr("cy",E+8).attr("r",3.5).attr("fill","#4A90D9").attr("stroke","#F5F0E8").attr("stroke-width",1),R.append("text").attr("x",8).attr("y",E+8+3).attr("text-anchor","start").attr("font-size",8).attr("fill","#4A90D9").attr("font-family","'Space Mono',monospace").attr("opacity",.8).text(e.name.length>16?e.name.slice(0,14)+"…":e.name)})}),setTimeout(()=>{const e=u.node().getBBox();if(!e.width)return;const t=Math.min(1,Math.min((h-120)/e.width,(f-120)/e.height)),E=h/2-t*(e.x+e.width/2),n=f/2-t*(e.y+e.height/2);M.transition().duration(500).call(d3.zoom().scaleExtent([.2,3]).on("zoom",e=>u.attr("transform",e.transform)).transform,d3.zoomIdentity.translate(E,n).scale(t))},100)}function setTab(e){tab=e,document.querySelectorAll(".stab").forEach(t=>t.classList.toggle("act",t.dataset.t===e)),renderSide()}function renderSide(){const e=document.getElementById("sb");if("tree"===tab){const t=[...new Set([...["Powertrain","Chassis","Body","ADAS","Infotainment","Connectivity"].filter(e=>model.domains[e]),...Object.keys(model.domains)])];return void(e.innerHTML=`<div class="sec"><div class="sth" style="color:var(--t3)">Architecture Tree</div>${t.map(e=>{const t=DMETA[e]||{icon:"📦"},E=model.domains[e]||[];return E.length?`<div style="margin-bottom:10px"><div style="font-size:12px;font-weight:700;cursor:pointer;padding:5px 0;color:var(--t2)" onclick="nav('domain','${e}')">${t.icon} ${e} <span style="font-size:9px;color:var(--t4)">(${E.length})</span></div>${E.map(e=>`<div class="tree-item" style="padding-left:14px;margin-left:8px;border-left:1px solid var(--brd)" onclick="selComp=model.components.find(x=>x.name==='${e.name}');setTab('detail')">${e.name} <span style="font-size:9px;color:var(--t4)">↑${e.provided.length}↓${e.required.length}</span></div>`).join("")}</div>`:""}).join("")}</div>`)}if("arxml"===tab)return selComp&&selComp.arxml?void(e.innerHTML=`<div class="ax-bar"><span>${selComp.name}</span></div><pre class="ax-code">${escH(fmtXml(selComp.arxml))}</pre>`):void(e.innerHTML='<div style="padding:40px 18px;text-align:center;color:var(--t4);font-size:12px">Select a component to view ARXML</div>');if(!selComp){if(curDom){const t=model.domains[curDom]||[],E=DMETA[curDom]||{icon:"?"};e.innerHTML=`<div class="dh"><div class="dn">${E.icon} ${curDom}</div><div class="dt">${t.length} components</div></div><div class="sec"><div class="sth" style="color:var(--t3)">Components</div>${t.map(e=>`<div class="conn-chip" style="cursor:pointer" onclick="selComp=model.components.find(x=>x.name==='${e.name}');renderSide()">${e.name} <span style="float:right;font-size:9px;color:var(--t4)">↑${e.provided.length} ↓${e.required.length}</span></div>`).join("")}</div>`}else e.innerHTML='<div style="padding:40px 18px;text-align:center;color:var(--t4);font-size:12px">Click a component to see details</div>';return}const t=selComp,E=DMETA[t.domain]||{icon:"?",color:"#A8A4A0"},n=model.connections.filter(e=>e.from===t.name),T=model.connections.filter(e=>e.to===t.name);e.innerHTML=`<div class="dh"><div class="dn">${t.name}</div><div class="dt">${t.type||"ADAPTIVE-APPLICATION-SW-COMPONENT-TYPE"}</div><div class="dd" style="background:${E.color}18;color:${E.color};border:1px solid ${E.color}33">${E.icon} ${t.domain}</div></div>\n    ${t.provided.length?`<div class="sec"><div class="sth" style="color:var(--teal)">Provided Ports (${t.provided.length})</div>${t.provided.map(e=>`<div class="port-chip prov"><span>● ${e.name}</span><span class="port-if">${e.iface}</span></div>`).join("")}</div>`:""}\n    ${t.required.length?`<div class="sec"><div class="sth" style="color:var(--blue)">Required Ports (${t.required.length})</div>${t.required.map(e=>`<div class="port-chip req"><span>○ ${e.name}</span><span class="port-if">${e.iface}</span></div>`).join("")}</div>`:""}\n    ${n.length?`<div class="sec"><div class="sth" style="color:var(--lav)">Sends to (${n.length})</div>${n.map(e=>`<div class="conn-chip">→ ${e.to} <span style="opacity:.5;font-size:10px">${e.label} (${e.type})</span></div>`).join("")}</div>`:""}\n    ${T.length?`<div class="sec"><div class="sth" style="color:var(--lav)">Receives from (${T.length})</div>${T.map(e=>`<div class="conn-chip">← ${e.from} <span style="opacity:.5;font-size:10px">${e.label} (${e.type})</span></div>`).join("")}</div>`:""}`}function escH(e){const t=document.createElement("div");return t.textContent=e,t.innerHTML}function fmtXml(e){let t="",E=0;return e.replace(/></g,">\n<").split("\n").forEach(e=>{(e=e.trim())&&(e.startsWith("</")&&(E=Math.max(0,E-1)),t+="  ".repeat(E)+e+"\n",!e.startsWith("<")||e.startsWith("</")||e.endsWith("/>")||e.includes("</")||E++)}),t}
function inferEcu(name){const n=(name||"").toLowerCase();if(/radar|camera|lidar|sensor/.test(n))return"Sensor ECU";if(/adas|planning|fusion|decision/.test(n))return"ADAS ECU";if(/inverter|powertrain|motor|torque/.test(n))return"Powertrain ECU";if(/hmi|cluster|display|infotainment/.test(n))return"Cockpit ECU";if(/gateway|telematic|cloud|v2x/.test(n))return"Gateway ECU";return"Zone Controller"}
function normalizeType(type){if(!type)return"Unknown";if(type.includes("SERVICE"))return"Service";if(type.includes("COMPOSITION"))return"Composition";if(type.includes("SENSOR"))return"Sensor/Actuator";if(type.includes("ADAPTIVE"))return"Adaptive App";if(type.includes("APPLICATION"))return"Application";return type.replace(/-SW-COMPONENT-TYPE/g,"")}
function detectAsil(comp){const txt=((comp.arxml||"")+" "+(comp.name||"")).toUpperCase();const m=txt.match(/ASIL[-_ ]?([ABCDQM])/);return m?`ASIL-${m[1]}`:(/BRAKE|STEER|AIRBAG|EMERGENCY/.test(txt)?"ASIL-D":null)}
function detectTrust(comp){const txt=((comp.arxml||"")+" "+(comp.name||"")).toLowerCase();if(/gateway|cloud|v2x|ota|external/.test(txt))return"external-boundary";if(/secure|hsm|crypto|key/.test(txt))return"secure-zone";return null}
function enrichModel(){model.components.forEach(c=>{c.componentType=normalizeType(c.type);c.ecu=c.ecu||inferEcu(c.name);c.asil=detectAsil(c);c.trustBoundary=detectTrust(c)})}
const _buildModel=buildModel;buildModel=function(data){_buildModel(data);enrichModel();renderAnalysisControls()}
function getCriticalPath(){const stages=[/perception|radar|camera|fusion/i,/planning|decision|coordinator/i,/actuation|inverter|brake|steer|control/i];const picks=stages.map(rx=>model.components.filter(c=>rx.test(c.name)));if(!picks[0].length||!picks[1].length||!picks[2].length)return{nodes:new Set(),edges:new Set()};const edges=new Set();const nodes=new Set();const byFrom={};model.connections.forEach(c=>(byFrom[c.from]=byFrom[c.from]||[]).push(c));function link(a,b){const q=[[a,[]]],seen=new Set([a]);while(q.length){const [n,path]=q.shift();if(n===b)return path;for(const e of (byFrom[n]||[])){if(seen.has(e.to))continue;seen.add(e.to);q.push([e.to,[...path,e]])}}return null}
for(const s of picks[0])for(const m of picks[1]){const p1=link(s.name,m.name);if(!p1)continue;for(const e of p1){edges.add(`${e.from}>${e.to}:${e.label}`);nodes.add(e.from);nodes.add(e.to)}for(const a of picks[2]){const p2=link(m.name,a.name);if(!p2)continue;for(const e of p2){edges.add(`${e.from}>${e.to}:${e.label}`);nodes.add(e.from);nodes.add(e.to)}}}
return{nodes,edges}}
function passesFilters(comp,conn){const f=analysisState.filters;if(comp){if(f.domain!=="all"&&comp.domain!==f.domain)return!1;if(f.ecu!=="all"&&comp.ecu!==f.ecu)return!1;if(f.componentType!=="all"&&comp.componentType!==f.componentType)return!1}if(conn){if(f.interfaceKind!=="all"&&conn.interfaceKind!==f.interfaceKind)return!1;if(f.connectionType!=="all"&&conn.connectionType!==f.connectionType)return!1;if(f.linkSource!=="all"&&((f.linkSource==="explicit")?!conn.explicit:conn.explicit))return!1}return!0}
function renderAnalysisControls(){const el=document.getElementById("analysisControls");if(!el)return;const show=model.components.length>0;el.style.display=show?"flex":"none";if(!show)return;const uniq=(arr)=>["all",...new Set(arr.filter(Boolean))];const domains=uniq(model.components.map(c=>c.domain));const ecus=uniq(model.components.map(c=>c.ecu));const ctypes=uniq(model.components.map(c=>c.componentType));const ikinds=uniq(model.connections.map(c=>c.interfaceKind));const ckinds=uniq(model.connections.map(c=>c.connectionType));const opt=(arr,sel)=>arr.map(v=>`<option value="${v}" ${sel===v?"selected":""}>${v}</option>`).join("");el.innerHTML=`<div class="ctrl-group"><label>View</label><select id="vmode"><option value="logical" ${analysisState.mode==='logical'?'selected':''}>Logical functional architecture</option><option value="service" ${analysisState.mode==='service'?'selected':''}>Service/interface dependency graph</option><option value="ecu" ${analysisState.mode==='ecu'?'selected':''}>ECU/zonal deployment view</option><option value="safety" ${analysisState.mode==='safety'?'selected':''}>Safety/security overlays</option></select></div>
<div class="ctrl-group"><label>Domain</label><select id="fDomain">${opt(domains,analysisState.filters.domain)}</select></div>
<div class="ctrl-group"><label>ECU</label><select id="fEcu">${opt(ecus,analysisState.filters.ecu)}</select></div>
<div class="ctrl-group"><label>Comp</label><select id="fType">${opt(ctypes,analysisState.filters.componentType)}</select></div>
<div class="ctrl-group"><label>Interface</label><select id="fIface">${opt(ikinds,analysisState.filters.interfaceKind)}</select></div>
<div class="ctrl-group"><label>Conn</label><select id="fConn">${opt(ckinds,analysisState.filters.connectionType)}</select></div>
<div class="ctrl-group"><label>Links</label><select id="fLink"><option value="all" ${analysisState.filters.linkSource==='all'?'selected':''}>all</option><option value="explicit" ${analysisState.filters.linkSource==='explicit'?'selected':''}>explicit</option><option value="inferred" ${analysisState.filters.linkSource==='inferred'?'selected':''}>inferred</option></select></div>
<button id="criticalBtn" class="${analysisState.criticalPath?'active':''}">Critical path</button><button id="summaryBtn" class="${analysisState.showSummary?'active':''}">Domain summary</button>`;
el.querySelector('#vmode').onchange=(e)=>{analysisState.mode=e.target.value;level==='vehicle'?renderVehicle():renderDomain(curDom)};
el.querySelector('#fDomain').onchange=(e)=>{analysisState.filters.domain=e.target.value;level==='vehicle'?renderVehicle():renderDomain(curDom)};
el.querySelector('#fEcu').onchange=(e)=>{analysisState.filters.ecu=e.target.value;level==='vehicle'?renderVehicle():renderDomain(curDom)};
el.querySelector('#fType').onchange=(e)=>{analysisState.filters.componentType=e.target.value;level==='vehicle'?renderVehicle():renderDomain(curDom)};
el.querySelector('#fIface').onchange=(e)=>{analysisState.filters.interfaceKind=e.target.value;level==='vehicle'?renderVehicle():renderDomain(curDom)};
el.querySelector('#fConn').onchange=(e)=>{analysisState.filters.connectionType=e.target.value;level==='vehicle'?renderVehicle():renderDomain(curDom)};
el.querySelector('#fLink').onchange=(e)=>{analysisState.filters.linkSource=e.target.value;level==='vehicle'?renderVehicle():renderDomain(curDom)};
el.querySelector('#criticalBtn').onclick=()=>{analysisState.criticalPath=!analysisState.criticalPath;renderAnalysisControls();level==='vehicle'?renderVehicle():renderDomain(curDom)};
el.querySelector('#summaryBtn').onclick=()=>{analysisState.showSummary=!analysisState.showSummary;renderAnalysisControls();renderVehicle()};}
const _renderVehicle=renderVehicle,_renderDomain=renderDomain;
function renderGraph(scopeDomain){document.getElementById("legend").style.display="flex";const root=document.getElementById("view");root.style.display="block";root.innerHTML='<svg id="dsvg" width="100%" height="100%"></svg>';
const comps=model.components.filter(c=>passesFilters(c));const byName=new Map(comps.map(c=>[c.name,c]));let conns=model.connections.filter(c=>byName.has(c.from)&&byName.has(c.to)&&passesFilters(null,c));if(scopeDomain)conns=conns.filter(c=>byName.get(c.from)?.domain===scopeDomain||byName.get(c.to)?.domain===scopeDomain);
if(!comps.length)return;const critical=analysisState.criticalPath?getCriticalPath():{nodes:new Set(),edges:new Set()};const svg=d3.select('#dsvg');svg.selectAll('*').remove();const g=svg.append('g');svg.call(d3.zoom().scaleExtent([.2,3]).on('zoom',e=>g.attr('transform',e.transform)));
const laneKey=analysisState.mode==='ecu'?'ecu':'domain';const lanes=[...new Set(comps.map(c=>c[laneKey]||'Unknown'))];const laneX=new Map(lanes.map((l,i)=>[l,80+i*250]));const laneY={};lanes.forEach(l=>laneY[l]=40);comps.forEach(c=>{c._x=laneX.get(c[laneKey]||'Unknown');c._y=laneY[c[laneKey]||'Unknown'];laneY[c[laneKey]||'Unknown']+=100});
lanes.forEach(l=>{g.append('text').attr('x',laneX.get(l)).attr('y',20).attr('font-size',10).attr('fill','#7A7468').text(l)});
const color={event:'#4A90D9',method:'#1A1A1A',field:'#9B8FD4'};conns.forEach(e=>{const s=byName.get(e.from),t=byName.get(e.to);if(!s||!t)return;const key=`${e.from}>${e.to}:${e.label}`;const isCrit=critical.edges.has(key);g.append('line').attr('x1',s._x+140).attr('y1',s._y+25).attr('x2',t._x).attr('y2',t._y+25).attr('stroke',isCrit?'#C45A20':(analysisState.mode==='service'?'#6B5BA8':color[e.type]||'#555')).attr('stroke-width',isCrit?2.6:1.2).attr('stroke-dasharray',e.type==='event'?'5 3':(e.explicit?'none':'2 2')).attr('opacity',.75)});
comps.forEach(c=>{const isCrit=critical.nodes.has(c.name);const node=g.append('g').attr('transform',`translate(${c._x},${c._y})`).attr('cursor','pointer').on('click',()=>{selComp=c;renderSide()});node.append('rect').attr('width',140).attr('height',52).attr('rx',8).attr('fill','#fff').attr('stroke',isCrit?'#C45A20':'#C8BFB0').attr('stroke-width',isCrit?2.2:1.1);
node.append('text').attr('x',8).attr('y',18).attr('font-size',10).attr('font-weight',700).text(c.name.length>18?c.name.slice(0,16)+'…':c.name);
node.append('text').attr('x',8).attr('y',34).attr('font-size',8).attr('fill','#7A7468').text(c.componentType);
if(analysisState.mode==='safety'){if(c.asil)node.append('text').attr('x',8).attr('y',46).attr('font-size',8).attr('fill','#C0392B').text(c.asil);if(c.trustBoundary)node.append('text').attr('x',70).attr('y',46).attr('font-size',8).attr('fill','#1A8A6A').text(c.trustBoundary)}});
}
renderVehicle=function(){if(analysisState.showSummary){document.getElementById("legend").style.display="none";_renderVehicle();return}renderGraph(null)};
renderDomain=function(domain){renderGraph(domain)};
updStatus=function(){document.getElementById("stL").textContent=`${model.components.length} components · ${model.connections.length} connections · mode: ${analysisState.mode} · summary: ${analysisState.showSummary?"on":"off"}`};
hideDrop=(function(orig){return function(){orig();renderAnalysisControls()}})(hideDrop);
function loadSample(){
  const sample=`<?xml version="1.0" encoding="UTF-8"?>
<!-- Synthetic, non-proprietary demo ARXML generated for SysCanvas UX testing (implemented by Vibe Code through AI). -->
<AUTOSAR xmlns="http://autosar.org/schema/r4.0">
  <AR-PACKAGES>
    <AR-PACKAGE>
      <SHORT-NAME>VehicleSystem</SHORT-NAME>
      <AR-PACKAGES>
        <AR-PACKAGE>
          <SHORT-NAME>Interfaces</SHORT-NAME>
          <ELEMENTS>
            <SERVICE-INTERFACE><SHORT-NAME>DiagEventService</SHORT-NAME><EVENTS><EVENT><SHORT-NAME>OnDtcUpdate</SHORT-NAME></EVENT></EVENTS></SERVICE-INTERFACE>
            <CLIENT-SERVER-INTERFACE><SHORT-NAME>PowertrainCoordination</SHORT-NAME><OPERATIONS><OPERATION-PROTOTYPE><SHORT-NAME>RequestTorque</SHORT-NAME></OPERATION-PROTOTYPE><OPERATION-PROTOTYPE><SHORT-NAME>LimitTorque</SHORT-NAME></OPERATION-PROTOTYPE></OPERATIONS></CLIENT-SERVER-INTERFACE>
            <SENDER-RECEIVER-INTERFACE><SHORT-NAME>VehicleDynamicsBus</SHORT-NAME><DATA-ELEMENTS><DATA-ELEMENT-PROTOTYPE><SHORT-NAME>VehicleSpeedKph</SHORT-NAME></DATA-ELEMENT-PROTOTYPE><DATA-ELEMENT-PROTOTYPE><SHORT-NAME>YawRateDegS</SHORT-NAME></DATA-ELEMENT-PROTOTYPE></DATA-ELEMENTS></SENDER-RECEIVER-INTERFACE>
            <SENDER-RECEIVER-INTERFACE><SHORT-NAME>PerceptionObjectList</SHORT-NAME><DATA-ELEMENTS><DATA-ELEMENT-PROTOTYPE><SHORT-NAME>TrackedObjects</SHORT-NAME></DATA-ELEMENT-PROTOTYPE></DATA-ELEMENTS></SENDER-RECEIVER-INTERFACE>
            <SERVICE-INTERFACE><SHORT-NAME>CabinClimateState</SHORT-NAME><FIELDS><FIELD><SHORT-NAME>CabinTempSetpoint</SHORT-NAME></FIELD><FIELD><SHORT-NAME>CompressorLoadPercent</SHORT-NAME></FIELD></FIELDS></SERVICE-INTERFACE>
            <SERVICE-INTERFACE><SHORT-NAME>HmiVehicleState</SHORT-NAME><FIELDS><FIELD><SHORT-NAME>RangeKm</SHORT-NAME></FIELD><FIELD><SHORT-NAME>ChargeState</SHORT-NAME></FIELD></FIELDS></SERVICE-INTERFACE>
            <SERVICE-INTERFACE><SHORT-NAME>CloudConnectivityStatus</SHORT-NAME><EVENTS><EVENT><SHORT-NAME>OnCellularStateChanged</SHORT-NAME></EVENT></EVENTS></SERVICE-INTERFACE>
          </ELEMENTS>
        </AR-PACKAGE>
        <AR-PACKAGE>
          <SHORT-NAME>Components</SHORT-NAME>
          <ELEMENTS>
            <SERVICE-SW-COMPONENT-TYPE><SHORT-NAME>VehicleMotionProviderType</SHORT-NAME><PORTS><P-PORT-PROTOTYPE><SHORT-NAME>dyn_out</SHORT-NAME><PROVIDED-INTERFACE-TREF DEST="SENDER-RECEIVER-INTERFACE">/VehicleSystem/Interfaces/VehicleDynamicsBus</PROVIDED-INTERFACE-TREF></P-PORT-PROTOTYPE></PORTS></SERVICE-SW-COMPONENT-TYPE>
            <ADAPTIVE-APPLICATION-SW-COMPONENT-TYPE><SHORT-NAME>PowertrainCoordinatorType</SHORT-NAME><PORTS><R-PORT-PROTOTYPE><SHORT-NAME>dyn_in</SHORT-NAME><REQUIRED-INTERFACE-TREF DEST="SENDER-RECEIVER-INTERFACE">/VehicleSystem/Interfaces/VehicleDynamicsBus</REQUIRED-INTERFACE-TREF></R-PORT-PROTOTYPE><P-PORT-PROTOTYPE><SHORT-NAME>pt_ctrl</SHORT-NAME><PROVIDED-INTERFACE-TREF DEST="CLIENT-SERVER-INTERFACE">/VehicleSystem/Interfaces/PowertrainCoordination</PROVIDED-INTERFACE-TREF></P-PORT-PROTOTYPE><P-PORT-PROTOTYPE><SHORT-NAME>diag_out</SHORT-NAME><PROVIDED-INTERFACE-TREF DEST="SERVICE-INTERFACE">/VehicleSystem/Interfaces/DiagEventService</PROVIDED-INTERFACE-TREF></P-PORT-PROTOTYPE></PORTS></ADAPTIVE-APPLICATION-SW-COMPONENT-TYPE>
            <ADAPTIVE-APPLICATION-SW-COMPONENT-TYPE><SHORT-NAME>InverterControlType</SHORT-NAME><PORTS><R-PORT-PROTOTYPE><SHORT-NAME>pt_req</SHORT-NAME><REQUIRED-INTERFACE-TREF DEST="CLIENT-SERVER-INTERFACE">/VehicleSystem/Interfaces/PowertrainCoordination</REQUIRED-INTERFACE-TREF></R-PORT-PROTOTYPE></PORTS></ADAPTIVE-APPLICATION-SW-COMPONENT-TYPE>
            <ADAPTIVE-APPLICATION-SW-COMPONENT-TYPE><SHORT-NAME>RadarPerceptionType</SHORT-NAME><PORTS><P-PORT-PROTOTYPE><SHORT-NAME>objects_out</SHORT-NAME><PROVIDED-INTERFACE-TREF DEST="SENDER-RECEIVER-INTERFACE">/VehicleSystem/Interfaces/PerceptionObjectList</PROVIDED-INTERFACE-TREF></P-PORT-PROTOTYPE></PORTS></ADAPTIVE-APPLICATION-SW-COMPONENT-TYPE>
            <ADAPTIVE-APPLICATION-SW-COMPONENT-TYPE><SHORT-NAME>AdasDecisionType</SHORT-NAME><PORTS><R-PORT-PROTOTYPE><SHORT-NAME>objects_in</SHORT-NAME><REQUIRED-INTERFACE-TREF DEST="SENDER-RECEIVER-INTERFACE">/VehicleSystem/Interfaces/PerceptionObjectList</REQUIRED-INTERFACE-TREF></R-PORT-PROTOTYPE><R-PORT-PROTOTYPE><SHORT-NAME>dyn_in</SHORT-NAME><REQUIRED-INTERFACE-TREF DEST="SENDER-RECEIVER-INTERFACE">/VehicleSystem/Interfaces/VehicleDynamicsBus</REQUIRED-INTERFACE-TREF></R-PORT-PROTOTYPE></PORTS></ADAPTIVE-APPLICATION-SW-COMPONENT-TYPE>
            <ADAPTIVE-APPLICATION-SW-COMPONENT-TYPE><SHORT-NAME>ClimateControllerType</SHORT-NAME><PORTS><P-PORT-PROTOTYPE><SHORT-NAME>climate_out</SHORT-NAME><PROVIDED-INTERFACE-TREF DEST="SERVICE-INTERFACE">/VehicleSystem/Interfaces/CabinClimateState</PROVIDED-INTERFACE-TREF></P-PORT-PROTOTYPE></PORTS></ADAPTIVE-APPLICATION-SW-COMPONENT-TYPE>
            <ADAPTIVE-APPLICATION-SW-COMPONENT-TYPE><SHORT-NAME>ClusterHmiType</SHORT-NAME><PORTS><R-PORT-PROTOTYPE><SHORT-NAME>climate_in</SHORT-NAME><REQUIRED-INTERFACE-TREF DEST="SERVICE-INTERFACE">/VehicleSystem/Interfaces/CabinClimateState</REQUIRED-INTERFACE-TREF></R-PORT-PROTOTYPE><P-PORT-PROTOTYPE><SHORT-NAME>hmi_state</SHORT-NAME><PROVIDED-INTERFACE-TREF DEST="SERVICE-INTERFACE">/VehicleSystem/Interfaces/HmiVehicleState</PROVIDED-INTERFACE-TREF></P-PORT-PROTOTYPE></PORTS></ADAPTIVE-APPLICATION-SW-COMPONENT-TYPE>
            <ADAPTIVE-APPLICATION-SW-COMPONENT-TYPE><SHORT-NAME>TelematicsGatewayType</SHORT-NAME><PORTS><R-PORT-PROTOTYPE><SHORT-NAME>diag_in</SHORT-NAME><REQUIRED-INTERFACE-TREF DEST="SERVICE-INTERFACE">/VehicleSystem/Interfaces/DiagEventService</REQUIRED-INTERFACE-TREF></R-PORT-PROTOTYPE><R-PORT-PROTOTYPE><SHORT-NAME>hmi_in</SHORT-NAME><REQUIRED-INTERFACE-TREF DEST="SERVICE-INTERFACE">/VehicleSystem/Interfaces/HmiVehicleState</REQUIRED-INTERFACE-TREF></R-PORT-PROTOTYPE><P-PORT-PROTOTYPE><SHORT-NAME>cloud_status</SHORT-NAME><PROVIDED-INTERFACE-TREF DEST="SERVICE-INTERFACE">/VehicleSystem/Interfaces/CloudConnectivityStatus</PROVIDED-INTERFACE-TREF></P-PORT-PROTOTYPE></PORTS></ADAPTIVE-APPLICATION-SW-COMPONENT-TYPE>
            <COMPOSITION-SW-COMPONENT-TYPE><SHORT-NAME>VehicleEeaComposition</SHORT-NAME><COMPONENTS>
              <SW-COMPONENT-PROTOTYPE><SHORT-NAME>VehicleMotionProvider</SHORT-NAME><TYPE-TREF DEST="SERVICE-SW-COMPONENT-TYPE">/VehicleSystem/Components/VehicleMotionProviderType</TYPE-TREF></SW-COMPONENT-PROTOTYPE>
              <SW-COMPONENT-PROTOTYPE><SHORT-NAME>PowertrainCoordinator</SHORT-NAME><TYPE-TREF DEST="ADAPTIVE-APPLICATION-SW-COMPONENT-TYPE">/VehicleSystem/Components/PowertrainCoordinatorType</TYPE-TREF></SW-COMPONENT-PROTOTYPE>
              <SW-COMPONENT-PROTOTYPE><SHORT-NAME>InverterControl</SHORT-NAME><TYPE-TREF DEST="ADAPTIVE-APPLICATION-SW-COMPONENT-TYPE">/VehicleSystem/Components/InverterControlType</TYPE-TREF></SW-COMPONENT-PROTOTYPE>
              <SW-COMPONENT-PROTOTYPE><SHORT-NAME>RadarPerception</SHORT-NAME><TYPE-TREF DEST="ADAPTIVE-APPLICATION-SW-COMPONENT-TYPE">/VehicleSystem/Components/RadarPerceptionType</TYPE-TREF></SW-COMPONENT-PROTOTYPE>
              <SW-COMPONENT-PROTOTYPE><SHORT-NAME>AdasDecision</SHORT-NAME><TYPE-TREF DEST="ADAPTIVE-APPLICATION-SW-COMPONENT-TYPE">/VehicleSystem/Components/AdasDecisionType</TYPE-TREF></SW-COMPONENT-PROTOTYPE>
              <SW-COMPONENT-PROTOTYPE><SHORT-NAME>ClimateController</SHORT-NAME><TYPE-TREF DEST="ADAPTIVE-APPLICATION-SW-COMPONENT-TYPE">/VehicleSystem/Components/ClimateControllerType</TYPE-TREF></SW-COMPONENT-PROTOTYPE>
              <SW-COMPONENT-PROTOTYPE><SHORT-NAME>ClusterHmi</SHORT-NAME><TYPE-TREF DEST="ADAPTIVE-APPLICATION-SW-COMPONENT-TYPE">/VehicleSystem/Components/ClusterHmiType</TYPE-TREF></SW-COMPONENT-PROTOTYPE>
              <SW-COMPONENT-PROTOTYPE><SHORT-NAME>TelematicsGateway</SHORT-NAME><TYPE-TREF DEST="ADAPTIVE-APPLICATION-SW-COMPONENT-TYPE">/VehicleSystem/Components/TelematicsGatewayType</TYPE-TREF></SW-COMPONENT-PROTOTYPE>
            </COMPONENTS>
            <CONNECTORS>
              <ASSEMBLY-SW-CONNECTOR><SHORT-NAME>Dyn_to_PtCoord</SHORT-NAME><PROVIDER-IREF><CONTEXT-COMPONENT-REF DEST="SW-COMPONENT-PROTOTYPE">/VehicleSystem/Components/VehicleEeaComposition/VehicleMotionProvider</CONTEXT-COMPONENT-REF><TARGET-P-PORT-REF DEST="P-PORT-PROTOTYPE">/VehicleSystem/Components/VehicleMotionProviderType/dyn_out</TARGET-P-PORT-REF></PROVIDER-IREF><REQUESTER-IREF><CONTEXT-COMPONENT-REF DEST="SW-COMPONENT-PROTOTYPE">/VehicleSystem/Components/VehicleEeaComposition/PowertrainCoordinator</CONTEXT-COMPONENT-REF><TARGET-R-PORT-REF DEST="R-PORT-PROTOTYPE">/VehicleSystem/Components/PowertrainCoordinatorType/dyn_in</TARGET-R-PORT-REF></REQUESTER-IREF></ASSEMBLY-SW-CONNECTOR>
              <ASSEMBLY-SW-CONNECTOR><SHORT-NAME>PtCoord_to_Inverter</SHORT-NAME><PROVIDER-IREF><CONTEXT-COMPONENT-REF DEST="SW-COMPONENT-PROTOTYPE">/VehicleSystem/Components/VehicleEeaComposition/PowertrainCoordinator</CONTEXT-COMPONENT-REF><TARGET-P-PORT-REF DEST="P-PORT-PROTOTYPE">/VehicleSystem/Components/PowertrainCoordinatorType/pt_ctrl</TARGET-P-PORT-REF></PROVIDER-IREF><REQUESTER-IREF><CONTEXT-COMPONENT-REF DEST="SW-COMPONENT-PROTOTYPE">/VehicleSystem/Components/VehicleEeaComposition/InverterControl</CONTEXT-COMPONENT-REF><TARGET-R-PORT-REF DEST="R-PORT-PROTOTYPE">/VehicleSystem/Components/InverterControlType/pt_req</TARGET-R-PORT-REF></REQUESTER-IREF></ASSEMBLY-SW-CONNECTOR>
              <ASSEMBLY-SW-CONNECTOR><SHORT-NAME>Diag_to_Tcu</SHORT-NAME><PROVIDER-IREF><CONTEXT-COMPONENT-REF DEST="SW-COMPONENT-PROTOTYPE">/VehicleSystem/Components/VehicleEeaComposition/PowertrainCoordinator</CONTEXT-COMPONENT-REF><TARGET-P-PORT-REF DEST="P-PORT-PROTOTYPE">/VehicleSystem/Components/PowertrainCoordinatorType/diag_out</TARGET-P-PORT-REF></PROVIDER-IREF><REQUESTER-IREF><CONTEXT-COMPONENT-REF DEST="SW-COMPONENT-PROTOTYPE">/VehicleSystem/Components/VehicleEeaComposition/TelematicsGateway</CONTEXT-COMPONENT-REF><TARGET-R-PORT-REF DEST="R-PORT-PROTOTYPE">/VehicleSystem/Components/TelematicsGatewayType/diag_in</TARGET-R-PORT-REF></REQUESTER-IREF></ASSEMBLY-SW-CONNECTOR>
              <ASSEMBLY-SW-CONNECTOR><SHORT-NAME>Objects_to_Adas</SHORT-NAME><PROVIDER-IREF><CONTEXT-COMPONENT-REF DEST="SW-COMPONENT-PROTOTYPE">/VehicleSystem/Components/VehicleEeaComposition/RadarPerception</CONTEXT-COMPONENT-REF><TARGET-P-PORT-REF DEST="P-PORT-PROTOTYPE">/VehicleSystem/Components/RadarPerceptionType/objects_out</TARGET-P-PORT-REF></PROVIDER-IREF><REQUESTER-IREF><CONTEXT-COMPONENT-REF DEST="SW-COMPONENT-PROTOTYPE">/VehicleSystem/Components/VehicleEeaComposition/AdasDecision</CONTEXT-COMPONENT-REF><TARGET-R-PORT-REF DEST="R-PORT-PROTOTYPE">/VehicleSystem/Components/AdasDecisionType/objects_in</TARGET-R-PORT-REF></REQUESTER-IREF></ASSEMBLY-SW-CONNECTOR>
              <ASSEMBLY-SW-CONNECTOR><SHORT-NAME>Dyn_to_Adas</SHORT-NAME><PROVIDER-IREF><CONTEXT-COMPONENT-REF DEST="SW-COMPONENT-PROTOTYPE">/VehicleSystem/Components/VehicleEeaComposition/VehicleMotionProvider</CONTEXT-COMPONENT-REF><TARGET-P-PORT-REF DEST="P-PORT-PROTOTYPE">/VehicleSystem/Components/VehicleMotionProviderType/dyn_out</TARGET-P-PORT-REF></PROVIDER-IREF><REQUESTER-IREF><CONTEXT-COMPONENT-REF DEST="SW-COMPONENT-PROTOTYPE">/VehicleSystem/Components/VehicleEeaComposition/AdasDecision</CONTEXT-COMPONENT-REF><TARGET-R-PORT-REF DEST="R-PORT-PROTOTYPE">/VehicleSystem/Components/AdasDecisionType/dyn_in</TARGET-R-PORT-REF></REQUESTER-IREF></ASSEMBLY-SW-CONNECTOR>
              <ASSEMBLY-SW-CONNECTOR><SHORT-NAME>Climate_to_Cluster</SHORT-NAME><PROVIDER-IREF><CONTEXT-COMPONENT-REF DEST="SW-COMPONENT-PROTOTYPE">/VehicleSystem/Components/VehicleEeaComposition/ClimateController</CONTEXT-COMPONENT-REF><TARGET-P-PORT-REF DEST="P-PORT-PROTOTYPE">/VehicleSystem/Components/ClimateControllerType/climate_out</TARGET-P-PORT-REF></PROVIDER-IREF><REQUESTER-IREF><CONTEXT-COMPONENT-REF DEST="SW-COMPONENT-PROTOTYPE">/VehicleSystem/Components/VehicleEeaComposition/ClusterHmi</CONTEXT-COMPONENT-REF><TARGET-R-PORT-REF DEST="R-PORT-PROTOTYPE">/VehicleSystem/Components/ClusterHmiType/climate_in</TARGET-R-PORT-REF></REQUESTER-IREF></ASSEMBLY-SW-CONNECTOR>
              <ASSEMBLY-SW-CONNECTOR><SHORT-NAME>Hmi_to_Tcu</SHORT-NAME><PROVIDER-IREF><CONTEXT-COMPONENT-REF DEST="SW-COMPONENT-PROTOTYPE">/VehicleSystem/Components/VehicleEeaComposition/ClusterHmi</CONTEXT-COMPONENT-REF><TARGET-P-PORT-REF DEST="P-PORT-PROTOTYPE">/VehicleSystem/Components/ClusterHmiType/hmi_state</TARGET-P-PORT-REF></PROVIDER-IREF><REQUESTER-IREF><CONTEXT-COMPONENT-REF DEST="SW-COMPONENT-PROTOTYPE">/VehicleSystem/Components/VehicleEeaComposition/TelematicsGateway</CONTEXT-COMPONENT-REF><TARGET-R-PORT-REF DEST="R-PORT-PROTOTYPE">/VehicleSystem/Components/TelematicsGatewayType/hmi_in</TARGET-R-PORT-REF></REQUESTER-IREF></ASSEMBLY-SW-CONNECTOR>
            </CONNECTORS>
            </COMPOSITION-SW-COMPONENT-TYPE>
          </ELEMENTS>
        </AR-PACKAGE>
      </AR-PACKAGES>
    </AR-PACKAGE>
  </AR-PACKAGES>
</AUTOSAR>`;
  buildModel(parseARXML(sample));
  hideDrop();
  nav("vehicle");
}
document.getElementById("cvs").addEventListener("dragover",e=>e.preventDefault()),document.getElementById("cvs").addEventListener("drop",e=>{e.preventDefault(),handleFiles(e.dataTransfer.files)}),"undefined"==typeof d3&&(document.getElementById("dropZ").innerHTML='<div style="text-align:center;padding:60px"><h3 style="color:#E8655A;font-size:18px">Failed to load D3.js</h3><p style="color:#5E5C6A;margin-top:8px;font-size:13px">Please check your internet connection and reload the page.</p></div>');
