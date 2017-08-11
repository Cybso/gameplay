# Game✜Play Application Launcher

![Game✜Play](https://raw.githubusercontent.com/Cybso/gameplay/master/ui/img/GamePlay.svg "Game✜Play")

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

If you have [Steam](http://store.steampowered.com/) installed and the launcher
fails to detect your installed applications ensure that you have configured
the correct paths in the  'providers/steam' section of your 'gameplay.ini'.

### Emulators

The Game✜Play launcher should support all kinds of emulators that are able
to directly launch game images with a single command; I have successfully
tested this with [Dolphin](https://dolphin-emu.org/) and [ZSNES](http://www.zsnes.com/).

See '[examples/emulators.ini](examples/emulators.ini)' for some examples of how to configure them.

#### Dolphin

If you plan to run emulated GameCube or Wii images with [Dolphin](https://dolphin-emu.org/)
you should also install 'wit' from [WimmsTools](https://wit.wiimm.de/) and
ensure that it is available in the search path. This command allows
the launcher to extract the real game's title from the image file.

## Configuration

See [examples/gameplay.ini](examples/gameplay.ini) for an example configuration file.
This file is searched in the launcher's application directory
and in some system dependent locations.

Calling gameplay.py with '--list-config' will show you all
paths that are search for configuration files as well as
the current active configuation directives.

## Command line arguments

```
  usage: gameplay.py [-h] [-v] [-d] [-f] [-s] [-e {webkit,webengine}]
                     [-r DOCROOT] [--list-config] [--list-apps]
  
  optional arguments:
    -h, --help            show this help message and exit
    -v, --verbose         be verbose
    -d, --debug           be even verboser
    -f, --fullscreen      start in fullscreen mode
    -s, --stayontop       stay on top (while not running any apps)
    -e {webkit,webengine}, --engine {webkit,webengine}
                          browser engine that should be used ('webkit',
                          'webengine')
    -r DOCROOT, --docroot DOCROOT
                          Document root of UI files (default: ./ui/)
    --list-config         Show what configuration files are loaded on startup
    --list-apps           Show what apps where found by each application
                          provider
```

## License

_Game✜Play_ can be freely distributed under the terms of the
[GNU General Public License Version 3](LICENSE.txt). Some parts
of this software have different licenses, see [NOTICE.md](NOTICE.md)
for details.
