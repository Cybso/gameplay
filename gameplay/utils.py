import os
import sys
import logging
import mimetypes
from PyQt5.QtGui import QIcon
from PyQt5.QtCore import QByteArray, QBuffer, QIODevice, QDir, QStandardPaths

LOGGER = logging.getLogger(__name__)

# Load platform dependent utils
import platform
system = platform.system()
if system == 'Linux':
	LOGGER.info('Detected Linux system')
	from .platform import linux as gameplay_sys
elif system == 'Darwin':
	LOGGER.info('Detected Darwin system')
	from .platform import darwin as gameplay_sys
elif system == 'Windows':
	LOGGER.info('Detected Windows system')
	from .platform import windows as gameplay_sys
else:
	# Try with linux as fallback...
	LOGGER.info('Detected unknown system, using Linux API')
	from .platform import linux as gameplay_sys

ICON_OVERRIDE_PATHS = None
def get_icon_data(iconName):
	""" Resolves an icon name and returns its data and filetype.
	Returns None / None if the image has not  been found.

	Icons are first search in the 'icons/' subdirectories
	of the applications configuration paths, and afterwards
	tries to resolve as absolute paths, and if that fails GamePlay
	will try to resolve them using QIcon.

	If anything fails this call will be redirected to a platform
	dependent implementation. On windows, this will try to extract
	the first icon from an .exe file.
	"""
	global ICON_OVERRIDE_PATHS
	if ICON_OVERRIDE_PATHS is None:
		# Load local icon override paths
		ICON_OVERRIDE_PATHS = [os.path.dirname(os.path.abspath(sys.argv[0])) + os.sep + 'icons']
		ICON_OVERRIDE_PATHS += [QDir.toNativeSeparators(x + '/icons') for x in QStandardPaths.standardLocations(QStandardPaths.AppConfigLocation)]

	for override in ICON_OVERRIDE_PATHS:
		override += os.sep + iconName
		if os.path.exists(override):
			(mimeType, encoding) = mimetypes.guess_type(override)
			if mimeType is not None and mimeType.startswith('image/'):
				buf = open(override, 'rb').read()
				return (buf, mimeType)

	if os.path.exists(iconName):
		(mimeType, encoding) = mimetypes.guess_type(iconName)
		if mimeType is not None and mimeType.startswith('image/'):
			buf = open(iconName, 'rb').read()
			return (buf, mimeType)

	icon = QIcon.fromTheme(iconName)
	sizes = sorted(icon.availableSizes(), key=lambda s : s.width() * s.height(), reverse=True)
	if len(sizes) > 0:
		image = icon.pixmap(sizes[0]).toImage()
		ba = QByteArray();
		buf = QBuffer(ba);
		buf.open(QIODevice.WriteOnly);
		image.save(buf, 'PNG')
		return (ba.data(), 'image/png')
	else:
		(icon, contentType) = gameplay_sys.find_icon_by_name(iconName)
		if icon is None:
			LOGGER.warning("Icon not found: %s" % (iconName))
			return (None, None)
		return (icon, contentType)

def find_getch():
	""" Returns a getch (get character) implementation """
	try:
		import termios
	except ImportError:
		# Non-POSIX. Return msvcrt's (Windows') getch.
		import msvcrt
		return msvcrt.getch

	# POSIX system. Create and return a getch that manipulates the tty.
	import sys, tty
	def _getch():
		fd = sys.stdin.fileno()
		old_settings = termios.tcgetattr(fd)
		try:
			tty.setraw(fd)
			ch = sys.stdin.read(1)
		finally:
			termios.tcsetattr(fd, termios.TCSADRAIN, old_settings)
		return ch

	return _getch

def find_output(filename):
	""" When this is not an interactive terminal this function will
	change sys.stdout to the given filename and return a control
	object. When 'closed' is called on this control object the outfile
	will be saved, stdout restored and - if possible - the generated
	file opened in an editor.
	"""
	import platform, subprocess, shlex
	class OutputDescriptor:
		def __init__(self, destfile, fp, orig_stdout):
			self.destfile = destfile
			self.fp = fp
			self.orig_stdout = orig_stdout

		def close(self):
			self.fp.close()
			sys.stdout = self.orig_stdout

			#  Try to open the file...
			system = platform.system()
			if system == 'Linux':
				subprocess.run(['xdg-open', self.destfile])
			elif system == 'Windows':
				subprocess.run('start ' + shlex.quote(self.destfile), shell=True)
			elif system == 'Darwin':
				subprocess.run('open ' + shlex.quote(self.destfile), shell=True)

	if os.isatty(sys.stdout.fileno()):
		return None

	fp = open(filename, 'w')
	result = OutputDescriptor(filename, fp, sys.stdout)
	sys.stdout = fp
	return result

#  vim: set fenc=utf-8 ts=4 sw=4 noet :
