import network
import urequests
import time
from  src.pico_code.helpers.classes.DaverAmbientHL2102  import HL2102

# Replace with your own ip
WIFI_IP = ""
# 
WIFI_MASK = ""
WIFI_GATEWAY = "10.10.109.1"
WIFI_DNS = "8.8.8.8"

SERVER_URL = "http://10.10.103.181:5000"

def connect_to_wifi(ssid, password, static_ip_config=None):
    """Connects to Wi-Fi using optional static IP configuration."""
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)

    if static_ip_config:
        wlan.ifconfig(static_ip_config)

    wlan.connect(ssid, password)
    while not wlan.isconnected():
        time.sleep(0.5)

def fetch_all_device_configs(server_url):
    """Retrieves all device configurations from the server."""
    try:
        response = urequests.get(f"{server_url}/get-devices-config")
        configs = response.json()
        response.close()
        return configs
    except Exception as error:
        print("Error fetching all device configs:", error)
        return {}

def fetch_device_config(server_url, device_id):
    """Fetches the configuration for a single device."""
    try:
        response = urequests.get(f"{server_url}/get-config/{device_id}")
        config = response.json()
        response.close()
        return config
    except Exception as error:
        print("Error fetching device config:", error)
        return None

def send_status_report(server_url, device_id, status_payload):
    """Sends the current status of a device to the server."""
    try:
        urequests.post(f"{server_url}/status-report/{device_id}", json=status_payload).close()
    except Exception as error:
        print("Error sending status report:", error)

def main():
    # Connect to Wi-Fi
    connect_to_wifi(
        ssid="WiFi",
        password="12345678",
        static_ip_config=(WIFI_IP, WIFI_MASK, WIFI_GATEWAY, WIFI_DNS)
    )

    server_url = SERVER_URL

    # Load all device configurations
    device_configs = fetch_all_device_configs(server_url)
    if not device_configs:
        print("Could not load device configurations.")
        return

    # Initialize valve controllers
    valve_controllers = {}

    for device_id, config in device_configs.items():
        try:
            valve = HL2102(config["pin_relay_open"], config["pin_relay_close"])
            valve_controllers[device_id] = {
                "valve": valve,
                "last_command": "-"
            }
        except Exception as error:
            print(f"Error initializing valve {device_id}:", error)

    print(valve_controllers)

    # Main loop: fetch commands and act
    while True:
        for device_id, context in valve_controllers.items():
            try:
                # Fetch command from server
                response = urequests.get(f"{server_url}/get-command/{device_id}")
                command = response.json().get("command")
                response.close()

                # Execute command if available
                if command:
                    if command.startswith("percent_"):
                        percent_value = int(command.split("_")[1])
                        context["valve"].go_to_percent(percent_value)
                        context["last_command"] = command

                    elif command == "maintenance":
                        context["valve"].maintenance()
                        context["last_command"] = command

                # Prepare and send status update
                current_status = {
                    "status_open_percent": context["valve"].status_open_percent,
                    "last_command": context["last_command"]
                }

                send_status_report(server_url, device_id, current_status)

            except Exception as error:
                print(f"Loop error for {device_id}:", error)

        time.sleep(1)

main()
