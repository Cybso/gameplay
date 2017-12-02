#!/usr/bin/env python3
"""
Game✜Play - Yet Another Gamepad Launcher
#
A Python and PyQt5 based application launcher that uses
HTML5's gamepad API to implement a platform independent
UI that can be controlled via keyboard, mouse and 
gamepad/joystick.

Author: Roland Tapken <roland@bitarbeiter.net>
License: GPLv3
"""

import os
import signal
import logging
import json
import inspect
import pkgutil
from urllib.parse import quote, unquote
from subprocess import Popen

from PyQt5.QtCore import QObject, pyqtSlot, QDir, QStandardPaths, QTimer
from PyQt5.Qt import Qt

from .AppProvider import AppProvider, AppItem
from .GamePlayConfig import GamePlayConfig

from .providers.SteamProvider import SteamProvider
from .providers.EmulatorProvider import EmulatorProvider
from .providers.DesktopEntryProvider import DesktopEntryProvider
from .providers.SystemAppProvider import SystemAppProvider
from .providers.ScummvmProvider import ScummvmProvider

LOGGER = logging.getLogger(__name__)

class EventWrapper():
	def __init__(self, settings):
		self.settings = settings
		self.active_apps = []
		self.is_idle = False
		
		# Start idle timer, but only if necessary.
		self.idle_timeout = settings.getint('events', 'idle-timeout', 0) * 1000
		if not (settings.get('events', 'idle') or settings.get('events', 'busy')):
			self.idle_timeout = 0
		self.timer = None

	def _fire(self, name, app = None):
		cmd = self.settings.get('events', name)
		if cmd:
			try:
				env=None
				if app is not None:
					env = dict(os.environ)
					env['GAMEPLAY_APP_ID'] = app.appid
					env['GAMEPLAY_APP_PID'] = str(app.pid)
					env['GAMEPLAY_APP_STATUS'] = app.status()
				LOGGER.info("Firing %s event: %s" % (name, cmd))
				Popen(cmd, env=env, shell=True)
			except:
				LOGGER.exception("Failed to execute command: %s" % cmd)

	def fire_app_start(self, app):
		""" Fires the configures events/app-start command when an
		application is started. Exported values are
		     GAMEPLAY_APP_ID
		     GAMEPLAY_APP_PID
		"""
		
		if app.appid not in self.active_apps:
			self.active_apps.append(app.appid)
			self._fire('app-start', app)

	def fire_app_suspend(self, app):
		"""Fires the configures events/app-start command when an
		application is suspended. Exported values are
		    GAMEPLAY_APP_ID
		    GAMEPLAY_APP_PID
		"""
		self._fire('app-suspend', app)

	def fire_app_resume(self, app):
		""" Fires the configures events/app-start command when an
		application is resumed. Exported values are
		    GAMEPLAY_APP_ID
		    GAMEPLAY_APP_PID
		"""
		self._fire('app-resume', app)
	
	def fire_app_exit(self, app):
		""" Fires the configures events/app-start command when an
		application exits. Exported values are
		    GAMEPLAY_APP_ID
		    GAMEPLAY_APP_PID
		"""
		if app.appid in self.active_apps:
			self.active_apps.remove(app.appid)
			self._fire('app-exit', app)

	def fire_idle(self):
		"""Fires an event when the UI is active but idling for
		configured 'event/idle-timout' time of seconds (meaning
		that no button is pressed meanwhile).
		"""
		if not self.is_idle:
			self.is_idle = True
			self._fire('idle')

	def fire_busy(self):
		""" Fires an event when the UI was in idle state but has been
		resumed (or unactivated).
		"""
		if self.idle_timeout > 0:
			if self.timer is None:
				self.timer = QTimer()
				self.timer.setSingleShot(True)
				self.timer.timeout.connect(self.fire_idle)
			self.timer.start(self.idle_timeout)
			if self.is_idle:
				self.is_idle = False
				self._fire('busy')
	
	def suspend_idle(self):
		""" Don't call an idle event until the next busy event is activated."""
		if self.idle_timeout > 0 and self.is_idle:
			self.is_idle = False
			self._fire('busy')

		if self.timer is not None:
			self.timer.stop()
			self.timer = None


