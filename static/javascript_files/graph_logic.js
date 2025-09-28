// /static/graph_logic.js

let devicesData = {};
let zoneGroups = {};
let deviceNodeMap = {};
let needsZoneUpdate = false;
let zonesVisible = true;

const editor = new Drawflow(document.getElementById("drawflow"));
editor.start();

// Toggle visibility of zone boxes
const toggleBtn = document.getElementById('toggleZonesBtn');
if (toggleBtn) {
  toggleBtn.textContent = '👁️ Ascunde zone';
  toggleBtn.addEventListener('click', () => {
    zonesVisible = !zonesVisible;
    document.querySelectorAll('.zone-box').forEach(b => b.style.display = zonesVisible ? 'block' : 'none');
    toggleBtn.textContent = zonesVisible ? '👁️ Ascunde zone' : '👁️ Arata zone';
  });
}

document
.getElementById('toggleDevicesBtn')
.addEventListener('click', () => {
  document
    .getElementById('devices-container')
    .classList.toggle('collapsed');
});

// Mark zones dirty when node moves
editor.on('nodeMoved', id => needsZoneUpdate = true);

// Load devices config and setup add buttons
fetch('/get-devices-config')
.then(res => res.json())
.then(data => {
  devicesData = data;
  const list = document.getElementById('device-list');
  Object.keys(data).forEach(dev => {
    const btn = document.createElement('button');
    btn.textContent = `+ ${dev}`;
    btn.onclick = () => addNode(dev);
    list.appendChild(btn);
  });
});

// Save graph, zones & viewport
document.getElementById('saveGraphBtn').addEventListener('click', () => {
  if (needsZoneUpdate) {
    recalculeazaPozitiiNoduri();
    needsZoneUpdate = false;
  }
  const graphData = editor.export();
  graphData.zones = zoneGroups;
  // capture current transform
  const canvas = document.querySelector('#drawflow .drawflow');
  graphData.viewport = { transform: getComputedStyle(canvas).transform };
  fetch('/save-graph', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(graphData)
  })
  .then(r => r.json())
  .then(()=> alert('Grafic și zone salvate!'))
  .catch(e=> alert('Eroare la salvare: '+e));
});

// Reset zones manually
document.getElementById('resetZonesBtn').addEventListener('click', () => {
  recalculeazaPozitiiNoduri();
});

// Load graph + zones + viewport
fetch('/load-graph')
.then(res => res.json())
.then(data => {
  if (!data || !data.drawflow) return;
  editor.import(data);
  // rebuild deviceNodeMap
  Object.entries(data.drawflow.Home.data).forEach(([nid, node]) => {
    deviceNodeMap[node.name] = nid;

    const dev = node.name;
    const v = devicesData[dev] || {};
    const op = v.status?.status_open_percent ?? 0;
    const nm = calculateNextMaintenanceDate(
      v.last_maintenance,
      v.maintenance_frequency,
      v.maintenance_time,
      v.maintenance_enabled
    );

    const html = `<div style="text-align:center;cursor:pointer;" title="Deschidere: ${op}% | Următoarea mentenanță: ${nm}">
                    <img src="/static/icons/icon-512.png" width="32" height="32"/>
                    <div style="font-size:12px;margin-top:4px;">${dev}</div>
                  </div>`;

    // Actualizează DOM-ul nodului
    const nodeElement = document.querySelector(`#node-${nid} .drawflow_content_node`);
    if (nodeElement) nodeElement.innerHTML = html;

    // Actualizează și html-ul intern din structura drawflow, pentru salvare corectă
    node.html = html;
  });
  // restore zones
  zoneGroups = data.zones || {};
  // restore viewport
  if (data.viewport && data.viewport.transform) {
    document.querySelector('#drawflow .drawflow').style.transform = data.viewport.transform;
  }
  drawZoneBoxes();
});

function recalculeazaPozitiiNoduri() {
  zoneGroups = {};
  Object.entries(devicesData).forEach(([dev,val]) => {
    const nid = deviceNodeMap[dev];
    const el = document.querySelector(`#drawflow #node-${nid}`);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cRect = document.getElementById('drawflow').getBoundingClientRect();
    const x = rect.left - cRect.left;
    const y = rect.top - cRect.top;
    const zName = val.zone || 'Fără zonă';
    if (!zoneGroups[zName]) zoneGroups[zName] = { color: val.zone_color||'#cccccc', nodes: [] };
    zoneGroups[zName].nodes.push({ id: nid, x, y, width: rect.width, height: rect.height });
  });
  drawZoneBoxes();
}

