from machine import Pin
import time_functions as tf
import time


class TwoWayMotorisedValve:
    def __init__(self, open_relay_pin_number, close_relay_pin_number):
        """
        Initialize the valve with pin numbers for open and close relays.
        By default, the valve is considered fully open (100%).
        """
        self.status_open_percent = 100

        self.relay_open = Pin(open_relay_pin_number, Pin.OUT)
        self.relay_close = Pin(close_relay_pin_number, Pin.OUT)

        # Set both relays to HIGH (inactive state)
        self.relay_open.value(1)
        self.relay_close.value(1)

    def _run(self, direction, duration_ms):
        """
        Activate the relay corresponding to the given direction ("open" or "close")
        for the specified duration in milliseconds.
        """
        if direction not in ["open", "close"]:
            raise ValueError(f"Invalid direction: {direction}. Must be 'open' or 'close'.")

        selected_relay = self.relay_open if direction == "open" else self.relay_close

        selected_relay.value(0)  # Activate relay (LOW)
        time.sleep_ms(duration_ms)
        selected_relay.value(1)  # Deactivate relay (HIGH)
