#!/usr/bin/env python3
###
# Game✜Play - Yet Another Gamepad Launcher
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

from PyQt5.QtGui import QIcon
from PyQt5.QtCore import QVariant, QTimer, QByteArray, QBuffer, QIODevice, pyqtSlot
from importlib import util

from . import GamePlay

LOGGER = logging.getLogger(__name__)


if util.find_spec("PyQt5.QtWebKit") is not None:
if util.find_spec("PyQt5.QtWebEngineWidgets") is not None:
	###
	# Override QWebPage to redirect JavaScript console output
	# to logger (level 'info'). If the output starts with 'debug',
	# 'warn', 'error' or 'exception' the appropirate level is
	# choosen instead.
	#
	# Additionally this adds support for the 'icon://' url scheme
	###
	from PyQt5.QtWebEngineWidgets import QWebEnginePage
	class FrontendWebEnginePage(QWebEnginePage):
		def __init__(self, parent, gameplay, args):
			QWebEngine.__init__(self, parent)
			self.gameplay = gameplay
			self.args = args
			self.handler = IconSchemeHandler()
			self.profile().installUrlSchemeHandler(b'icon', self.handler)
			channel = QWebChannel(self);
			self.setWebChannel(channel);
			channel.registerObject("gameplay", gameplay);

		def javaScriptConsoleMessage(self, level, msg, line, source):
			if msg.startswith('debug'):
				LOGGER.debug('%s line %d: %s' % (source, line, msg))
			elif msg.startswith('warn'):
				LOGGER.warn('%s line %d: %s' % (source, line, msg))
			elif msg.startswith('error') or msg.startswith('exception'):
				LOGGER.error('%s line %d: %s' % (source, line, msg))
			else:
				LOGGER.info('%s line %d: %s' % (source, line, msg))

		###
		# Workaround for WebEngine, which doesn't provide direct access to
		# 'document.hidden'. We workaround this by updating a custom property
		# called 'document.webegineHidden', so in JavaScript you should
		# check for (document.hidden || document.webengineHidden).
		###
		def setHidden(self, hidden):
			if hidden:
				hidden = 'true'
			else:
				hidden = 'false'
			self.runJavaScript('''(function(state) {
				document.webengineHidden = state;
				var event = document.createEvent("HTMLEvents");
				event.initEvent("visibilitychange", true, true);
				document.dispatchEvent(event);
			})(%s)''' % (hidden))


	from PyQt5.QtWebEngineCore import QWebEngineUrlSchemeHandler, QWebEngineUrlRequestJob
	from PyQt5.QtWebEngineWidgets import QWebEngineProfile
	class IconSchemeHandler(QWebEngineUrlSchemeHandler):
		def requestStarted(self, job):
			if job.requestMethod() == b'GET':
				(icon, contentType) = get_icon_data(job.requestUrl().toString()[7:])
				if icon is None:
					return job.fail(QWebEngineUrlRequestJob.UrlNotFound)

				buf = QBuffer(parent=self)
				buf.open(QIODevice.WriteOnly)
				buf.write(icon)
				buf.seek(0)
				buf.close()
				job.reply(contentType.encode('UTF-8'), buf)
			else:
				job.fail(QWebEngineUrlRequestJob.UrlNotFound)

#  vim: set fenc=utf-8 ts=4 sw=4 noet :