function drawZoneBoxes() {
  const container = document.getElementById('drawflow');
  document.querySelectorAll('.zone-box').forEach(b => b.remove());
  Object.entries(zoneGroups).forEach(([zName, grp]) => {
    if (!grp.nodes || !grp.nodes.length) return;
    let minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity;
    grp.nodes.forEach(n => {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width);
      maxY = Math.max(maxY, n.y + n.height);
    });
    const p = 20;
    const box = document.createElement('div');
    box.className = 'zone-box';
    Object.assign(box.style, {
      position: 'absolute', left: `${minX-p}px`, top: `${minY-p}px`,
      width: `${(maxX-minX)+2*p}px`, height: `${(maxY-minY)+2*p}px`,
      border: `2px solid ${grp.color}`, background: hexToRgba(grp.color,0.2),
      borderRadius: '10px', pointerEvents: 'none', zIndex: '0',
      display: zonesVisible ? 'block' : 'none'
    });
    // add label
    const lbl = document.createElement('div');
    lbl.textContent = zName;
    Object.assign(lbl.style, {
      position:'absolute', top:'-1.2em', left:'0.5em',
      fontSize:'0.8em', fontWeight:'bold', color: grp.color,
      background:'rgba(255,255,255,0.8)', padding:'2px 4px', borderRadius:'4px', pointerEvents:'none'
    });
    box.appendChild(lbl);
    container.appendChild(box);
  });
}

