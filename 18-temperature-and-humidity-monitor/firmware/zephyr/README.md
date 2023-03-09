This is a Zephyr-based implementation of the temperature and humidity monitor project's firmware.

# Hardware Setup

Follow the [hardware setup section of the Arduino README.md](../arduino/README.md#hardware-setup).

# Firmware Setup

1. After cloning this repository, run this command: `git submodule update --init 18-temperature-and-humidity-monitor/firmware/zephyr/src/note-c`. This will pull in the [note-c](https://github.com/blues/note-c) submodule that this project depends on.
1. Follow [Zephyr's Getting Started Guide](https://docs.zephyrproject.org/latest/develop/getting_started/index.html).
1. `cd ~/zephyrproject`, assuming this is where you created the west workspace from step 1.
1. Create a new directory to hold the temperature and humidity monitor code: `mkdir temp_and_humid_monitor`.
1. Copy the contents of `~/app-accelerators/18-temperature-and-humidity-monitor/firmware/zephyr` into this new directory: `cp -R ~/app-accelerators/18-temperature-and-humidity-monitor/firmware/zephyr/* ./temp_and_humid_monitor`. Note that this assumes you've cloned the `app-accelerators` repo into your home directory.
1. `cd temp_and_humid_monitor`.
1. Modify `src/main.c` so that the `PRODUCT_UID` macro is a valid product UID corresponding to a project on [Notehub](https://notehub.io).
1. Build the code with `west build -b swan_r5`.
1. With the [STLINK-V3MINI](https://shop.blues.io/products/stlink-v3mini) connected to the Swan, flash the firmware onto the Swan with `west flash`.

If you want to debug the code running on the Swan, you can do so with gdb with `west debug`.

# Testing

Refer to the [testing section the Arduino Arduino README.md](../arduino/README.md#testing).

# Developer Notes

The Notecard hooks in `src/note_c_hooks.c` come from [note-zephyr](https://github.com/blues/note-zephyr).
