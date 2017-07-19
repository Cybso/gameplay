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

from . import Yagala

LOGGER = logging.getLogger(__name__)

###
# Override QWebPage to redirect JavaScript console output
# to logger (level 'info'). If the output starts with 'debug',
# 'warn', 'error' or 'exception' the appropirate level is
# choosen instead.
###
class FrontendWebPage(QWebPage):
	def javaScriptConsoleMessage(self, msg, line, source):
		if msg.startswith('debug'):
			LOGGER.debug('%s line %d: %s' % (source, line, msg))
		elif msg.startswith('warn'):
			LOGGER.warn('%s line %d: %s' % (source, line, msg))
		elif msg.startswith('error') or msg.startswith('exception'):
			LOGGER.error('%s line %d: %s' % (source, line, msg))
		else:
			LOGGER.info('%s line %d: %s' % (source, line, msg))

#  vim: set fenc=utf-8 ts=4 sw=4 noet :
