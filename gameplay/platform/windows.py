"""
Platform dependend OS calls - Windows edition
FIXME Not tested, yet
"""

import logging
import win32gui
import ctypes

from PyQt5.QtCore import QDir, QStandardPaths, QByteArray, QBuffer, QIODevice
from extract_icon import ExtractIcon

LOGGER = logging.getLogger(__name__)

# Change windows 7 group ID
myappid = 'net.bitarbeiter.gameplay' # arbitrary string
ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID(myappid)

def get_foreground_window():
	""" Returns the name (or pointer, or whatever is
	required as set_foreground_window argument)
	of the currently active window
	"""
	return win32gui.GetForegroundWindow()

def set_foreground_window(handle):
	""" Changes the currently active window """
	win32gui.SetForegroundWindow(handle)

def find_icon_by_name(iconName):
	""" Returns the content and content type of an Icon by name or path."""

	# Check if iconName is an executable
	path = QStandardPaths.findExecutable(iconName)
	if path:
		path = QDir.toNativeSeparators(path)
		try:
			extractor = ExtractIcon(path)
			groups = extractor.get_group_icons()
			if len(groups) > 0:
				best = extractor.best_icon(groups[0])
				exported = extractor.export(groups[0], best)
				ba = QByteArray()
				buf = QBuffer(ba)
				buf.open(QIODevice.WriteOnly)
				exported.save(buf, "png")
				return (ba.data(), 'image/png')			
		except:
			LOGGER.exception("Failed to load icon from %s" % path)
	return (None, None)

	
#  vim: set fenc=utf-8 ts=4 sw=4 noet :
