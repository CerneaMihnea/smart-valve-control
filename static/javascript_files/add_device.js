// ===================================
// ➕ ADAUGĂ DISPOZITIV
// ===================================
document.getElementById("addDeviceForm").addEventListener("submit", addDevice);

async function addDevice(event) {
  event.preventDefault();

  const device_id = document.getElementById("newDeviceId").value.trim();
  const zone = document.getElementById("newZone").value.trim();
  const pin_open = parseInt(document.getElementById("newPinOpen").value);
  const pin_close = parseInt(document.getElementById("newPinClose").value);
  const color = document.getElementById("newColor").value;

  try {
    const res = await fetch("/add-device", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_id, zone, pin_relay_open: pin_open, pin_relay_close: pin_close, zone_color: color })
    });

    if (!res.ok) throw new Error(await res.text());

    alert("Dispozitiv adăugat cu succes!");
    document.getElementById("addDeviceForm").reset();
  } catch (err) {
    console.error("Eroare la adăugare dispozitiv:", err);
    alert("Eroare la adăugare dispozitiv!");
  }
}


let zoneData = {};

fetch(window.location.origin + "/zones-devices")
.then(res => res.json())
.then(data => {
    zoneData = data;
    const zoneList = document.getElementById("zoneList");
    Object.keys(zoneData).forEach(zone => {
        const option = document.createElement("option");
        option.value = zone;
        zoneList.appendChild(option);
    });
})
.catch(err => {
    console.error("Eroare la încărcarea zonelor:", err);
});

document.getElementById("newZone").addEventListener("input", function() {
    const selectedZone = this.value;
    if (zoneData[selectedZone] && zoneData[selectedZone].color) {
        document.getElementById("newColor").value = zoneData[selectedZone].color;
    }
});