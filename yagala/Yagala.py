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
import json
import inspect
import pkgutil

from PyQt5.QtCore import QObject, pyqtSlot, QDir, QStandardPaths

###
# Import provider modules
###
#from .providers import common
from .AppProvider import AppProvider, AppItem
from .YagalaConfig import YagalaConfig
from .providers.Steam import Steam

LOGGER = logging.getLogger(__name__)

class Yagala(QObject):

	def __init__(self):
		# Find resource directories
		super(Yagala, self).__init__()
		self.settings = YagalaConfig('yagala.ini')
		self.providers = [
			Steam(self.settings)
		]
		self.apps = []
		for provider in self.providers:
			for app in provider.get_apps():
				self.apps.append(app)

	###
	# Set a UI storage value (compatible to JavaScript's storage)
	###
	@pyqtSlot(str, str)
	def setItem(self, key, value):
		self.settings.set('ui', key, value)
		self.settings.write()

	###
	# Retrieves a UI storage value (compatible to JavaScript's storage)
	###
	@pyqtSlot(str, result=str)
	def getItem(self, key):
		return self.settings.get('ui', key)

	@pyqtSlot(result='QVariantList')
	def getApps(self):
		return [app.__dict__ for app in self.apps]
	
	@pyqtSlot(str)
	def runApp(self, appid):
		for app in self.apps:
			if app.id == appid:
				app.execute()
				break;
		return None

	@pyqtSlot(str, result='QVariantMap')
	def getAppStatus(self, appid):
		# FIXME
		pass
	


#  vim: set fenc=utf-8 ts=4 sw=4 noet :
