###
# Resolves an icon name and returns its data and filetype.
# Returns None / None if the image has not  been found.
###

from PyQt5.QtGui import QIcon
from PyQt5.QtCore import QByteArray, QBuffer, QIODevice

def get_icon_data(iconName):
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
		return (None, None)


