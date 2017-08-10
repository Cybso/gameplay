# Game✜Play Application Launcher

_Game✜Play_ is a platform independent application launcher.
Unlike others it can completely be controlled with a gamepad
and provides an _emergency exit_ if the user started an
application that cannot be controlled or terminated with a
gamepad.

## Development status

The status of the application is "works for me". I'm using this launcher
with Linux, also I've tested the basic features under windows, too.

Theoretically this launcher should also support OSX, but this has
never been tested and might require some fixes - I am happy about feedback.

## Installation and Configuration

1. Ensure that you have Python 3.4 or higher installed.

2. Clone this repository or download and unpack the ZIP files.

3. Run 'dependencies.py' to get a list of all unfulfilled dependencies.
  Make sure that all required dependencies are available.

4. Copy the configuration files from 'examples/' and adjust them to
  your system and needs.

5. Run 'gameplay.py' to start the launcher.

Currently there a no precompiled release packages available.

### Linux

Linux users will have to install 'python3' (should already be installed
on modern desktop distributions), 'python3-pyqt5', 'python3-pyqt5.qtwebengine'
'python3-pyqt5.qtwebengine', 'python3-psutil', 'xdotools', and 'wit' if you
plan to emulate GameCube/Wii images.

### Windows

Windows users should install the latest Python packages from
https://www.python.org/downloads/windows/. Ensure that the Python binaries
are added to the PATH environment variable durung installation.

Start 'dependencies.py' to see what additional requirements needs to
be fulfilled.

### OSX

_Can somebody complete this section for me?_

## Optional dependencies

### Steam

If you have [http://store.steampowered.com/](Steam) installed and the launcher
fails to detect your installed applications ensure that you have configured
the correct paths in the  'providers/steam' section of your 'gameplay.ini'.

### Emulators

The Game✜Play launcher should support all kinds of emulators that are able
to directly launch game images with a single command; I have successfully
tested this with [https://dolphin-emu.org/](Dolphin) and [http://www.zsnes.com/](ZSNES).

See 'examples/emulators.ini' for some examples of how to configure them.

#### Dolphin

If you plan to run emulated GameCube or Wii images with [https://dolphin-emu.org/](Dolphin)
you should also install 'wit' from [https://wit.wiimm.de/](WimmsTools) and
ensure that it is available in the search path. This command allows
the launcher to extract the real game's title from the image file.
