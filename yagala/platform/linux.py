###
# Platform dependend OS calls - OSX edition
###

import subprocess
import logging
LOGGER=logging.getLogger(__name__)

# Check if xdotool is available
xdotool=None
p = subprocess.run(['which', 'xdotool'], stdout=subprocess.PIPE)
xdotool = p.stdout.rstrip()
if p.returncode != 0 or p.stdout.rstrip() == '':
    LOGGER.warn('"xdotool" is not available. Change the active window might not work. To resolve this please install "xdotool"')
    xdotool = None

###
# Returns the name (or pointer, or whatever is
# required as set_foreground_window argument)
# of the currently active window
###
def get_foreground_window():
    if not xdotool:
        return None
    cmd = ['xdotool', 'getwindowfocus', 'getwindowname']
    p = subprocess.run(cmd, stdout=subprocess.PIPE)
    return p.stdout.rstrip()

###
# Changes the currently active window
###
def set_foreground_window(name):
    if not xdotool:
        return None
    cmd = ['xdotool', 'search', '--name', name, 'windowactivate']
    subprocess.run(cmd)
