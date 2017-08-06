###
# Game:Play - Yet Another Gamepad Launcher
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

from .utils import get_icon_data
from PyQt5.QtWebKitWidgets import QWebView, QWebPage, QWebInspector
from PyQt5.QtWebKit import QWebSettings
from PyQt5.QtNetwork import QNetworkReply, QNetworkAccessManager, QNetworkRequest
from PyQt5.QtCore import QVariant, QTimer

LOGGER = logging.getLogger(__name__)

###
# Enable web inspector
###
QWebSettings.globalSettings().setAttribute(QWebSettings.DeveloperExtrasEnabled, True)

###
# Returns QWebKit's QWebInspector
###
class Inspector(QWebInspector):
	def __init__(self, parent, view):
		QWebInspector.__init__(self, parent)
		self.setPage(view.page())

###
# Returns a QWebView and loads the FrontendWebPage
###
class WebView(QWebView):
	def __init__(self, parent, gameplay, args):
		QWebView.__init__(self, parent)
		self.gameplay = gameplay
		self.setPage(FrontendWebPage(self, gameplay, args))

###
# Override QWebPage to redirect JavaScript console output
# to logger (level 'info'). If the output starts with 'debug',
# 'warn', 'error' or 'exception' the appropirate level is
# choosen instead.
#
# Additionally this adds support for the 'icon://' url scheme
###
class FrontendWebPage(QWebPage):
	def __init__(self, parent, gameplay, args):
		QWebPage.__init__(self, parent)
		self.gameplay = gameplay
		self.args = args
		self.setNetworkAccessManager(NetworkAccessManager(self.networkAccessManager()))
		self.frame = self.mainFrame()
		self.frame.javaScriptWindowObjectCleared.connect(self.load_api)

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
	# Add 'gameplay' controller to JavaScript context when the frame is loaded.
	# Due to security reasons ensure that the URL is local and a child of
	# our own base path.
	###
	def load_api(self):
		url = self.frame.url()
		if url.isLocalFile():
			if os.path.abspath(url.path()).startswith(self.args.docroot):
				LOGGER.info('Adding GamePlay controller to %s' % url)
				self.frame.addToJavaScriptWindowObject('gameplay', self.gameplay)
	
	###
	# Update the page's visibility state (document.hidden).
	###
	def setHidden(self, hidden):
		if hidden:
			self.setVisibilityState(QWebPage.VisibilityStateHidden)
		else:
			self.setVisibilityState(QWebPage.VisibilityStateVisible)

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
		(self.content, self.content_type) = get_icon_data(iconName)

		# give webkit time to connect to the finished and readyRead signals
		QTimer.singleShot(200, self.load_content)
	
	def load_content(self):
		if self.content is None or len(self.content) == 0:
			self.setError(QNetworkReply.ContentNotFoundError, 'Not Found')
		else:
			self.open(self.ReadOnly | self.Unbuffered)
			self.setHeader(QNetworkRequest.ContentTypeHeader, QVariant(self.content_type))
			self.setHeader(QNetworkRequest.ContentLengthHeader, QVariant(len(self.content)))
		self.readyRead.emit()
		self.finished.emit()
	
	def abort(self):
		pass
	
	def bytesAvailable(self):
		if self.content is None:
			return 0 - self.bytes_read + super().bytesAvailable()
		else:
			return len(self.content) - self.bytes_read + super().bytesAvailable()
	
	def isSequential(self):
		return True
	
	def readData(self, size):
		if self.content is None or self.bytes_read >= len(self.content):
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