function hexToRgba(hex, alpha) {
  hex = hex.replace('#',''); if (hex.length===3) hex = hex.split('').map(c=>c+c).join('');
  const r=parseInt(hex.slice(0,2),16), g=parseInt(hex.slice(2,4),16), b=parseInt(hex.slice(4,6),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function calculateNextMaintenanceDate(ld,f,t,ie) {
  if(!f||!t) return 'N/A'; if(ie===false) return 'Inactiv';
  const d = ld? new Date(ld): new Date(); if(isNaN(d)) return 'N/A';
  switch(f.toLowerCase()) { case 'daily': d.setDate(d.getDate()+1); break;
    case 'weekly': d.setDate(d.getDate()+7); break;
    case 'monthly': d.setMonth(d.getMonth()+1); break;
    default: return 'N/A'; }
  const [H,M] = t.split(':').map(Number); d.setHours(H,M,0,0);
  return d.toLocaleString(undefined,{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
}

function addNode(dev) {
  const v = devicesData[dev]||{};
  const op = v.status?.status_open_percent||0;
  const nm = calculateNextMaintenanceDate(v.last_maintenance,v.maintenance_frequency,v.maintenance_time,v.maintenance_enabled);
  const x=100+Math.random()*300, y=100+Math.random()*300;
  const html = `<div style="text-align:center;cursor:pointer;" title="Deschidere: ${op}% | Următoarea mentenanță: ${nm}">`+
               `<img src="/static/icons/icon-512.png" width="32" height="32"/>`+
               `<div style="font-size:12px;margin-top:4px;">${dev}</div></div>`;
  const nid = editor.addNode(dev,1,1,x,y,dev,{},html);
  deviceNodeMap[dev] = nid;
  setTimeout(recalculeazaPozitiiNoduri, 100);
}


document.addEventListener("DOMContentLoaded", () => {
  const addFlowBtn       = document.getElementById("addFlowBtn");
  const flowPanel        = document.getElementById("flowConfigPanel");
  const selectedValveInput = document.getElementById("selectedValveName");
  const saveFlowBtn      = document.getElementById("saveFlowConfigBtn");

  let flowMode = false;
  let selectedValves = [];

  addFlowBtn.addEventListener("click", () => {
    flowMode = !flowMode;
    selectedValves = [];
    selectedValveInput.value = "";
    flowPanel.style.display = flowMode ? "block" : "none";
    addFlowBtn.innerHTML = flowMode
      ? '❌ <span class="label">Ieși din Mod Flux</span>'
      : '➕ <span class="label">Adaugă Flux</span>';

    if (flowMode) enableValveSelection();
    else          disableValveSelection();
  });

  function enableValveSelection() {
    document.querySelectorAll(".drawflow-node").forEach(node => {
      node.classList.add("selectable");
      node.addEventListener("click", onValveClick);
    });
  }
  function disableValveSelection() {
    document.querySelectorAll(".drawflow-node").forEach(node => {
      node.classList.remove("selectable");
      node.removeEventListener("click", onValveClick);
      node.classList.remove("selected-valve");
    });
  }

  function onValveClick(e) {
    e.stopPropagation();
    const node = e.currentTarget;
    const id = node.getAttribute("id").split("-")[1];
    const idx = selectedValves.indexOf(id);

    if (idx === -1) {
      selectedValves.push(id);
      node.classList.add("selected-valve");
    } else {
      selectedValves.splice(idx, 1);
      node.classList.remove("selected-valve");
    }

    selectedValveInput.value = selectedValves.join(", ");
  }


  saveFlowBtn.addEventListener("click", async () => {
    if (!selectedValves.length) {
      alert("Selectează cel puțin o electrovana!");
      return;
    }

    const data = editor.export().drawflow.Home.data;
    const edges = [];

    
    if (selectedValves.length === 1) {
      const nid = selectedValves[0];
      const outputs = data[nid].outputs || {};
      Object.values(outputs).forEach(out => {
        out.connections.forEach(conn => {
          edges.push({ from: nid, to: conn.node });
        });
      });
    } else {
      const set = new Set(selectedValves);
      Object.values(data).forEach(node => {
        Object.values(node.outputs || {}).forEach(out => {
          out.connections.forEach(conn => {
            if (set.has(node.id.toString()) || (set.has(node.id.toString()) && set.has(conn.node.toString()))) {
              edges.push({ from: node.id, to: conn.node});
            }
          });
        });
      });
    }

    if (!edges.length) {
      alert("Nu există conexiuni valide pentru selecția ta.");
      return;
    }

    const payload = {
      name: document.getElementById("flowName").value.trim() || "Flux fără nume",
      color: document.getElementById("flowColor").value,
      valves: selectedValves,
      edges
    };

    try {
      const resp = await fetch("/save-flows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) throw new Error("Eroare server");
      alert("Flux salvat cu succes!");
      location.reload();
    } catch (err) {
      console.error(err);
      alert("Eroare la salvarea fluxului.");
    }

    flowMode = false;
    disableValveSelection();
    flowPanel.style.display = "none";
    addFlowBtn.innerHTML = '➕ <span class="label">Adaugă Flux</span>';
    document.getElementById("flowName").value = "";
    selectedValves = [];
    selectedValveInput.value = "";
  });
});



document.addEventListener("DOMContentLoaded", () => {
  const seeFlowBtn    = document.getElementById("seeFlowBtn");
  const flowContainer = document.getElementById("flowSelectorContainer");
  const flowSelect    = document.getElementById("flowSelect");

  let flows = [];

  // Marchează conexiunile cu data-from și data-to când se creează
  editor.on("connectionCreated", connection => {
    if (connection.html) {
      connection.html.setAttribute("data-from", connection.source_id);
      connection.html.setAttribute("data-to",   connection.target_id);
      connection.html.classList.add("connection");
    } else {
      console.warn("connection.html e undefined pentru conexiunea:", connection);
    }
  });

  // Obține toate fluxurile
  fetch("/get-flows")
    .then(r => r.json())
    .then(data => {
      const arr = Array.isArray(data)
        ? data
        : Array.isArray(data.flows)
          ? data.flows
          : [];
      flows = arr;
      flows.forEach((f, idx) => {
        const opt = document.createElement("option");
        opt.value = idx;
        opt.textContent = f.name;
        flowSelect.appendChild(opt);
      });
    })
    .catch(console.error);

  // Butonul de afișare/ascundere selector
  seeFlowBtn.addEventListener("click", () => {
    flowContainer.style.display =
      flowContainer.style.display === "none" ? "block" : "none";
  });

  // Selectarea unui flux
  flowSelect.addEventListener("change", () => {
    // Resetare noduri
    document.querySelectorAll(".drawflow-node").forEach(n => {
      n.style.backgroundColor = "";
      n.style.borderColor     = "";
    });

    // Resetare muchii
    document.querySelectorAll("svg.connection").forEach(svg => {
      const path = svg.querySelector("path");
      if (path) {
        path.style.stroke = "";
        path.style.strokeWidth = "";
      }
    });

    const idx = flowSelect.value;
    if (idx === "") return;

    const flow  = flows[idx];
    const color = flow.color;

    // Colorează nodurile selectate
    flow.valves.forEach(valveId => {
      const node = document.querySelector(`#drawflow .drawflow-node[id="node-${valveId}"]`);
      if (node) {
        node.style.backgroundColor = color;
        node.style.borderColor     = color;
      }
    });

    // Colorează conexiunile care apar în edges
    flow.edges.forEach(edge => {
      const from = edge.from;
      const to   = edge.to;

      document.querySelectorAll("svg.connection").forEach(svg => {
        const hasFrom = svg.classList.contains(`node_out_node-${from}`);
        const hasTo   = svg.classList.contains(`node_in_node-${to}`);

        if (hasFrom && hasTo) {
          const path = svg.querySelector("path");
          if (path) {
            path.style.stroke = color;
            path.style.strokeWidth = "3px";
          }
        }
      });
    });
  });
});


  let idToInfo = {};
  let flows = [];

  async function getNamedEdges() {
    const res = await fetch('/load-graph');
    const graph = await res.json();
    const nodesData = graph.drawflow.Home.data;

    idToInfo = {};
    Object.values(nodesData).forEach(node => {
      idToInfo[node.id] = { name: node.name, id: node.id };
    });

    const edgesMap = new Map();
    Object.values(nodesData).forEach(node => {
      const from = idToInfo[node.id];
      Object.values(node.outputs).forEach(port => {
        (port.connections || []).forEach(conn => {
          const to = idToInfo[conn.node];
          if (!to) return;
          const key = `${from.id}-${to.id}`;
          if (!edgesMap.has(key)) {
            edgesMap.set(key, {
              fromId: from.id,
              fromName: from.name,
              toId: to.id,
              toName: to.name
            });
          }
        });
      });
    });

    return Array.from(edgesMap.values()).sort((a, b) => {
      // optional sort după nume
      return a.fromName.localeCompare(b.fromName) || a.toName.localeCompare(b.toName);
    });
  }

  function gasesteFlux(optionValue) {
    const { fromId, toId } = JSON.parse(optionValue);

    const flux = flows.find(f =>
      f.edges.some(e =>
        e.from.toString() == fromId && e.to.toString() == toId
      )
    );
    if (!flux) return null;

    const decorated = {
      name: flux.name,
      color: flux.color,
      valves: flux.valves.map(id => idToInfo[id]?.name || id),
      edges: flux.edges.map(e => ({
        fromId:   e.from,
        fromName: idToInfo[e.from]?.name || e.from,
        toId:     e.to,
        toName:   idToInfo[e.to]?.name   || e.to
      }))
    };
    return decorated;
  }

  async function sendCommandToValve(deviceId, command) {
  try {
    const res = await fetch("/set-command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command, device_id: deviceId })
    });

    if (!res.ok) throw new Error(await res.text());
  } catch (err) {
    console.error("Eroare la trimitere comandă:", err);
  }
}

  document.addEventListener("DOMContentLoaded", () => {
    const edgeSelect = document.getElementById("edgeSelect");
    const simulateBtn = document.getElementById("simulateBtn");
    const startSimBtn = document.getElementById("startSimBtn");
    const stopSimBtn = document.getElementById("stopSimBtn");
    const edgeSelectorContainer = document.getElementById("edgeSelectorContainer");

    simulateBtn.addEventListener("click", () => {
      edgeSelectorContainer.style.display =
        edgeSelectorContainer.style.display === "block" ? "none" : "block";
    });

    fetch("/get-flows")
      .then(r => r.json())
      .then(data => {
        flows = Array.isArray(data) ? data : (data.flows || []);

        getNamedEdges().then(edges => {
          edgeSelect.innerHTML = "";
          edges.forEach(edge => {
            const opt = document.createElement("option");
            opt.value = JSON.stringify(edge);
            opt.textContent = `${edge.fromName} (${edge.fromId}) → ${edge.toName} (${edge.toId})`;
            edgeSelect.appendChild(opt);
          });
        });
      })
      .catch(console.error);

      async function fetchOpenPercent(deviceId) {
        try {
          const res = await fetch(`/get-status/${deviceId}`);
          if (!res.ok) throw new Error("Eroare status");

          const json = await res.json();
          return json?.status_open_percent ?? null;
        } catch (err) {
          console.error(`Eroare la citire open_percent pentru ${deviceId}:`, err);
          return null;
        }
      }



      let simulatedValves = [];
      let previousValveStates = {};

      startSimBtn.addEventListener("click", async () => {
        startSimBtn.style.display = "none";
        stopSimBtn.style.display = "block";

        const decoratedFlux = gasesteFlux(edgeSelect.value);
        if (decoratedFlux) {
          console.log(`Flux găsit: ${decoratedFlux.name}`);
          console.log("Valve din flux:", decoratedFlux.valves);
          console.log("Muchii decorate:", decoratedFlux.edges);

          simulatedValves = decoratedFlux.valves;
          previousValveStates = {};

          for (const valve of decoratedFlux.valves) {
            const percent = await fetchOpenPercent(valve);
            if (percent !== null) {
              previousValveStates[valve] = `percent_${percent}`;
            }
          }

          for (const valve of decoratedFlux.valves) {
            await sendCommandToValve(valve, "percent_0");
          }
        } else {
          console.log("Nu s-a găsit niciun flux pentru muchia selectată.");
        }
      });

      stopSimBtn.addEventListener("click", async () => {
        startSimBtn.style.display = "block";
        stopSimBtn.style.display = "none";

        // Revenim la starea anterioară
        for (const valve of simulatedValves) {
          const previous = previousValveStates[valve] || "percent_100";
          await sendCommandToValve(valve, previous);
        }

        simulatedValves = [];
        previousValveStates = {};
        location.reload()
      });
  });
