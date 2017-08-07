""" Platform dependend OS calls - OSX edition

FIXME Not tested, yet
"""
from AppKit import NSWorkspace, NSApplicationActivationOptions

def get_foreground_window():
	"""
	Returns the name (or pointer, or whatever is
	required as set_foreground_window argument)
	of the currently active window
	"""
	return (NSWorkspace.sharedWorkspace().frontmostApplication())

def set_foreground_window(application):
	""" Changes the currently active window """
	application.activateWithOptions_(NSApplicationActivateIgnoringOtherApps)

def find_icon_by_name(iconName):
	""" Returns the content and content type of an Icon by name or path. """
	return (None, None)

#  vim: set fenc=utf-8 ts=4 sw=4 noet :
