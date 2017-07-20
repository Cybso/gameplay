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

from .providers.SteamProvider import SteamProvider
from .providers.EmulatorProvider import EmulatorProvider
from .providers.DesktopEntryProvider import DesktopEntryProvider
from .providers.SystemAppProvider import SystemAppProvider

LOGGER = logging.getLogger(__name__)

class Yagala(QObject):

	def __init__(self):
		# Find resource directories
		super(Yagala, self).__init__()
		self.settings = YagalaConfig('yagala.ini')
		self.providers = [
			SteamProvider(self.settings),
			EmulatorProvider(self.settings),
			DesktopEntryProvider(self.settings),
			SystemAppProvider(self.settings)
		]
		self.apps = []
		for provider in self.providers:
			try:
				for app in provider.get_apps():
					self.apps.append(app)
			except:
				LOGGER.exception("Failed to invoke application provider %s" % provider.__class__.__name__)

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
		apps = []
		for app in self.apps:
			d = app.__dict__
#			if not d.get('icon', 'http').startswith('http'):
#				d['icon'] = 'file://' + urlencode(d['icon'])
			apps.append(d)
		return apps
	
	@pyqtSlot(str, result='QVariantList')
	def runApp(self, appid):
		for app in self.apps:
			if app.id == appid:
				try:
					app.execute()
				except:
					LOGGER.exception("Failed to run application '%s'" % appid)
				break
		return None

	@pyqtSlot(str, result='QVariantMap')
	def getAppStatus(self, appid):
		# FIXME
		pass
	


#  vim: set fenc=utf-8 ts=4 sw=4 noet :
