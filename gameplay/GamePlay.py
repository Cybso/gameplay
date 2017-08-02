#!/usr/bin/env python3
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
import signal
import logging
import json
import inspect
import pkgutil
from urllib.parse import quote, unquote

from PyQt5.QtCore import QObject, pyqtSlot, QDir, QStandardPaths
from PyQt5.Qt import Qt

###
# Import provider modules
###
#from .providers import common
from .AppProvider import AppProvider, AppItem
from .GamePlayConfig import GamePlayConfig

from .providers.SteamProvider import SteamProvider
from .providers.EmulatorProvider import EmulatorProvider
from .providers.DesktopEntryProvider import DesktopEntryProvider
from .providers.SystemAppProvider import SystemAppProvider

LOGGER = logging.getLogger(__name__)

class GamePlay(QObject):

	def __init__(self):
		# Find resource directories
		super(GamePlay, self).__init__()
		self.window = None
		self.on_top = False
		self.settings = GamePlayConfig('gameplay.ini')
		self.ui_settings = GamePlayConfig('ui.ini')

		self.providers = [
			SteamProvider(self.settings),
			EmulatorProvider(self.settings),
			DesktopEntryProvider(self.settings),
			SystemAppProvider(self.settings)
		]

		# Currently active AppProcess object per appid.
		self.running = {}
		self.apps = None
	
	def _getAppItems(self):
		if self.apps == None:
			self.apps = []
			for provider in self.providers:
				try:
					for app in provider.get_apps():
						self.apps.append(app)
				except:
					LOGGER.exception("Failed to invoke application provider %s" % provider.__class__.__name__)
		return self.apps

	###
	# Set a UI storage value (compatible to JavaScript's storage)
	###
	@pyqtSlot(str, str)
	def setItem(self, key, value):
		self.ui_settings.set('ui', quote(key), value)
		self.ui_settings.write()

	###
	# Retrieves a UI storage value (compatible to JavaScript's storage)
	###
	@pyqtSlot(str, result=str)
	def getItem(self, key):
		return self.ui_settings.get('ui', quote(key))

	@pyqtSlot(result='QVariantList')
	def getApps(self):
		# Reset apps
		self.apps = None
		return sorted([app.__dict__ for app in self._getAppItems()], key=lambda app: app['label'].lower())
	
	@pyqtSlot(str, result='QVariantMap')
	def runApp(self, appid):
		p = self.running.get(appid)
		if p:
			if p.is_running():
				if p.is_suspended():
					p.resume(raiseCallback=self.lowerWindow)
				return self.getAppStatus(appid)

		for app in self._getAppItems():
			if app.id == appid:
				try:
					self.suspendStayOnTop()
					p = app.execute()
					if p:
						self.running[appid] = p
						return self.getAppStatus(appid)
				except:
					LOGGER.exception("Failed to run application '%s'" % appid)
					self.raiseWindow()
				break
		return None

	@pyqtSlot(str, result='QVariantMap')
	def getAppStatus(self, appid):
		p = self.running.get(appid)
		if p:
			return {
				'id': appid,
				'active': p.is_running(),
				'suspended': p.is_suspended(),
				'status': p.status()
			}

		return {
			'id': appid,
			'active': False,
			'suspended': False,
			'status': 'inactive'
		}

	@pyqtSlot(result='QVariantList')
	def getAllAppStatus(self):
		result = []
		for appid, p in self.running.items():
			result.append({
				'id': appid,
				'active': p.is_running(),
				'suspended': p.is_suspended(),
				'status': p.status()
			})
		return result

	###
	# Tries to suspend an app and all of its children
	###
	@pyqtSlot(str, result='QVariantMap')
	def suspendApp(self, appid):
		p = self.running.get(appid)
		if p:
			p.suspend()
			self.raiseWindow()
		return self.getAppStatus(appid)

	###
	# Tries to resume an app and all of its children
	###
	@pyqtSlot(str, result='QVariantMap')
	def resumeApp(self, appid):
		p = self.running.get(appid)
		if p and p.is_suspended():
			self.suspendStayOnTop()
			p.resume(raiseCallback=self.lowerWindow)
		return self.getAppStatus(appid)

	###
	# Tries to stop the app. If the app doesn't terminate within 10
	# seconds this kills the application. Returns the new status.
	###
	@pyqtSlot(str, result='QVariantMap')
	def stopApp(self, appid):
		p = self.running.get(appid)
		if p:
			p.terminate()
			self.raiseWindow()
		return self.getAppStatus(appid)

	@pyqtSlot()
	def lowerWindow(self):
		if self.window:
			LOGGER.info('Lowering window')
			self.suspendStayOnTop()
			self.window.lower()

	@pyqtSlot()
	def raiseWindow(self):
		if self.window:
			LOGGER.info('Raising window')
			self.window.activateWindow()
			self.window.raise_()
			self.resumeStayOnTop()
	
	@pyqtSlot()
	def exit(self):
		if self.window:
			self.window.confirmClose = False
			self.window.close()
	
	def suspendStayOnTop(self):
		if self.window is None:
			return

		if not self.on_top:
			if int(self.window.windowFlags()) & Qt.WindowStaysOnTopHint != 0:
				LOGGER.info('Disable WindowStayOnTop')
				self.on_top = True
				self.window.setWindowFlags(self.window.windowFlags() & ~Qt.WindowStaysOnTopHint)
				if int(self.window.windowState()) & Qt.WindowFullScreen != 0:
					self.window.showFullScreen()
				else:
					self.window.show()

	def resumeStayOnTop(self):
		if self.window is None:
			return

		if self.on_top:
			self.on_top = False
			self.window.setWindowFlags(self.window.windowFlags() | Qt.WindowStaysOnTopHint)
			if int(self.window.windowState()) & Qt.WindowFullScreen != 0:
				LOGGER.info('Enable WindowStayOnTop (fullscreen)')
				self.window.showFullScreen()
			else:
				LOGGER.info('Enable WindowStayOnTop')
				self.window.show()

#  vim: set fenc=utf-8 ts=4 sw=4 noet :
