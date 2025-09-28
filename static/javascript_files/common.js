// ===================================
// 🔁 FUNCȚII COMUNE
// ===================================

async function fetchDevices(callback) {
  try {
    const res = await fetch("/devices");
    const devicesObj = await res.json();
    const deviceSelect = document.getElementById("deviceSelect");
    deviceSelect.innerHTML = "";

    Object.keys(devicesObj).forEach(id => {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = id;
      deviceSelect.appendChild(option);
    });

    if (callback) callback();
  } catch (err) {
    console.error("Eroare la încărcare dispozitive:", err);
  }
}

async function sendCommand(command) {
  const deviceId = document.getElementById("deviceSelect").value;
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

async function loadStatus(deviceId) {
  try {
    const res = await fetch(`/get-status/${deviceId}`);
    const data = await res.json();
    document.getElementById("statusText").innerText = data.status_open_percent ?? "Necunoscut";
    document.getElementById("lastCommand").innerText = data.last_command ?? "-";
  } catch (err) {
    console.error("Eroare la status:", err);
  }
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/static/javascript_files/service-worker.js')
    .then(reg => {
      console.log('SW registered:', reg);

      // detectează când controlerul se schimbă și face refresh
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    })
    .catch(err => console.error('SW reg failed:', err));
}

