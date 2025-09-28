async function sendCommand(cmd) {
    const res = await fetch("/" + cmd, { method: "POST" });
    const text = await res.text();
    alert(text);
}