class GamePlay(QObject):

	def __init__(self):
		# Find resource directories
		super(GamePlay, self).__init__()
		self.window = None
		self.on_top = False
		self.settings = GamePlayConfig('gameplay.ini')
		self.ui_settings = GamePlayConfig('ui.ini')
		self.events = EventWrapper(self.settings)

		self.providers = {
			'steam': SteamProvider(self.settings),
			'emulators': EmulatorProvider(self.settings),
			'desktop': DesktopEntryProvider(self.settings),
			'system': SystemAppProvider(self.settings),
			'scummvm': ScummvmProvider(self.settings)
		}

		# Currently active AppProcess object per appid.
		self.running = {}
		self.apps = None
	
	def _getAppItems(self):
		if self.apps == None:
			self.apps = []
			for key, provider in self.providers.items():
				if not self.settings.getboolean('providers/' + key, 'enabled', True):
					LOGGER.info("Provider '%s' disabled in config file, skipping." % key)
					continue

				try:
					for app in provider.get_apps():
						self.apps.append(app)
				except:
					LOGGER.exception("Failed to invoke application provider %s" % provider.__class__.__name__)
		return self.apps

	@pyqtSlot(str, str, str)
	def setItem(self, section, key, value):
		""" Set a UI storage value """
		self.ui_settings.set(section, quote(key), value)
		self.ui_settings.write()

	@pyqtSlot(str, str, result=str)
	def getItem(self, section, key):
		""" Retrieves a UI storage value """
		return self.ui_settings.get(section, quote(key))

	@pyqtSlot(str, str, result=str)
	def getOption(self, section, option):
		return self.settings.get(section, option, None)
	
	@pyqtSlot(result='QVariantMap')
	def getOptions(self):
		return self.settings.getall();

	@pyqtSlot(result='QVariantList')
	def getApps(self):
		# Reset apps
		self.events.fire_busy()
		self.apps = None
		return sorted([app.__dict__ for app in self._getAppItems()], key=lambda app: app['label'].lower())
	
	@pyqtSlot(str, result='QVariantMap')
	def runApp(self, appid):
		self.events.fire_busy()
		p = self.running.get(appid)
		if p:
			if p.is_running():
				if p.is_suspended():
					self.events.fire_app_resume(p)
					p.resume(raiseCallback=self.lowerWindow)
				return self.getAppStatus(appid)

		for app in self._getAppItems():
			if app.id == appid:
				try:
					self.suspendStayOnTop()
					p = app.execute()
					if p:
						self.events.fire_app_start(p)
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
			if not p.is_running():
				self.events.fire_app_exit(p)
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

	@pyqtSlot(str, result='QVariantMap')
	def suspendApp(self, appid):
		""" Tries to suspend an app and all of its children """
		self.events.fire_busy()
		p = self.running.get(appid)
		if p:
			p.suspend()
			self.events.fire_app_suspend(p)
			self.raiseWindow()
		return self.getAppStatus(appid)

	@pyqtSlot(str, result='QVariantMap')
	def resumeApp(self, appid):
		""" Tries to resume an app and all of its children """
		self.events.fire_busy()
		p = self.running.get(appid)
		if p and p.is_suspended():
			self.suspendStayOnTop()
			self.events.fire_app_resume(p)
			p.resume(raiseCallback=self.lowerWindow)
		return self.getAppStatus(appid)

	@pyqtSlot(str, result='QVariantMap')
	def stopApp(self, appid):
		""" Tries to stop the app.
		
		If the app doesn't terminate within 10
		seconds this kills the application. Returns the new status.
		"""
		self.events.fire_busy()
		p = self.running.get(appid)
		if p:
			p.terminate()
			self.raiseWindow()
		return self.getAppStatus(appid)

	@pyqtSlot()
	def lowerWindow(self):
		self.events.fire_busy()
		if self.window:
			LOGGER.info('Lowering window')
			self.suspendStayOnTop()
			self.window.lower()

	@pyqtSlot()
	def raiseWindow(self):
		self.events.fire_busy()
		if self.window:
			LOGGER.info('Raising window')
			self.window.activateWindow()
			self.window.raise_()
			self.resumeStayOnTop()
	
	@pyqtSlot()
	def exit(self):
		self.events.fire_busy()
		if self.window:
			self.window.confirmClose = False
			self.window.close()
	
	@pyqtSlot()
	def triggerBusy(self):
		self.events.fire_busy()
	
	@pyqtSlot()
	def suspendIdle(self):
		self.events.suspend_idle()
	
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
