
// Brand configuration — change BRAND.name here to rename across the app
const BRAND = window.SYSCANVAS_CONFIG;
var DMETA={Powertrain:{icon:"⚡",color:"#D4864A",c:"copper"},Chassis:{icon:"🛞",color:"#4A90D9",c:"blue"},Body:{icon:"💡",color:"#2DD4A8",c:"teal"},ADAS:{icon:"📡",color:"#E8655A",c:"coral"},Infotainment:{icon:"🖥️",color:"#9B8FD4",c:"lav"},Connectivity:{icon:"🌐",color:"#5CB8E4",c:"sky"}},domains={},connections=[],level="vehicle",curDom=null,selId=null,tab="edit",connMode=!1,connSrc=null,idC=1;function findComp(e){for(var n in domains)for(var t=0;t<domains[n].length;t++)if(domains[n][t].id===e)return{comp:domains[n][t],domain:n};return null}function allComps(){var e=[];for(var n in domains)e=e.concat(domains[n]);return e}function domainInterfaces(e){var n=domains[e]||[],t=new Set;return n.forEach(function(e){e.provided.forEach(function(e){e.iface&&t.add(e.iface)}),e.required.forEach(function(e){e.iface&&t.add(e.iface)})}),Array.from(t)}function allInterfaces(){var e=new Map;return allComps().forEach(function(n){n.provided.forEach(function(t){t.iface&&(e.has(t.iface)||e.set(t.iface,{name:t.iface,providers:[],consumers:[]}),e.get(t.iface).providers.push(n.name))}),n.required.forEach(function(t){t.iface&&(e.has(t.iface)||e.set(t.iface,{name:t.iface,providers:[],consumers:[]}),e.get(t.iface).consumers.push(n.name))})}),Array.from(e.values())}function escH(e){var n=document.createElement("div");return n.textContent=e,n.innerHTML}function esc(e){return String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/[^a-zA-Z0-9_.\-]/g,"_")}function addDomain(e){e&&!domains[e]&&(domains[e]=[],refresh())}function removeDomain(e){var n={};(domains[e]||[]).forEach(function(e){n[e.id]=1}),connections=connections.filter(function(e){return!n[e.from]&&!n[e.to]}),delete domains[e],curDom===e&&(curDom=null,level="vehicle"),selId=null,refresh()}function addComponent(e,n,t,a){domains[e]||(domains[e]=[]);var o="c"+idC++;return domains[e].push({id:o,name:n||"NewComponent",provided:t||[{name:"output",iface:"DefaultInterface"}],required:a||[]}),selId=o,refresh(),o}function removeComponent(e,n){domains[e]=domains[e].filter(function(e){return e.id!==n}),connections=connections.filter(function(e){return e.from!==n&&e.to!==n}),selId===n&&(selId=null),refresh()}function addConnection(e,n,t,a){connections.find(function(a){return a.from===e&&a.to===n&&a.label===t})||(connections.push({from:e,to:n,label:t||"interface",type:a||"method"}),refresh())}function rmConn(e,n,t){connections=connections.filter(function(a){return!(a.from===e&&a.to===n&&a.label===t)}),refresh()}function updProp(e,n,t){var a=findComp(e);a&&(a.comp[n]=t),refresh()}function updPort(e,n,t,a,o){var i=findComp(e);i&&i.comp[n][t]&&(i.comp[n][t][a]=o),refresh()}function addPort(e,n){var t=findComp(e);t&&t.comp[n].push({name:"new_port",iface:"NewInterface"}),refresh()}function rmPort(e,n,t){var a=findComp(e);a&&a.comp[n].splice(t,1),refresh()}function moveDom(e,n,t){if(n!==t){for(var a=-1,o=0;o<domains[n].length;o++)if(domains[n][o].id===e){a=o;break}if(!(a<0)){var i=domains[n].splice(a,1)[0];domains[t]||(domains[t]=[]),domains[t].push(i),refresh()}}}function toggleConn(){connMode=!connMode,connSrc=null,document.getElementById("cBan").style.display=connMode?"block":"none";var e=document.getElementById("connBtn");e.style.background=connMode?"var(--teal)":"",e.style.color=connMode?"#F5F0E8":"",e.style.borderColor=connMode?"var(--teal)":""}function nodeClick(e){if(connMode)if(connSrc){if(connSrc!==e){showConnModal(connSrc,e),connSrc=null,connMode=!1,document.getElementById("cBan").style.display="none";var n=document.getElementById("connBtn");n.style.background="",n.style.color="",n.style.borderColor=""}}else connSrc=e,document.getElementById("cBan").textContent="Source: "+(findComp(e)?.comp.name||e)+" → Click target…";else selId=e,renderPanel()}function showConnModal(e,n){var t=findComp(e),a=findComp(n);if(t&&a){var o=t.comp.provided.map(function(e){return e.iface}).filter(Boolean),i=a.comp.required.map(function(e){return e.iface}).filter(Boolean),r=o.filter(function(e){return i.indexOf(e)>=0}),c=r.length?r[0]:o[0]||"ServiceInterface",d=allInterfaces().map(function(e){return e.name});document.getElementById("modal").classList.add("vis"),document.getElementById("modalC").innerHTML='<h3>Connect Components</h3><p style="font-size:11px;color:var(--t3);margin-bottom:12px">'+t.comp.name+" → "+a.comp.name+"</p>"+(r.length?'<div style="padding:6px 10px;border-radius:6px;background:rgba(45,212,168,.06);border:1px solid rgba(45,212,168,.15);font-size:10px;color:var(--teal);margin-bottom:10px">✓ Matching interface found: <strong>'+r[0]+"</strong></div>":"")+'<div class="fg" style="padding:0 0 8px"><label class="fl">Interface Name</label><input class="fi" id="mL" value="'+c+'" list="ifaceList"><datalist id="ifaceList">'+d.map(function(e){return'<option value="'+e+'">'}).join("")+'</datalist></div><div class="fg" style="padding:0 0 12px"><label class="fl">Communication Type</label><select class="fs" id="mT"><option value="method">Method (request/response)</option><option value="event">Event (publish/subscribe)</option><option value="field">Field (get/set/notify)</option></select></div><div style="display:flex;gap:6px"><button class="btn btn-a" onclick="confirmConn(\''+e+"','"+n+"')\">Create Connection</button><button class=\"btn btn-g\" onclick=\"document.getElementById('modal').classList.remove('vis')\">Cancel</button></div>"}}function confirmConn(e,n){var t=document.getElementById("mL").value||"interface",a=document.getElementById("mT").value,o=findComp(e),i=findComp(n);o&&!o.comp.provided.find(function(e){return e.iface===t})&&o.comp.provided.push({name:t.toLowerCase().replace(/[^a-z0-9]/g,"_")+"_out",iface:t}),i&&!i.comp.required.find(function(e){return e.iface===t})&&i.comp.required.push({name:t.toLowerCase().replace(/[^a-z0-9]/g,"_")+"_in",iface:t}),addConnection(e,n,t,a),document.getElementById("modal").classList.remove("vis")}function addDomainPrompt(){var e=Object.keys(DMETA).filter(function(e){return!domains[e]});document.getElementById("modal").classList.add("vis"),document.getElementById("modalC").innerHTML="<h3>Add Domain</h3>"+(e.length?'<div class="fg" style="padding:0 0 8px"><label class="fl">Standard Domains</label><div style="display:flex;flex-wrap:wrap;gap:4px">'+e.map(function(e){return'<button class="btn btn-g" style="padding:4px 8px;font-size:9px" onclick="addDomain(\''+e+"');document.getElementById('modal').classList.remove('vis')\">"+DMETA[e].icon+" "+e+"</button>"}).join("")+"</div></div>":"")+'<div class="fg" style="padding:0 0 8px"><label class="fl">Custom Domain Name</label><input class="fi" id="newDom" placeholder="e.g. Powertrain"></div><div style="display:flex;gap:5px"><button class="btn btn-a" onclick="var v=document.getElementById(\'newDom\').value.trim();if(v)addDomain(v);document.getElementById(\'modal\').classList.remove(\'vis\')">Add</button><button class="btn btn-g" onclick="document.getElementById(\'modal\').classList.remove(\'vis\')">Cancel</button></div>'}function addCompPrompt(e){document.getElementById("modal").classList.add("vis"),document.getElementById("modalC").innerHTML="<h3>Add Component to "+(DMETA[e]?DMETA[e].icon+" ":"")+e+'</h3><div class="fg" style="padding:0 0 10px"><label class="fl">Component Name</label><input class="fi" id="newComp" placeholder="e.g. BrakeController"></div><div style="display:flex;gap:5px"><button class="btn btn-a" onclick="var v=document.getElementById(\'newComp\').value.trim();if(v)addComponent(\''+e+"',v);document.getElementById('modal').classList.remove('vis');nav('domain','"+e+"')\">Add</button><button class=\"btn btn-g\" onclick=\"document.getElementById('modal').classList.remove('vis')\">Cancel</button></div>"}function nav(e,n){level=e,"vehicle"===e?(curDom=null,selId=null,renderVehicle()):"domain"===e&&(curDom=n,selId=null,renderDomain(n)),updBC(),updStatus(),renderPanel()}function updBC(){var e=document.getElementById("bc"),n='<span class="cr'+("vehicle"===level?" act":"")+'" onclick="nav(\'vehicle\')">Vehicle</span>';if(curDom&&(n+='<span class="cs">›</span><span class="cr'+("domain"===level?" act":"")+"\" onclick=\"nav('domain','"+curDom+"')\">"+((DMETA[curDom]||{}).icon||"")+" "+curDom+"</span>"),selId){var t=findComp(selId);t&&(n+='<span class="cs">›</span><span class="cr act">'+t.comp.name+"</span>")}e.innerHTML=n}function updStatus(){var e=allComps(),n=Object.keys(domains).length;document.getElementById("stL").textContent="v1.1.0 · "+n+" domains · "+e.length+" components · "+connections.length+" connections"}function refresh(){"vehicle"===level?renderVehicle():"domain"===level&&curDom&&renderDomain(curDom),updBC(),updStatus(),renderPanel()}function renderVehicle(){document.getElementById("svg").style.display="none",document.getElementById("leg").style.display="none";var e=document.getElementById("viewArea");e.style.display="block";var n=["Powertrain","Chassis","Body","ADAS","Infotainment","Connectivity"],t=[].concat(n.filter(function(e){return domains[e]}),Object.keys(domains).filter(function(e){return n.indexOf(e)<0})),a='<div class="vview"><div class="ani" style="text-align:center"><div class="vt">Vehicle Architecture</div><div class="vs">'+allComps().length+" components across "+t.length+' domains</div></div><div class="dgrid">';t.forEach(function(e,n){var t=DMETA[e]||{icon:"📦",color:"#A8A4A0",c:"copper"},o=domains[e]||[],i=connections.filter(function(n){var t=findComp(n.from),a=findComp(n.to);return t&&t.domain===e&&a&&a.domain!==e||a&&a.domain===e&&t&&t.domain!==e});a+='<div class="dcard ani d'+(n+1)+'" data-c="'+t.c+"\" onclick=\"nav('domain','"+e+'\')"><span class="dico">'+t.icon+'</span><div class="dname">'+e+'</div><div class="dcnt">'+o.length+" component"+(1!==o.length?"s":"")+(i.length?" · "+i.length+" cross-domain":"")+"</div><div>"+o.map(function(e){return'<span class="dtag">'+e.name+"</span>"}).join("")+"</div></div>"}),a+='<div class="dcard add-dom-card ani d'+(t.length+1)+'" onclick="addDomainPrompt()"><span>+</span><div style="font-size:11px">Add Domain</div></div>',a+="</div></div>",e.innerHTML=a}function renderDomain(e){if(document.getElementById("viewArea").style.display="none",document.getElementById("svg").style.display="block",document.getElementById("leg").style.display="flex","undefined"!=typeof d3){var n=d3.select("#svg");n.selectAll("*").remove();var t=domains[e]||[];if(t.length){var a=DMETA[e]||{icon:"?",color:"#A8A4A0"},o=a.color,i=document.getElementById("cvs"),r=i.clientWidth,c=i.clientHeight,d=new Set(t.map(function(e){return e.id})),l=connections.filter(function(e){return d.has(e.from)&&d.has(e.to)}),s=connections.filter(function(e){return d.has(e.from)&&!d.has(e.to)||!d.has(e.from)&&d.has(e.to)}),m=new Set;s.forEach(function(e){d.has(e.from)||m.add(e.from),d.has(e.to)||m.add(e.to)});var f=t.map(function(n){return{id:n.id,name:n.name,provided:n.provided,required:n.required,ghost:!1,domain:e}});m.forEach(function(e){var n=findComp(e);n&&f.push({id:e,name:n.comp.name,provided:n.comp.provided,required:n.comp.required,ghost:!0,domain:n.domain})});var p=[].concat(l,s),u=new Map;f.forEach(function(e){u.set(e.id,e)});var v=p.filter(function(e){return u.has(e.from)&&u.has(e.to)});f.forEach(function(e){var n=Math.max(e.provided.length,e.required.length,1);e._h=Math.max(66,28+16*n+6)});var h={},g={};f.forEach(function(e){h[e.id]=[],g[e.id]=[]}),v.forEach(function(e){h[e.to].push(e.from),g[e.from].push(e.to)});var y=[],E=new Set,C=f.filter(function(e){return 0===h[e.id].length}).map(function(e){return e.id});for(!C.length&&f.length&&(C=[f[0].id]);C.length&&y.length<12;){y.push(C),C.forEach(function(e){E.add(e)});var b=new Set;C.forEach(function(e){g[e].forEach(function(e){!E.has(e)&&h[e].every(function(e){return E.has(e)})&&b.add(e)})}),C=Array.from(b)}var A=f.filter(function(e){return!E.has(e.id)});A.length&&y.push(A.map(function(e){return e.id}));var x=50;y.forEach(function(e){var n=-(e.reduce(function(e,n){var t=u.get(n);return e+(t?t._h:66)},0)+26*(e.length-1))/2;e.forEach(function(e){var t=u.get(e);t&&(t._x=x,t._y=n,n+=t._h+26)}),x+=290});var S=f.map(function(e){return e._y||0}),D=Math.min.apply(null,S),I=n.append("defs");I.append("pattern").attr("id","eg").attr("width",32).attr("height",32).attr("patternUnits","userSpaceOnUse").append("circle").attr("cx",16).attr("cy",16).attr("r",.5).attr("fill","#DDD6C8").attr("opacity",.5),n.append("rect").attr("width","100%").attr("height","100%").attr("fill","url(#eg)");var T={event:"#4A90D9",method:"#1A1A1A",field:"#9B8FD4"};["event","method","field"].forEach(function(e){I.append("marker").attr("id","ma-"+e).attr("viewBox","0 0 8 6").attr("refX",8).attr("refY",3).attr("markerWidth",7).attr("markerHeight",5).attr("orient","auto").append("path").attr("d","M0,0L8,3L0,6Z").attr("fill",T[e])});var R=n.append("g");n.call(d3.zoom().scaleExtent([.2,3]).on("zoom",function(e){R.attr("transform",e.transform)})),R.append("text").attr("x",20).attr("y",D-20).attr("font-size",14).attr("font-weight",700).attr("fill",o).attr("font-family","'DM Sans',sans-serif").text(a.icon+" "+e),R.append("text").attr("x",20).attr("y",D-6).attr("font-size",10).attr("fill","#7A7468").attr("font-family","'DM Sans',sans-serif").attr("cursor","pointer").text("+ Add Component").on("click",function(){addCompPrompt(e)}),v.forEach(function(e){var n=u.get(e.from),t=u.get(e.to);if(n&&t&&void 0!==n._x&&void 0!==t._x){var a=-1;n.provided.forEach(function(n,t){n.iface===e.label&&a<0&&(a=t)});var o=-1;t.required.forEach(function(n,t){n.iface===e.label&&o<0&&(o=t)});var i=28+16*Math.max(0,a)+8,r=28+16*Math.max(0,o)+8,c=n._x+180,d=n._y+i,l=t._x,s=t._y+r,m=(c+l)/2,f=T[e.type]||T.method,p="event"===e.type?"5 3":"field"===e.type?"2 2":"none";R.append("path").attr("d","M"+c+","+d+" C"+m+","+d+" "+m+","+s+" "+l+","+s).attr("fill","none").attr("stroke",f).attr("stroke-width",1.2).attr("stroke-dasharray",p).attr("opacity",.5).attr("marker-end","url(#ma-"+e.type+")");var v=m,h=(d+s)/2,g=e.label.length>20?e.label.slice(0,18)+"…":e.label,y=5.5*g.length+12;R.append("rect").attr("x",v-y/2).attr("y",h-8).attr("width",y).attr("height",15).attr("rx",4).attr("fill","#FFFFFF").attr("stroke","#DDD6C8").attr("stroke-width",.5),R.append("text").attr("x",v).attr("y",h+3).attr("text-anchor","middle").attr("font-size",8).attr("fill",f).attr("font-family","'Space Mono',monospace").text(g)}}),f.forEach(function(e){if(void 0!==e._x){var n=e._x,t=e._y,a=e._h,i=e.ghost,r=e.id===selId,c=i?(DMETA[e.domain]||{color:"#7A7468"}).color:o,d=R.append("g").attr("transform","translate("+n+","+t+")").attr("cursor","pointer").on("click",function(){nodeClick(e.id)});d.append("rect").attr("width",180).attr("height",a).attr("rx",9).attr("fill",i?"#F9F6F0":"#FFFFFF").attr("stroke",r?"#D4864A":c+(i?"44":"55")).attr("stroke-width",r?2.5:1.2).attr("stroke-dasharray",i?"4 3":"none"),d.append("rect").attr("width",180).attr("height",3).attr("rx",1.5).attr("fill",c+(i?"66":"")),i&&d.append("text").attr("x",90).attr("y",13).attr("text-anchor","middle").attr("font-size",7).attr("fill","#A8A098").attr("font-family","'Space Mono',monospace").text(e.domain),d.append("text").attr("x",90).attr("y",i?26:17).attr("text-anchor","middle").attr("font-size",11).attr("font-weight",700).attr("fill",i?"#7A7468":"#1A1A1A").attr("font-family","'DM Sans',sans-serif").text(e.name.length>18?e.name.slice(0,16)+"…":e.name),e.provided.forEach(function(e,n){var t=28+16*n;d.append("circle").attr("cx",180).attr("cy",t+8).attr("r",3).attr("fill","#2DD4A8").attr("stroke","#F5F0E8").attr("stroke-width",1),d.append("text").attr("x",174).attr("y",t+8+3).attr("text-anchor","end").attr("font-size",7).attr("fill","#2DD4A8").attr("font-family","'Space Mono',monospace").attr("opacity",.8).text(e.name.length>14?e.name.slice(0,12)+"…":e.name)}),e.required.forEach(function(e,n){var t=28+16*n;d.append("circle").attr("cx",0).attr("cy",t+8).attr("r",3).attr("fill","#4A90D9").attr("stroke","#F5F0E8").attr("stroke-width",1),d.append("text").attr("x",6).attr("y",t+8+3).attr("text-anchor","start").attr("font-size",7).attr("fill","#4A90D9").attr("font-family","'Space Mono',monospace").attr("opacity",.8).text(e.name.length>14?e.name.slice(0,12)+"…":e.name)})}}),setTimeout(function(){var e=R.node().getBBox();if(e.width){var t=Math.min(1,Math.min((r-100)/e.width,(c-100)/e.height)),a=r/2-t*(e.x+e.width/2),o=c/2-t*(e.y+e.height/2);n.transition().duration(400).call(d3.zoom().scaleExtent([.2,3]).on("zoom",function(e){R.attr("transform",e.transform)}).transform,d3.zoomIdentity.translate(a,o).scale(t))}},80)}else n.append("text").attr("x","50%").attr("y","50%").attr("text-anchor","middle").attr("fill","#7A7468").attr("font-size",13).attr("font-family","'DM Sans',sans-serif").text("No components yet. Click + Add Component below.")}}function setTab(e){tab=e,document.querySelectorAll(".rtb").forEach(function(n){n.classList.toggle("act",n.dataset.t===e)}),renderPanel()}function renderPanel(){var e=document.getElementById("rpBody");if("ai"!==tab)if("arxml"!==tab)if("ifaces"!==tab){var n=selId?findComp(selId):null;if(n){var t=n.comp,a=n.domain,o=(d=DMETA[a]||{icon:"📦",color:"#A8A4A0"},connections.filter(function(e){return e.from===t.id})),i=connections.filter(function(e){return e.to===t.id}),r=allInterfaces().map(function(e){return e.name}).map(function(e){return'<option value="'+e+'">'}).join("");e.innerHTML='<div style="padding:12px 14px;border-bottom:1px solid var(--brd)"><div style="font-size:15px;font-weight:700">'+t.name+'</div><div style="margin-top:4px;display:inline-block;padding:2px 8px;border-radius:5px;font-size:9px;font-weight:600;background:'+d.color+"18;color:"+d.color+";border:1px solid "+d.color+'33">'+d.icon+" "+a+'</div></div><div class="fg"><label class="fl">Name</label><input class="fi" value="'+t.name+'" onchange="updProp(\''+t.id+'\',\'name\',this.value)"></div><div class="fg"><label class="fl">Domain</label><select class="fs" onchange="moveDom(\''+t.id+"','"+a+"',this.value);nav('domain',this.value)\">"+Object.keys(domains).map(function(e){return'<option value="'+e+'"'+(e===a?" selected":"")+">"+e+"</option>"}).join("")+'</select></div><datalist id="dl">'+r+'</datalist><div class="sec"><div class="sth" style="color:var(--teal)">Provided Ports ('+t.provided.length+")</div>"+t.provided.map(function(e,n){return'<div class="pr"><input class="fi" value="'+e.name+'" placeholder="Port name" onchange="updPort(\''+t.id+"','provided',"+n+',\'name\',this.value)"><input class="fi" value="'+(e.iface||"")+'" placeholder="Interface" list="dl" onchange="updPort(\''+t.id+"','provided',"+n+',\'iface\',this.value)"><button class="rm" onclick="rmPort(\''+t.id+"','provided',"+n+')">✕</button></div>'}).join("")+'<button class="abtn" onclick="addPort(\''+t.id+'\',\'provided\')">+ Provided Port</button></div><div class="sec"><div class="sth" style="color:var(--blue)">Required Ports ('+t.required.length+")</div>"+t.required.map(function(e,n){return'<div class="pr"><input class="fi" value="'+e.name+'" placeholder="Port name" onchange="updPort(\''+t.id+"','required',"+n+',\'name\',this.value)"><input class="fi" value="'+(e.iface||"")+'" placeholder="Interface" list="dl" onchange="updPort(\''+t.id+"','required',"+n+',\'iface\',this.value)"><button class="rm" onclick="rmPort(\''+t.id+"','required',"+n+')">✕</button></div>'}).join("")+'<button class="abtn" onclick="addPort(\''+t.id+"','required')\">+ Required Port</button></div>"+(o.length||i.length?'<div class="sec"><div class="sth" style="color:var(--lav)">Connections ('+(o.length+i.length)+")</div>"+o.map(function(e){var n=findComp(e.to);return'<div class="chip conn"><span>→ '+(n?n.comp.name:e.to)+' <span class="if">'+e.label+'</span></span><button class="rm" onclick="rmConn(\''+e.from+"','"+e.to+"','"+e.label+"')\">✕</button></div>"}).join("")+i.map(function(e){var n=findComp(e.from);return'<div class="chip conn"><span>← '+(n?n.comp.name:e.from)+' <span class="if">'+e.label+'</span></span><button class="rm" onclick="rmConn(\''+e.from+"','"+e.to+"','"+e.label+"')\">✕</button></div>"}).join("")+"</div>":"")+'<div class="sec"><button class="btn btn-g" style="width:100%;color:var(--coral);border-color:rgba(232,101,90,.2);font-size:10px" onclick="if(confirm(\'Delete '+t.name+"?'))removeComponent('"+a+"','"+t.id+"');nav('domain','"+a+"')\">Delete Component</button></div>",updBC()}else if(curDom){var c=domains[curDom]||[],d=DMETA[curDom]||{icon:"?",color:"#A8A4A0"};e.innerHTML='<div style="padding:14px;border-bottom:1px solid var(--brd)"><div style="font-size:15px;font-weight:700">'+d.icon+" "+curDom+'</div><div style="font-size:10px;color:var(--t3);margin-top:3px">'+c.length+' components</div></div><div class="sec"><div class="sth" style="color:var(--t3)">Components</div>'+c.map(function(e){return'<div class="chip conn" style="cursor:pointer" onclick="selId=\''+e.id+"';renderPanel();updBC()\">"+e.name+' <span class="if">↑'+e.provided.length+" ↓"+e.required.length+"</span></div>"}).join("")+'<button class="abtn" onclick="addCompPrompt(\''+curDom+'\')">+ Add Component</button></div><div class="sec"><button class="btn btn-g" style="width:100%;color:var(--coral);border-color:rgba(232,101,90,.2)" onclick="if(confirm(\'Remove '+curDom+" domain and all its components?'))removeDomain('"+curDom+"')\">Remove Domain</button></div>"}else e.innerHTML='<div style="padding:30px 14px;text-align:center;color:var(--t4);font-size:11px">Select a domain on the canvas, then click a component to edit</div>'}else{var l=curDom?domainInterfaces(curDom).map(function(e){return allInterfaces().find(function(n){return n.name===e})||{name:e,providers:[],consumers:[]}}):allInterfaces(),s=curDom?((DMETA[curDom]||{}).icon||"")+" "+curDom+" Interfaces":"All Interfaces";e.innerHTML='<div class="sec"><div class="sth" style="color:var(--t3)">'+s+" ("+l.length+")</div>"+(l.length?l.map(function(e){var n=connections.find(function(n){return n.label===e.name}),t=n?n.type:"—";return'<div class="iface-item" onclick="highlightInterface(\''+e.name+'\')"><div><div class="iname">'+e.name+'</div><div class="itype">'+t+" · "+e.providers.length+" provider"+(1!==e.providers.length?"s":"")+" → "+e.consumers.length+" consumer"+(1!==e.consumers.length?"s":"")+"</div></div></div>"}).join(""):'<div style="font-size:10px;color:var(--t4);padding:8px 0">No interfaces defined yet</div>')+"</div>"}else{var m=allComps().length?generateARXML():"\x3c!-- Add components to generate ARXML --\x3e";e.innerHTML='<div class="ax-bar"><span>Full Project ARXML</span><button class="btn btn-g" style="padding:3px 7px;font-size:9px" onclick="downloadARXML()">Download</button></div><pre class="ax-code">'+escH(m)+"</pre>"}else e.innerHTML='<div class="ai-panel"><div class="ai-header"><h4>🤖 AI Copilot</h4><p>Connect your organization\'s AI to get intelligent architecture suggestions</p></div><div class="ai-coming"><div class="badge">Coming Soon</div><p style="font-size:11px;color:var(--t3);line-height:1.6">The AI panel will allow you to connect your own AI provider via API key or OAuth. Your architecture data stays in your browser — the AI connection is direct from your browser to your provider.</p><div class="ai-providers"><div class="ai-prov"><div class="pname">Claude (Anthropic)</div><div class="pdesc">Connect via API key</div></div><div class="ai-prov"><div class="pname">OpenAI / Azure OpenAI</div><div class="pdesc">Connect via API key or OAuth</div></div><div class="ai-prov"><div class="pname">Corporate AI Endpoint</div><div class="pdesc">Connect via custom URL + OAuth</div></div><div class="ai-prov"><div class="pname">Ollama / Local LLM</div><div class="pdesc">Connect to localhost</div></div></div><p style="font-size:9px;color:var(--t4);margin-top:8px">🔒 API keys stored in browser session only.<br>Never transmitted to SysCanvas servers.</p></div></div>'}function highlightInterface(e){var n=allInterfaces().find(function(n){return n.name===e});if(n&&n.providers.length){var t=allComps().find(function(e){return e.name===n.providers[0]});t&&(selId=t.id,tab="edit",document.querySelectorAll(".rtb").forEach(function(e){e.classList.toggle("act","edit"===e.dataset.t)}),renderPanel())}}function legalSafeName(name){var v=String(name||"");return v.replace(/\b(electrobit|vector|dspace|bosch|continental|aptiv|zf|magna|valeo|hyundai|toyota|vw|volkswagen|mercedes|bmw|audi|ford|gm|stellantis|tesla)\b/gi,"vendor")}function safeEsc(name){return esc(legalSafeName(name))}function generateARXML(){
  var comps=allComps(),ifaceMap=new Map();
  comps.forEach(function(c){
    c.provided.forEach(function(p){if(!p.iface)return;var t=connections.find(function(k){return k.label===p.iface})?.type||guessIfaceType(p.iface);ifaceMap.set(p.iface,t)});
    c.required.forEach(function(p){if(!p.iface)return;var t=connections.find(function(k){return k.label===p.iface})?.type||guessIfaceType(p.iface);ifaceMap.set(p.iface,t)});
  });
  connections.forEach(function(c){if(c.label)ifaceMap.set(c.label,c.type||guessIfaceType(c.label));});

  var ifaceXml="";
  ifaceMap.forEach(function(type,name){
    var n=safeEsc(name);
    if(type==='event')ifaceXml+=`            <SENDER-RECEIVER-INTERFACE>
              <SHORT-NAME>${n}</SHORT-NAME>
              <DATA-ELEMENTS>
                <DATA-ELEMENT-PROTOTYPE><SHORT-NAME>${n}_Data</SHORT-NAME></DATA-ELEMENT-PROTOTYPE>
              </DATA-ELEMENTS>
            </SENDER-RECEIVER-INTERFACE>
`;
    else if(type==='field')ifaceXml+=`            <SERVICE-INTERFACE>
              <SHORT-NAME>${n}</SHORT-NAME>
              <FIELDS>
                <FIELD><SHORT-NAME>${n}_Field</SHORT-NAME></FIELD>
              </FIELDS>
            </SERVICE-INTERFACE>
`;
    else ifaceXml+=`            <CLIENT-SERVER-INTERFACE>
              <SHORT-NAME>${n}</SHORT-NAME>
              <OPERATIONS>
                <OPERATION-PROTOTYPE><SHORT-NAME>${n}_Op</SHORT-NAME></OPERATION-PROTOTYPE>
              </OPERATIONS>
            </CLIENT-SERVER-INTERFACE>
`;
  });

  var compTypeXml="",prototypeXml="",connectorXml="";
  comps.forEach(function(c){
    var ports="";
    c.provided.forEach(function(p){
      var ifaceRef=p.iface?`
                  <PROVIDED-INTERFACE-TREF DEST="${destForType(ifaceMap.get(p.iface)||guessIfaceType(p.iface))}">/VehicleSystem/Interfaces/${safeEsc(p.iface)}</PROVIDED-INTERFACE-TREF>`:"";
      ports+=`                <P-PORT-PROTOTYPE>
                  <SHORT-NAME>${safeEsc(p.name)}</SHORT-NAME>${ifaceRef}
                </P-PORT-PROTOTYPE>
`;
    });
    c.required.forEach(function(p){
      var ifaceRef=p.iface?`
                  <REQUIRED-INTERFACE-TREF DEST="${destForType(ifaceMap.get(p.iface)||guessIfaceType(p.iface))}">/VehicleSystem/Interfaces/${safeEsc(p.iface)}</REQUIRED-INTERFACE-TREF>`:"";
      ports+=`                <R-PORT-PROTOTYPE>
                  <SHORT-NAME>${safeEsc(p.name)}</SHORT-NAME>${ifaceRef}
                </R-PORT-PROTOTYPE>
`;
    });
    compTypeXml+=`            <ADAPTIVE-APPLICATION-SW-COMPONENT-TYPE>
              <SHORT-NAME>${safeEsc(c.name)}Type</SHORT-NAME>${ports?`
              <PORTS>
${ports}              </PORTS>`:""}
            </ADAPTIVE-APPLICATION-SW-COMPONENT-TYPE>
`;
    prototypeXml+=`                <SW-COMPONENT-PROTOTYPE><SHORT-NAME>${safeEsc(c.name)}</SHORT-NAME><TYPE-TREF DEST="ADAPTIVE-APPLICATION-SW-COMPONENT-TYPE">/VehicleSystem/ComponentTypes/${safeEsc(c.name)}Type</TYPE-TREF></SW-COMPONENT-PROTOTYPE>
`;
  });

  connections.forEach(function(k,idx){
    var src=findComp(k.from),dst=findComp(k.to);if(!src||!dst)return;
    var p=(src.comp.provided.find(function(p){return p.iface===k.label})||src.comp.provided[0]||{name:'out'}).name;
    var r=(dst.comp.required.find(function(p){return p.iface===k.label})||dst.comp.required[0]||{name:'in'}).name;
    connectorXml+=`                <ASSEMBLY-SW-CONNECTOR>
                  <SHORT-NAME>Conn_${idx+1}</SHORT-NAME>
                  <PROVIDER-IREF><CONTEXT-COMPONENT-REF DEST="SW-COMPONENT-PROTOTYPE">/VehicleSystem/VehicleEea/VehicleEeaComposition/${safeEsc(src.comp.name)}</CONTEXT-COMPONENT-REF><TARGET-P-PORT-REF DEST="P-PORT-PROTOTYPE">/VehicleSystem/ComponentTypes/${safeEsc(src.comp.name)}Type/${safeEsc(p)}</TARGET-P-PORT-REF></PROVIDER-IREF>
                  <REQUESTER-IREF><CONTEXT-COMPONENT-REF DEST="SW-COMPONENT-PROTOTYPE">/VehicleSystem/VehicleEea/VehicleEeaComposition/${safeEsc(dst.comp.name)}</CONTEXT-COMPONENT-REF><TARGET-R-PORT-REF DEST="R-PORT-PROTOTYPE">/VehicleSystem/ComponentTypes/${safeEsc(dst.comp.name)}Type/${safeEsc(r)}</TARGET-R-PORT-REF></REQUESTER-IREF>
                </ASSEMBLY-SW-CONNECTOR>
`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<!--
  Synthetic, non-proprietary ARXML generated by SysCanvas Editor v1.1.0 (implemented by Vibe Code through AI)
  Intended for demo/testing only; validate before production toolchain use.
-->
<AUTOSAR xmlns="http://autosar.org/schema/r4.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <AR-PACKAGES>
    <AR-PACKAGE>
      <SHORT-NAME>VehicleSystem</SHORT-NAME>
      <AR-PACKAGES>
        <AR-PACKAGE>
          <SHORT-NAME>Interfaces</SHORT-NAME>
          <ELEMENTS>
${ifaceXml}          </ELEMENTS>
        </AR-PACKAGE>
        <AR-PACKAGE>
          <SHORT-NAME>ComponentTypes</SHORT-NAME>
          <ELEMENTS>
${compTypeXml}          </ELEMENTS>
        </AR-PACKAGE>
        <AR-PACKAGE>
          <SHORT-NAME>VehicleEea</SHORT-NAME>
          <ELEMENTS>
            <COMPOSITION-SW-COMPONENT-TYPE>
              <SHORT-NAME>VehicleEeaComposition</SHORT-NAME>
              <COMPONENTS>
${prototypeXml}              </COMPONENTS>
              <CONNECTORS>
${connectorXml}              </CONNECTORS>
            </COMPOSITION-SW-COMPONENT-TYPE>
          </ELEMENTS>
        </AR-PACKAGE>
      </AR-PACKAGES>
    </AR-PACKAGE>
  </AR-PACKAGES>
</AUTOSAR>
`;
}
function guessIfaceType(name){var n=(name||'').toLowerCase();return /event|status|signal|state|speed|objects|frame|report|diag|notify/.test(n)?'event':/field|value|temp|charge|soc|state/.test(n)?'field':'method'}
function destForType(type){return type==='event'?'SENDER-RECEIVER-INTERFACE':type==='field'?'SERVICE-INTERFACE':'CLIENT-SERVER-INTERFACE'}
function downloadARXML(){if(allComps().length){var e=new Blob([generateARXML()],{type:"application/xml"}),n=document.createElement("a");n.href=URL.createObjectURL(e),n.download="syscanvas_generated.arxml",n.click(),URL.revokeObjectURL(n.href)}else alert("Add at least one component first.")}function loadStarter(){
  domains={};connections=[];idC=1;
  addDomain("Powertrain");addDomain("Chassis");addDomain("Body");addDomain("ADAS");addDomain("Infotainment");addDomain("Connectivity");

  var vehicleMotion=addComponent("Chassis","VehicleMotionProvider",[{name:"dyn_out",iface:"VehicleDynamicsBus"}],[]);
  var powerCoord=addComponent("Powertrain","PowertrainCoordinator",[{name:"pt_ctrl",iface:"PowertrainCoordination"},{name:"diag_out",iface:"DiagEventService"}],[{name:"dyn_in",iface:"VehicleDynamicsBus"}]);
  var inverter=addComponent("Powertrain","InverterControl",[],[{name:"pt_req",iface:"PowertrainCoordination"}]);

  var radar=addComponent("ADAS","RadarPerception",[{name:"objects_out",iface:"PerceptionObjectList"}],[]);
  var adas=addComponent("ADAS","AdasDecision",[],[{name:"objects_in",iface:"PerceptionObjectList"},{name:"dyn_in",iface:"VehicleDynamicsBus"}]);

  var climate=addComponent("Body","ClimateController",[{name:"climate_out",iface:"CabinClimateState"}],[]);
  var cluster=addComponent("Infotainment","ClusterHmi",[{name:"hmi_state",iface:"HmiVehicleState"}],[{name:"climate_in",iface:"CabinClimateState"}]);
  var tcu=addComponent("Connectivity","TelematicsGateway",[{name:"cloud_status",iface:"CloudConnectivityStatus"}],[{name:"diag_in",iface:"DiagEventService"},{name:"hmi_in",iface:"HmiVehicleState"}]);

  connections=[
    {from:vehicleMotion,to:powerCoord,label:"VehicleDynamicsBus",type:"event"},
    {from:powerCoord,to:inverter,label:"PowertrainCoordination",type:"method"},
    {from:powerCoord,to:tcu,label:"DiagEventService",type:"event"},
    {from:radar,to:adas,label:"PerceptionObjectList",type:"event"},
    {from:vehicleMotion,to:adas,label:"VehicleDynamicsBus",type:"event"},
    {from:climate,to:cluster,label:"CabinClimateState",type:"field"},
    {from:cluster,to:tcu,label:"HmiVehicleState",type:"field"}
  ];
  selId=null;nav("vehicle");
}
"undefined"==typeof d3&&(document.getElementById("rpBody").innerHTML='<div style="padding:30px 14px;text-align:center;color:var(--coral);font-size:11px">Failed to load D3.js. Check internet connection.</div>'),renderVehicle(),renderPanel(),updStatus();
/* Guided demo overlay + impact summary (client-side only) */
(function(){
  let demo={active:false,step:0,steps:[],impact:null};
  function ensureStyles(){
    if(document.getElementById('editor-guided-style')) return;
    const st=document.createElement('style'); st.id='editor-guided-style';
    st.textContent='.guided-demo{position:absolute;z-index:45;max-width:320px;background:#fff;border:1px solid #DDD6C8;border-radius:12px;padding:12px 13px;box-shadow:0 14px 40px rgba(0,0,0,.20)}.guided-demo h4{font-size:12px;margin-bottom:4px}.guided-demo p{font-size:11px;line-height:1.45;color:#4A4540}.guided-demo .meta{font-family:"Space Mono",monospace;font-size:9px;color:#7A7468;margin-bottom:6px}.guided-demo .row{display:flex;gap:6px;justify-content:flex-end;margin-top:9px}.guided-demo button{padding:4px 8px;border:1px solid #DDD6C8;background:#fff;border-radius:6px;font-size:10px;cursor:pointer}.guided-demo button.primary{background:#C45A20;border-color:#C45A20;color:#111}.demo-anchor{position:absolute;z-index:41;padding:3px 7px;background:rgba(26,138,106,.93);color:#fff;border-radius:999px;font-size:9px;font-family:"Space Mono",monospace;pointer-events:none}.impact-box{margin:10px 14px;padding:10px;border:1px solid rgba(26,138,106,.22);background:rgba(26,138,106,.06);border-radius:8px}.impact-box h5{font-size:10px;color:#1A8A6A;margin-bottom:5px}.impact-box .line{font-size:10px;line-height:1.5;color:#4A4540}';
    document.head.appendChild(st);
  }
  function findNodePos(name){
    const svg=document.getElementById('svg'); if(!svg) return null;
    const texts=[...svg.querySelectorAll('text')];
    const t=texts.find(x=>x.textContent===name)||texts.find(x=>name.startsWith((x.textContent||'').replace('…','')));
    if(!t) return null;
    const r=t.getBoundingClientRect(),c=document.getElementById('cvs').getBoundingClientRect();
    return {x:r.left-c.left+r.width/2,y:r.top-c.top+r.height/2};
  }
  function focusByName(name){
    const c=allComps().find(x=>x.name===name); if(!c) return;
    selId=c.id; const dom=Object.keys(domains).find(d=>(domains[d]||[]).some(k=>k.id===c.id));
    if(dom){curDom=dom;level='domain';}
    tab='edit';
    document.querySelectorAll('.rtb').forEach(b=>b.classList.toggle('act',b.dataset.t==='edit'));
    renderVehicle(); renderPanel(); updBC && updBC();
  }
  function renderImpactBox(){
    const host=document.getElementById('rpBody');
    host.querySelectorAll('.impact-box').forEach(n=>n.remove());
    if(!demo.impact) return;
    const div=document.createElement('div'); div.className='impact-box';
    div.innerHTML=`<h5>Before / After Change Impact</h5>
      <div class="line"><strong>Before:</strong> ${demo.impact.before} connected ${demo.impact.beforeLinks} link(s).</div>
      <div class="line"><strong>After:</strong> ${demo.impact.after} connected ${demo.impact.afterLinks} link(s).</div>
      <div class="line"><strong>Affected components:</strong> ${demo.impact.affected.join(', ')}</div>`;
    host.prepend(div);
  }
  function renameInterfaceWithImpact(compName,oldIface,newIface){
    const beforeLinks=connections.filter(c=>c.label===oldIface).length;
    const affectedSet=new Set();
    allComps().forEach(c=>{
      c.provided.forEach(p=>{if(p.iface===oldIface){p.iface=newIface;affectedSet.add(c.name);}});
      c.required.forEach(p=>{if(p.iface===oldIface){p.iface=newIface;affectedSet.add(c.name);}});
    });
    connections.forEach(c=>{if(c.label===oldIface)c.label=newIface;});
    demo.impact={before:oldIface,after:newIface,beforeLinks:beforeLinks,afterLinks:connections.filter(c=>c.label===newIface).length,affected:[...affectedSet]};
    const focus=allComps().find(c=>c.name===compName); if(focus) selId=focus.id;
    renderVehicle(); renderPanel(); renderImpactBox();
  }
  function clearOverlay(){document.querySelectorAll('.guided-demo,.demo-anchor').forEach(n=>n.remove())}
  function showStep(){
    clearOverlay();
    const s=demo.steps[demo.step];
    if(!s) return endGuidedDemo();
    if(s.focus) focusByName(s.focus);
    if(typeof s.run==='function') s.run();
    const card=document.createElement('div'); card.className='guided-demo';
    card.style.right='12px'; card.style.top='12px';
    card.innerHTML=`<div class="meta">Guided Demo • Step ${demo.step+1}/${demo.steps.length}</div><h4>${s.title}</h4><p>${s.body}</p><div class="row"><button onclick="guidedDemoPrev()">Back</button><button onclick="guidedDemoNext()" class="primary">${demo.step===demo.steps.length-1?'Finish':'Next'}</button></div>`;
    document.getElementById('cvs').appendChild(card);
    if(s.focus){
      const pos=findNodePos(s.focus);
      if(pos){
        const chip=document.createElement('div'); chip.className='demo-anchor';
        chip.style.left=(pos.x+8)+'px'; chip.style.top=(pos.y-10)+'px';
        chip.textContent='Focus: '+s.focus;
        document.getElementById('cvs').appendChild(chip);
      }
    }
    if(demo.impact) renderImpactBox();
  }

  window.guidedDemoNext=function(){demo.step++;showStep()};
  window.guidedDemoPrev=function(){demo.step=Math.max(0,demo.step-1);showStep()};
  window.endGuidedDemo=function(){demo.active=false;clearOverlay();document.getElementById('stL').textContent='Guided demo complete';};

  window.loadComplexScenario=function(){
    loadStarter();
    const adasHub=addComponent('ADAS','AdasFusionHub',[{name:'fusion_out',iface:'AdasFusionControl'}],[{name:'objects_in',iface:'PerceptionObjectList'},{name:'dyn_in',iface:'VehicleDynamicsBus'}]);
    const cloudBridge=addComponent('Connectivity','CloudBridge',[{name:'fleet_feed',iface:'FleetAnalyticsFeed'}],[{name:'upload_in',iface:'CloudDtcUpload'}]);
    const predMaint=addComponent('Connectivity','PredictiveMaintenance',[],[{name:'fleet_in',iface:'FleetAnalyticsFeed'}]);
    const tcu=allComps().find(c=>c.name==='TelematicsGateway');
    const pwr=allComps().find(c=>c.name==='PowertrainCoordinator');
    const radar=allComps().find(c=>c.name==='RadarPerception');
    if(tcu && !tcu.provided.find(p=>p.iface==='CloudDtcUpload')) tcu.provided.push({name:'upload_out',iface:'CloudDtcUpload'});
    if(pwr && !pwr.provided.find(p=>p.iface==='DtcBurstEvent')) pwr.provided.push({name:'dtc_burst',iface:'DtcBurstEvent'});
    if(radar && !radar.provided.find(p=>p.iface==='PerceptionObjectList')) radar.provided.push({name:'objects_out',iface:'PerceptionObjectList'});
    addConnection(pwr.id,tcu.id,'DiagEventService','event');
    addConnection(tcu.id,cloudBridge,'CloudDtcUpload','event');
    addConnection(cloudBridge,predMaint,'FleetAnalyticsFeed','field');
    addConnection(radar.id,adasHub,'PerceptionObjectList','event');
    const motion=allComps().find(c=>c.name==='VehicleMotionProvider');
    if(motion) addConnection(motion.id,adasHub,'VehicleDynamicsBus','event');
    selId=null; nav('vehicle');
  };

  window.startGuidedDemo=function(){
    ensureStyles(); demo.impact=null; loadComplexScenario();
    demo={active:true,step:0,impact:null,steps:[
      {title:'Load complex cross-domain scenario',body:'The guided demo starts from starter data and extends it with cloud bridge + predictive maintenance to show end-to-end dependency reasoning.',focus:'PowertrainCoordinator'},
      {title:'Trace DTC event path',body:'Inspect how DiagEventService leaves powertrain, arrives at TelematicsGateway, and continues through CloudDtcUpload to CloudBridge.',focus:'TelematicsGateway'},
      {title:'Review ADAS dependency chain',body:'AdasFusionHub requires both PerceptionObjectList and VehicleDynamicsBus. This demonstrates how sensor and motion data converge.',focus:'AdasFusionHub'},
      {title:'Inline details callout',body:'Use the Edit panel to inspect provided/required ports for the focused node. Tooltips stay anchored to the current canvas node while details update.',focus:'CloudBridge'},
      {title:'Modify interface and watch links update',body:'We now rename DiagEventService → DtcBurstEvent to demonstrate change propagation across ports and connectors.',focus:'PowertrainCoordinator',run:()=>renameInterfaceWithImpact('PowertrainCoordinator','DiagEventService','DtcBurstEvent')},
      {title:'Before/After impact summary',body:'The side panel now shows impacted links and components after rename, demonstrating editor power while staying fully local and private.',focus:'TelematicsGateway'}
    ]};
    showStep();
  };

  const originalRenderPanel=renderPanel;
  renderPanel=function(){ originalRenderPanel(); if(demo.active && demo.impact) renderImpactBox(); };
})();
