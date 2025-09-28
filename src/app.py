from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import json
import os
import threading
import time
import datetime

# Flask app setup
app = Flask(__name__, static_folder='../static')
CORS(app)

# File paths
FLOW_FILE = "json_files/flow_data.json"
GRAPH_FILE = "json_files/graph_data.json"
CONFIG_FILE = "json_files/config.json"

# Global dictionaries for commands and device configs
active_commands = {}
device_configs = {}

# ------------------- Background Maintenance Thread -------------------

def maintenance_worker():
    while True:
        now = datetime.datetime.now()
        current_time = now.strftime("%H:%M")
        today_str = str(now.date())

        for device_id, config in device_configs.items():
            if not config.get("maintenance_enabled"):
                continue

            scheduled_time = config.get("maintenance_time", "12:00")
            frequency = config.get("maintenance_frequency", "daily")
            last_run_date = config.get("last_maintenance_date")

            should_trigger = False

            if current_time == scheduled_time:
                if frequency == "daily":
                    should_trigger = last_run_date != today_str
                elif frequency == "weekly":
                    if last_run_date:
                        last_date = datetime.datetime.strptime(last_run_date, "%Y-%m-%d").date()
                        should_trigger = now.isocalendar()[1] != last_date.isocalendar()[1]
                    else:
                        should_trigger = True
                elif frequency == "monthly":
                    if last_run_date:
                        last_date = datetime.datetime.strptime(last_run_date, "%Y-%m-%d").date()
                        should_trigger = now.month != last_date.month or now.year != last_date.year
                    else:
                        should_trigger = True

            if should_trigger:
                active_commands[device_id] = "maintenance"
                config["last_maintenance_date"] = today_str

        with open(CONFIG_FILE, "w") as f:
            json.dump(device_configs, f, indent=2)

        time.sleep(60)

# ------------------- Static HTML Routes -------------------

@app.route("/")
def serve_index():
    return send_from_directory("../templates", "index.html")

@app.route("/add-device-page")
def serve_add_device_page():
    return send_from_directory("../templates", "add_device.html")

@app.route("/maintenance-page")
def serve_maintenance_page():
    return send_from_directory("../templates", "maintenance.html")

@app.route("/graph-editor")
def serve_graph_editor():
    return send_from_directory("../templates", "graph.html")

# ------------------- Graph API -------------------

@app.route('/save-graph', methods=['POST'])
def save_graph():
    graph_data = request.get_json()
    with open(GRAPH_FILE, 'w') as f:
        json.dump(graph_data, f, indent=4)
    return jsonify({"status": "ok"})

@app.route('/load-graph')
def load_graph():
    try:
        with open(GRAPH_FILE, 'r') as f:
            graph_data = json.load(f)
        return jsonify(graph_data)
    except FileNotFoundError:
        return jsonify({})

# ------------------- Flow API -------------------

@app.route('/save-flows', methods=['POST'])
def save_flow():
    new_flow = request.get_json()
    try:
        with open(FLOW_FILE, 'r') as f:
            flows = json.load(f)
            if not isinstance(flows, list):
                flows = []
    except FileNotFoundError:
        flows = []

    flows.append(new_flow)

    with open(FLOW_FILE, 'w') as f:
        json.dump(flows, f, indent=2)

    return jsonify(status='ok', total_flows=len(flows))

@app.route('/get-flows')
def get_flows():
    try:
        with open(FLOW_FILE, 'r') as f:
            flows = json.load(f)
        return jsonify(flows)
    except FileNotFoundError:
        return jsonify({})

# ------------------- Device API -------------------

@app.route("/devices")
def get_all_devices():
    return jsonify(device_configs)

@app.route("/add-device", methods=["POST"])
def add_device():
    data = request.get_json()
    device_id = data.get("device_id")

    device_configs[device_id] = {
        "zone": data.get("zone"),
        "zone_color": data.get("zone_color", "#cccccc"),
        "pin_relay_open": data.get("pin_relay_open"),
        "pin_relay_close": data.get("pin_relay_close"),
        "maintenance_enabled": data.get("maintenance_enabled", False),
        "maintenance_time": data.get("maintenance_time", "12:00"),
        "maintenance_frequency": data.get("maintenance_frequency", "daily")
    }

    with open(CONFIG_FILE, "w") as f:
        json.dump(device_configs, f, indent=2)

    return jsonify(success=True)

