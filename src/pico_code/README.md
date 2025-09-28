# Daver Ambient Valve Controller

## Description
- MicroPython-based valve controller for HL2102 motorized valves.  
- Connects to Wi‑Fi, fetches device configurations and commands from a server.  
- Controls valves by opening, closing, moving to absolute percentage positions.  
- Reports valve status back to the server.

## Installation & Setup
- **Prerequisites**:
  - MicroPython-compatible microcontroller (e.g., ESP32, ESP8266).  
  - MicroPython firmware installed on the device.  
  - Network access to target Wi‑Fi and server.
- **Dependencies**:
  - Built-in MicroPython modules: `network`, `urequests`, `machine`, `time`, `uasyncio`.
- **Tools**:
  - Works with [VS Code pico-w-go extension](https://marketplace.visualstudio.com/items?itemName=paulober.pico-w-go) for file upload, REPL, and debugging
- **Configuration**:
  - Edit `main.py` and set:
    ```python
    WIFI_IP = "<static_ip>"
    WIFI_MASK = "<subnet_mask>"
    WIFI_GATEWAY = "10.10.109.1"
    WIFI_DNS = "8.8.8.8"
    SERVER_URL = "http://<server_ip>:5000"
    ```

## Usage
- **Automatic Startup**:
  - On power-up, `main.py` runs automatically.
- **Operation**:
  - The script enters a loop:
    1. Fetch commands for each valve.
    2. Execute `percent_<value>` or `maintenance`.
    3. Send status report.
    4. Wait 1 second and repeat.
- **Example status report payload**:
  ```json
  {
    "status_open_percent": 75,
    "last_command": "percent_75"
  }
  ```

## Code Structure & Explanation
- **main.py**
  - `connect_to_wifi(ssid, password, static_ip_config=None)`:  
    Configures station-mode WLAN, applies static IP, waits for connection.  
  - `fetch_all_device_configs(server_url)`:  
    GET `/get-devices-config`, returns JSON dict or `{}` on error.  
  - `fetch_device_config(server_url, device_id)`:  
    GET `/get-config/{device_id}`, returns JSON or `None` on error.  
  - `send_status_report(server_url, device_id, status_payload)`:  
    POST `/status-report/{device_id}` with JSON payload.  
  - `main()`:  
    - Connects to Wi‑Fi.  
    - Loads device configs and initializes `HL2102` instances.  
    - Enters infinite loop to process commands and report status.
- **/helpers/timefunctions.py**
  ```python
  def timed_function(func):
      # Decorator: prints function execution time in ms.
  ```
  - `sleep_precise(duration_ms: float)`:  
    Splits into ms and µs, uses `time.sleep_ms` and `time.sleep_us`.
- **/helpers/classes/DaverAmbientHL2102.py**
  ```python
  class HL2102(TwoWayMotorisedValve):
      go_to_percent(target_percent)
      maintenance(wait_after_close=5, wait_after_open=10)
      print_all_timings()
  ```
  - Extends valve with HL2102-specific timings and error compensation.  
  - Two-step movement: full open, then close to target.  
  - Maintenance cycle closes and restores valve.
- **/helpers/classes/TwoWayMotorisedValve.py**
  ```python
  class TwoWayMotorisedValve:
      def __init__(open_relay_pin, close_relay_pin)
      def _run(direction, duration_ms)
  ```
  - Manages relay GPIOs via `machine.Pin`.  
  - `_run`: activate relay (LOW) for duration then deactivate (HIGH).

## Configuration & Environment
- **In `main.py`**:
  - `WIFI_IP`, `WIFI_MASK`, `WIFI_GATEWAY`, `WIFI_DNS` for network setup.  
  - `SERVER_URL` for API endpoints.
- **Hardware**:
  - Specify relay GPIO pins in server configuration per device.

## License & Credits:
- **License**: MIT License.  
- **Author**: Cernea Mihnea-Ioan


