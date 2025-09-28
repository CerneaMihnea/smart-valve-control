from TwoWayMotorisedValve import TwoWayMotorisedValve
import time


class HL2102(TwoWayMotorisedValve):
    _device_counter = 0

    def __init__(self, relay_open_pin, relay_close_pin):
        super().__init__(relay_open_pin, relay_close_pin)
        self.name = "HL2102"
        HL2102._device_counter += 1

        # HL2102-specific characteristics
        self.diameter_mm = 19
        self.error_mm_close_to_open = 4
        self.error_mm_open_to_close = 1
        self.ms_per_mm = 250
        self.inertia_compensation_ms = 250

    def go_to_percent(self, target_percent):
        """
        Moves the valve to a specific absolute position (0, 25, 50, 75, 100) in two steps:
        1. Reset to fully open (100%)
        2. Close based on the difference to the desired target
        """

        # Step 1: Fully open the valve
        full_open_duration = (self.diameter_mm + self.error_mm_close_to_open) * self.ms_per_mm
        super()._run("open", duration_ms=full_open_duration)

        if target_percent == 100:
            self.status_open_percent = 100
            return

        time.sleep(2)  # Allow valve to stabilize before closing

        # Step 2: Calculate how much to close to reach the target
        percent_to_close = 100 - target_percent

        if percent_to_close == 0:
            close_duration = 0
        elif percent_to_close == 100:
            close_duration = (
                (self.diameter_mm + self.error_mm_close_to_open) * self.ms_per_mm
                + self.inertia_compensation_ms
            )
        else:
            close_duration = (
                (percent_to_close * self.diameter_mm // 100) * self.ms_per_mm
            )

        print(close_duration)
        super()._run("close", duration_ms=int(close_duration))
        self.status_open_percent = target_percent

    def maintenance(self, wait_after_close=5, wait_after_open=10):
        """
        Performs a maintenance cycle:
        - Fully closes the valve
        - Waits for a short delay
        - Returns the valve to its previous position
        """
        original_percent = getattr(self, "status_open_percent", 100)

        print("Closing valve for maintenance...")
        self.go_to_percent(0)

        print(f"Waiting {wait_after_close} seconds...")
        time.sleep(wait_after_close)

        print("Restoring valve to previous position...")
        self.go_to_percent(original_percent)

    def print_all_timings(self):
        """
        Displays the estimated time (in ms) for various valve movements.
        """

        def calculate_duration(mm):
            return mm * self.ms_per_mm + self.inertia_compensation_ms

        print("=== HL2102 Valve Movement Timings ===")
        print(f"Close to 100%: {calculate_duration(self.diameter_mm + self.error_mm_close_to_open)} ms")
        print(f"Open to 100%: {calculate_duration(self.diameter_mm)} ms")
        print(f"Close to 50%: {calculate_duration(self.diameter_mm // 2 + self.error_mm_close_to_open)} ms")
        print(f"Open to 50%: {calculate_duration(self.diameter_mm // 2)} ms")
        print(f"Close to 25%: {int(calculate_duration((self.diameter_mm // 2) / 2 + self.error_mm_close_to_open))} ms")
        print(f"Open to 25%: {int(calculate_duration((self.diameter_mm // 2) / 2))} ms")
