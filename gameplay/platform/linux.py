"""
Platform dependend OS calls - linux edition
"""

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

def get_foreground_window():
	""" Returns the name (or pointer, or whatever is
	required as set_foreground_window argument)
	of the currently active window
	"""
	if not xdotool:
		return None
	cmd = ['xdotool', 'getwindowfocus', 'getwindowname']
	p = subprocess.run(cmd, stdout=subprocess.PIPE)
	return p.stdout.rstrip()

def set_foreground_window(name):
	""" Changes the currently active window """
	if not xdotool:
		return None
	cmd = ['xdotool', 'search', '--name', name, 'windowactivate']
	subprocess.run(cmd)

def find_icon_by_name(iconName):
	""" Returns the content and content type of an Icon by name or path. """
	return (None, None)

#  vim: set fenc=utf-8 ts=4 sw=4 noet :
