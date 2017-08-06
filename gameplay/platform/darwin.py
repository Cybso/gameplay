###
# Platform dependend OS calls - OSX edition
# FIXME Not tested, yet
###
from AppKit import NSWorkspace, NSApplicationActivationOptions

###
# Returns the name (or pointer, or whatever is
# required as set_foreground_window argument)
# of the currently active window
###
def get_foreground_window():
    return (NSWorkspace.sharedWorkspace().frontmostApplication())

###
# Changes the currently active window
###
def set_foreground_window(application):
    application.activateWithOptions_(NSApplicationActivateIgnoringOtherApps)

###
# Returns the content and content type of
# an Icon by name or path.
###
def find_icon_by_name(iconName):
	return (None, None)
