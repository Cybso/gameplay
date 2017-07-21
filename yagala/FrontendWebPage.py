#!/usr/bin/env python3
###
# YAGALA - Yet Another Gamepad Launcher
#
# A Python and PyQt5 based application launcher that uses
# HTML5's gamepad API to implement a platform independent
# UI that can be controlled via keyboard, mouse and 
# gamepad/joystick.
#
# Author: Roland Tapken <roland@bitarbeiter.net>
# License: GPLv3
###

import os
import logging

from PyQt5.QtWebKitWidgets import QWebPage
from PyQt5.QtGui import QIcon
from PyQt5.QtCore import QVariant, QTimer, QByteArray, QBuffer, QIODevice
from PyQt5.QtNetwork import QNetworkReply, QNetworkAccessManager, QNetworkRequest


from . import Yagala

LOGGER = logging.getLogger(__name__)

###
# Override QWebPage to redirect JavaScript console output
# to logger (level 'info'). If the output starts with 'debug',
# 'warn', 'error' or 'exception' the appropirate level is
# choosen instead.
#
# Additionally this adds support for the 'icon://' url scheme
###
class FrontendWebPage(QWebPage):
	def __init__(self, *args, **kwargs):
		QWebPage.__init__(self, *args, **kwargs)
		self.setNetworkAccessManager(NetworkAccessManager(self.networkAccessManager()))

	def javaScriptConsoleMessage(self, msg, line, source):
		if msg.startswith('debug'):
			LOGGER.debug('%s line %d: %s' % (source, line, msg))
		elif msg.startswith('warn'):
			LOGGER.warn('%s line %d: %s' % (source, line, msg))
		elif msg.startswith('error') or msg.startswith('exception'):
			LOGGER.error('%s line %d: %s' % (source, line, msg))
		else:
			LOGGER.info('%s line %d: %s' % (source, line, msg))

###
# Icon Reply - responds to requests starting with icon:// and tries
# to resolve the icon using QIcon.
###
class IconSchemeReply(QNetworkReply):

	def __init__(self, parent, url, operation):
		QNetworkReply.__init__(self, parent)
		self.setOperation(operation)
		self.setUrl(url)
		self.bytes_read = 0

		# Strip 'icon://' from url
		iconName = url.toString()[7:]
		icon = QIcon.fromTheme(iconName)

		# Request maximum size
		sizes = sorted(icon.availableSizes(), key=lambda s : s.width() * s.height(), reverse=True)
		if len(sizes) > 0:
			image = icon.pixmap(sizes[0]).toImage()
			ba = QByteArray();
			buf = QBuffer(ba);
			buf.open(QIODevice.WriteOnly);
			image.save(buf, 'PNG')
			self.content = ba.data()
		else:
			self.content = b''

		# give webkit time to connect to the finished and readyRead signals
		QTimer.singleShot(200, self.load_content)
	
	def load_content(self):
		if len(self.content) == 0:
			self.setError(QNetworkReply.ContentNotFoundError, 'Not Found')
		else:
			self.open(self.ReadOnly | self.Unbuffered)
			self.setHeader(QNetworkRequest.ContentTypeHeader, QVariant("image/png"))
			self.setHeader(QNetworkRequest.ContentLengthHeader, QVariant(len(self.content)))
		self.readyRead.emit()
		self.finished.emit()
	
	def abort(self):
		pass
	
	def bytesAvailable(self):
		return len(self.content) - self.bytes_read + super().bytesAvailable()
	
	def isSequential(self):
		return True
	
	def readData(self, size):
		if self.bytes_read >= len(self.content):
			return None
		data = self.content[self.bytes_read:self.bytes_read + size]
		self.bytes_read += len(data)
		return data


class NetworkAccessManager(QNetworkAccessManager):
	def __init__(self, old_manager):
		QNetworkAccessManager.__init__(self)
		self.old_manager = old_manager
		self.setCache(old_manager.cache())
		self.setCookieJar(old_manager.cookieJar())
		self.setProxy(old_manager.proxy())
		self.setProxyFactory(old_manager.proxyFactory())

	def createRequest(self, operation, request, data):
		if request.url().scheme() != "icon":
			return QNetworkAccessManager.createRequest(self, operation, request, data)
	
		if request.url().scheme() == 'icon' and operation == self.GetOperation:
			return IconSchemeReply(self, request.url(), self.GetOperation)
		else:
			return QNetworkAccessManager.createRequest(self, operation, request, data)

#  vim: set fenc=utf-8 ts=4 sw=4 noet :
