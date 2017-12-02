#!/usr/bin/env python3

import os
import sys
import platform
import logging
import subprocess
import re
from PyQt5.QtCore import *
from PyQt5.QtGui import QIcon
from gameplay.AppProvider import AppProvider, AppItem


LOGGER = logging.getLogger(__name__)
CONF_SCUMMVM_SECTION='providers/scummvm'
CONF_SCUMMVM_ENABLED='enabled'
CONF_SCUMMVM_EXECUTABLE='executable'

class ScummvmPlatformGeneric:
	def find_scummvm_exe(self):
		LOGGER.warn('Method "find_scummvm_exe" not implemented')
		return None

class ScummvmPlatformLinux(ScummvmPlatformGeneric):
	def find_scummvm_exe(self):
		return [QStandardPaths.findExecutable('scummvm')]

class ScummvmPlatformWindows(ScummvmPlatformGeneric):
	def __init__(self):
		ScummvmPlatformGeneric.__init__(self)
		# FIXME load these from Registry
		self.search_paths = [
			QDir(QDir.fromNativeSeparators("C:\\Program Files\\ScummVM")),
			QDir(QDir.fromNativeSeparators("C:\\Program Files (x86)\\ScummVM")),
			QDir(QDir.fromNativeSeparators("C:\\Programme\\ScummVM"))
		]
		
	def find_scummvm_exe(self):
		""" Looks for scummvm in %PATH% and in C:\\Programme\\Scummvm (x86)\\scummvm.exe
		and inC:\\Program Files (x86)\\Scummvm\\scummvm.exe.
		FIXME Use registry to look up real installation path.
		"""
		path = QStandardPaths.findExecutable('scummvm.exe')
		if path:
			return [path]
			
		for scummvmPath in self.search_paths:
			scummvmPath = scummvmPath.absolutePath() + "/scummvm.exe"
			path = QFile(scummvmPath)
			if path.exists():
				return [QDir.toNativeSeparators(scummvmPath)]

		return None


class ScummvmPlatformOSX(ScummvmPlatformGeneric):
	def find_scummvm_exe(self):
		""" Don't know where a typical installation path lays...
		What should work is 'open -a Scummvm', but that's not
		a single command and is don't know how to check
		if this WOULD work.
		
		The result should be a list object
		"""
		path = QStandardPaths.findExecutable('Scummvm')
		if path:
			return [path]

		# Just a guess...
		path = '/Applications/Scummvm.app/Contents/MacOS/Scummvm'
		if QFile(path).exists():
			return [path]

		return None

class ScummvmAppItem(AppItem):
	def __init__(self, provider, gameid, label, icon = None, icon_selected = None, suspended = False):
		AppItem.__init__(self, 'scummvm_' + gameid, label, icon, icon_selected, suspended)
		self._gameid = gameid
		self._provider = provider
		self.categories = ['ScummVM']

		cmd = self._provider.find_scummvm_exe()
		if cmd:
			cmd.append('-f')
			cmd.append('--joystick=0')
			cmd.append(self._gameid)
			self.cmd = cmd

	def execute(self):
		return AppItem.execute(self)
	
class ScummvmProvider(AppProvider):
	def __init__(self, settings):
		AppProvider.__init__(self, settings)
		# Find platform dependent implementation
		system = platform.system()
		if system == 'Linux':
			self.platform = ScummvmPlatformLinux()
		elif system == 'Darwin':
			self.platform = ScummvmPlatformOSX()
		elif system == 'Windows':
			self.platform = ScummvmPlatformWindows()
		else:
			LOGGER.warn('Failed to identify platform: ' + system)
			self.platform = ScummvmPlatformGeneric()
		self.target_pattern = re.compile('^([a-z0-9][a-z0-9-_]+)\\s+(.*)')

	def get_apps(self):
		""" Returns a ScummvmAppItem instance for each installed app """
		apps = []
		if self.settings.getboolean(CONF_SCUMMVM_SECTION, CONF_SCUMMVM_ENABLED, True):
			cmd = self.find_scummvm_exe()
			if cmd:
				try:
					cmd.append('-t')
					for line in subprocess.check_output(cmd).splitlines():
						line = line.decode('UTF-8')
						m = self.target_pattern.match(line)
						if m:
							gameid = m.group(1)
							label = m.group(2)
							apps.append(ScummvmAppItem(self, gameid, label, self.find_icon(gameid)))
				except:
					LOGGER.exception('Failed to execute: %s' % (' '.join(cmd)))
		return apps

	def find_icon(self, gameid):
		""" Currently I do not have an idea how to find an image for the game.
		In the meantime, define a Gameplay icon:// path that can be used by
		placing an icon in one of the icon search paths called scummvm/GAMEID.png
		"""
		return 'icon://scummvm/' + gameid + '.png'

	def find_scummvm_exe(self):
		""" Tries to locate the scummvm executable. This depends on the platform. """
		path = self.settings.getlist(CONF_SCUMMVM_SECTION, CONF_SCUMMVM_EXECUTABLE)
		if path is None:
			path = self.platform.find_scummvm_exe()
		return path

#  vim: set fenc=utf-8 ts=4 sw=4 noet :
