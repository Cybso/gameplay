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
import signal
import logging
import json
import inspect
import pkgutil
import psutil

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
		self.ui_settings = YagalaConfig('ui.ini')
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

		# Currently active Popen processes,
		# mapped from appid to Popen object
		self.running = {}

	###
	# Set a UI storage value (compatible to JavaScript's storage)
	###
	@pyqtSlot(str, str)
	def setItem(self, key, value):
		self.ui_settings.set('ui', key, value)
		self.ui_settings.write()

	###
	# Retrieves a UI storage value (compatible to JavaScript's storage)
	###
	@pyqtSlot(str, result=str)
	def getItem(self, key):
		return self.ui_settings.get('ui', key)

	@pyqtSlot(result='QVariantList')
	def getApps(self):
		return [app.__dict__ for app in self.apps]
	
	@pyqtSlot(str, result='QVariantMap')
	def runApp(self, appid):
		p = self.running.get(appid)
		if p:
			if p.is_running():
				return self.getAppStatus(appid)

		for app in self.apps:
			if app.id == appid:
				try:
					p = app.execute()
					if not p is psutil.Process:
						p = psutil.Process(p.pid)
					print("execute", p)
					if p:
						print('foo', appid)
						print('children', p.children(recursive=True))
						self.running[appid] = p
						return self.getAppStatus(appid)
				except:
					LOGGER.exception("Failed to run application '%s'" % appid)
				break
		return None

	@pyqtSlot(str, result='QVariantMap')
	def getAppStatus(self, appid):
		p = self.running.get(appid)
		if p:
			try:
				return {
					'active': p.is_running(),
					'status': p.status()
				}
			except psutil.NoSuchProcess:
				pass

		return {
			'active': False,
			'status': 0
		}

	
	###
	# Tries to stop the app. If the app doesn't terminate within 10
	# seconds this kills the application. Returns the new status.
	###
	@pyqtSlot(str, result='QVariantMap')
	def stopApp(self, appid):
		p = self.running.get(appid)
		if p:
			try:
				if p.is_running():
					procs = p.children(recursive=True)
					procs.append(p)
					for p2 in procs:
						LOGGER.info('Terminating child process %d' % p2.pid)
						p2.terminate()
					gone, still_alive = psutil.wait_procs(procs, timeout=3, callback=self._on_terminate)
					for p2 in still_alive:
						LOGGER.info('Killing child process %d' % p2.pid)
						p2.kill()
				else:
					LOGGER.info('Process ' + p.pid + ' is not active anymore.')
			except:
				LOGGER.exception('Failed to kill process %d' % p.pid)
		return self.getAppStatus(appid)

	###
	# Tries to get the current window into foreground.
	###
	@pyqtSlot()
	def focusYagala(self):
		pass
	
	def _on_terminate(self, proc):
		LOGGER.info("Child process process {} terminated with exit code {}".format(proc.pid, proc.returncode))


#  vim: set fenc=utf-8 ts=4 sw=4 noet :
