###
# Platform dependend OS calls - Windows edition
# FIXME Not tested, yet
###
from win32gui import GetForegroundWindow, SetForegroundWindow

###
# Returns the name (or pointer, or whatever is
# required as set_foreground_window argument)
# of the currently active window
###
def get_foreground_window():
    return GetForegroundWindow()

###
# Changes the currently active window
###
def set_foreground_window(handle):
    SetForegroundWindow(handle)

