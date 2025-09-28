// ===================================
// 🔃 VALVE ZONE CONTROL
// ===================================
 document.addEventListener("DOMContentLoaded", () => {
      loadZones(() => {
        console.log("▶️ DOMContentLoaded, inițializez zonele");
        const zoneSelect = document.getElementById("zoneSelect");
        const selectedZone = zoneSelect.value;

        fetchDevices(() => {
          loadDevicesForZone(selectedZone);
        });

        zoneSelect.onchange = () => {
          loadDevicesForZone(selectedZone);
        };
      });
    });

    function loadDevicesForZone(zoneName) {
      const deviceSelect = document.getElementById("deviceSelect");
      const zoneDevices = window.zoneDeviceMap?.[zoneName] || [];
      console.log(deviceSelect.value);

      deviceSelect.innerHTML = "";

      zoneDevices.forEach(device => {
        const option = document.createElement("option");
        option.value = device;
        option.text = device;
        deviceSelect.appendChild(option);
      });

      if (deviceSelect.value) {
        loadStatus(deviceSelect.value);
      }

      deviceSelect.onchange = () => {
        loadStatus(deviceSelect.value);
      };

      clearInterval(window.statusInterval);
      window.statusInterval = setInterval(() => {
        if (deviceSelect.value) {
          loadStatus(deviceSelect.value);
        }
      }, 2000);
    }




document.addEventListener("DOMContentLoaded", () => {
  loadZones(() => {
    const zoneSelect = document.getElementById("zoneSelect");
    loadDevicesForZone(zoneSelect.value);

    zoneSelect.onchange = () => {
      loadDevicesForZone(zoneSelect.value);
    };
  });
});

let zones = {};

async function loadZones(callback) {
  try {
    const res = await fetch('/zones-devices');
    zones = await res.json();
    const zoneSelect = document.getElementById('zoneSelect');
    zoneSelect.innerHTML = '';
    Object.keys(zones).forEach(z => zoneSelect.add(new Option(z, z)));
    if (callback) callback();
  } catch (err) {
    console.error('Eroare la încărcare zone:', err);
  }
}

function loadDevicesForZone(zoneName) {
  const deviceSelect = document.getElementById("deviceSelect");
  const zoneDevices = zones[zoneName]?.devices || [];

  deviceSelect.innerHTML = "";
  zoneDevices.forEach(device => {
    const option = document.createElement("option");
    option.value = device;
    option.text = device;
    deviceSelect.appendChild(option);
  });

  if (deviceSelect.value) loadStatus(deviceSelect.value);

  deviceSelect.onchange = () => loadStatus(deviceSelect.value);

  clearInterval(window.statusInterval);
  window.statusInterval = setInterval(() => {
    if (deviceSelect.value) loadStatus(deviceSelect.value);
  }, 2000);
}

async function sendZone(cmd) {
  const zone = document.getElementById('zoneSelect').value;
  const all = document.getElementById('applyAll').checked;
  const target = all ? (zones[zone]?.devices || []) : [document.getElementById('deviceSelect').value];

  for (const id of target) {
    try {
      const res = await fetch('/set-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: id, command: cmd })
      });
      if (!res.ok) throw new Error(await res.text());
    } catch (err) {
      console.error(`Eroare (${id}):`, err);
    }
  }
}