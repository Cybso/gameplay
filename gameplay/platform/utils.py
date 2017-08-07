import logging
from PyQt5.QtGui import QIcon
from PyQt5.QtCore import QByteArray, QBuffer, QIODevice, QStandardPaths

LOGGER = logging.getLogger(__name__)

# Load platform dependent utils
import platform
system = platform.system()
if system == 'Linux':
	LOGGER.info('Detected Linux system')
	from . import linux as gameplay_sys
elif system == 'Darwin':
	LOGGER.info('Detected Darwin system')
	from . import darwin as gameplay_sys
elif system == 'Windows':
	LOGGER.info('Detected Windows system')
	from . import windows as gameplay_sys
else:
	# Try with linux as fallback...
	LOGGER.info('Detected unknown system, using Linux API')
	from . import linux as gameplay_sys

def get_icon_data(iconName):
	""" Resolves an icon name and returns its data and filetype.
	Returns None / None if the image has not  been found.
	"""
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

#  vim: set fenc=utf-8 ts=4 sw=4 noet :
