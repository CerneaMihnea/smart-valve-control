// ===================================
// 🛠️ MAINTENANCE
// ===================================
window.onload = () => {
        fetchDevices(() => {
            const deviceSelect = document.getElementById("deviceSelect");
            if (deviceSelect.value) {
            loadMaintenance(deviceSelect.value);
            }

            deviceSelect.onchange = () => {
            loadMaintenance(deviceSelect.value);
            };
        });
        };


window.onload = () => {
  fetchDevices(() => {
    const deviceSelect = document.getElementById("deviceSelect");
    if (deviceSelect.value) loadMaintenance(deviceSelect.value);
    deviceSelect.onchange = () => loadMaintenance(deviceSelect.value);
  });

  document.getElementById("maintenanceForm").addEventListener("submit", saveMaintenance);
};

async function loadMaintenance(deviceId) {
  try {
    const res = await fetch(`/get-maintenance/${deviceId}`);
    const data = await res.json();
    document.getElementById("enableMaintenance").checked = data.enabled;
    document.getElementById("maintenanceTime").value = data.time;
    document.getElementById("maintenanceFrequency").value = data.frequency;
  } catch (err) {
    console.error("Eroare la preluare mentenanță:", err);
  }
}

async function saveMaintenance(event) {
  event.preventDefault();
  const deviceId = document.getElementById("deviceSelect").value;
  const enabled = document.getElementById("enableMaintenance").checked;
  const time = document.getElementById("maintenanceTime").value;
  const frequency = document.getElementById("maintenanceFrequency").value;

  try {
    const res = await fetch("/set-maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_id: deviceId, maintenance_enabled: enabled, maintenance_time: time, maintenance_frequency: frequency })
    });

    if (!res.ok) throw new Error(await res.text());
    alert("Setări salvate cu succes!");
  } catch (err) {
    console.error("Eroare la salvarea setărilor:", err);
    alert("Eroare la salvare!");
  }
}