@app.route("/get-config/<device_id>")
def get_device_config(device_id):
    return jsonify(device_configs.get(device_id, {}))

@app.route("/get-devices-config")
def get_all_device_configs():
    return jsonify(device_configs)

# ------------------- Maintenance API -------------------

@app.route("/set-maintenance", methods=["POST"])
def set_maintenance_config():
    data = request.get_json()
    device_id = data.get("device_id")

    if device_id not in device_configs:
        return "Dispozitiv inexistent", 404

    config = device_configs[device_id]
    config["maintenance_enabled"] = data.get("maintenance_enabled", False)
    config["maintenance_time"] = data.get("maintenance_time", "12:00")
    config["maintenance_frequency"] = data.get("maintenance_frequency", "daily")

    with open(CONFIG_FILE, "w") as f:
        json.dump(device_configs, f, indent=2)

    print(f"[INFO] Maintenance config for {device_id}: {config}")
    return jsonify(success=True), 200

@app.route("/get-maintenance/<device_id>")
def get_maintenance_config(device_id):
    if device_id not in device_configs:
        return "Dispozitiv inexistent", 404

    config = device_configs[device_id]
    return jsonify({
        "enabled": config.get("maintenance_enabled", False),
        "time": config.get("maintenance_time", ""),
        "frequency": config.get("maintenance_frequency", "daily")
    })

# ------------------- Command API -------------------

@app.route("/set-command", methods=["POST"])
def set_device_command():
    data = request.get_json()
    device_id = data.get("device_id")
    command = data.get("command")

    valid_commands = {"percent_0", "percent_25", "percent_50", "percent_75", "percent_100"}

    if device_id not in device_configs:
        return "Dispozitiv invalid", 400
    if command not in valid_commands:
        return f"Comandă invalidă: {command}", 400

    active_commands[device_id] = command

    try:
        percent_value = int(command.split('_')[1])
    except (IndexError, ValueError):
        percent_value = None

    status = device_configs[device_id].get("status", {})
    status["last_command"] = command
    status["status_open_percent"] = percent_value
    device_configs[device_id]["status"] = status

    with open(CONFIG_FILE, "w") as f:
        json.dump(device_configs, f, indent=2)

    return f"Comandă '{command}' setată pentru {device_id}", 200

@app.route("/get-command/<device_id>")
def get_device_command(device_id):
    return jsonify({"command": active_commands.pop(device_id, None)})

# ------------------- Status API -------------------

@app.route("/status-report/<device_id>", methods=["POST"])
def report_device_status(device_id):
    if device_id not in device_configs:
        return "Dispozitiv invalid", 400

    device_configs[device_id]["status"] = request.get_json()

    with open(CONFIG_FILE, "w") as f:
        json.dump(device_configs, f, indent=2)

    return "Status primit", 200

@app.route("/get-status/<device_id>")
def get_device_status(device_id):
    return jsonify(device_configs.get(device_id, {}).get("status", {}))

# ------------------- Zone Info -------------------

@app.route("/zones-devices")
def get_zones_devices():
    with open(CONFIG_FILE) as f:
        config_data = json.load(f)

    zones = {}
    for device_id, device in config_data.items():
        zone = device.get("zone")
        color = device.get("zone_color", "#cccccc")
        if not zone:
            continue
        if zone not in zones:
            zones[zone] = {"color": color, "devices": []}
        zones[zone]["devices"].append(device_id)

    return jsonify(zones)

# ------------------- Main Entry -------------------

if __name__ == '__main__':
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, "r") as f:
            device_configs = json.load(f)
    else:
        device_configs = {}

    threading.Thread(target=maintenance_worker, daemon=True).start()
    app.run(host="0.0.0.0", port=5000, debug=True)
