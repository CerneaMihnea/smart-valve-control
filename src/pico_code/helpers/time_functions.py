import time 
import uasyncio as asyncio

def timed_function(func):
    async def wrapper(*args, **kwargs):
        t_start = time.ticks_us()
        await func(*args, **kwargs)
        t_end = time.ticks_us()
        delta = time.ticks_diff(t_end, t_start)
        print(delta / 1000)
    return wrapper


def sleep_precise(duration_ms: float):
    ms_int = int(duration_ms)
    us_int = int((duration_ms - ms_int) * 1000)
    if ms_int > 0:
        time.sleep_ms(ms_int)
    if us_int > 0:
        time.sleep_us(us_int)  