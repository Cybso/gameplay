#!/usr/bin/env python3

import os
import sys
import platform
import logging
import json
import functools
import psutil
from PyQt5.QtCore import *
from PyQt5.QtGui import QIcon
from gameplay.AppProvider import AppProvider, AppItem


LOGGER = logging.getLogger(__name__)
CONF_STEAM_SECTION='providers/steam'
CONF_STEAM_ENABLED='enabled'
CONF_STEAM_EXECUTABLE='executable'
CONF_STEAM_STEAMAPPS='steamapps'

def _str_to_int(s):
	""" Converts a string that starts with a number to positive int.
	If the string doesn't start with a number returns -1
	"""
	length = 0
	for c in s:
		if c < '0' or c > '9':
			break
		length += 1
	if length == 0:
		return -1
	else:
		return int(s[0:length])

def _sort_names_as_numbers(a, b):
	"""Tries a natural sort on everything that
	starts with a number. If the entry doesn't
	start with a number it is assumed to be lower
	than every numbered value. Negative values are
	not allowed.
	"""
	ai = _str_to_int(a)
	bi = _str_to_int(b)
	if ai < bi:
		return -1
	if bi < ai:
		return 1
	if a < b:
		return -1
	if b < a:
		return 1
	return 0

class SteamPlatformGeneric:
	""" Try to locate "steamapps" folder """

	def steamapps_path(self):
		LOGGER.warn('Method "steamapps_path" not implemented')
		return None
	
	def find_app_icon(self, appid):
		LOGGER.warn('Method "find_app_icon" not implemented')
		return None
	
	def find_steam_exe(self):
		LOGGER.warn('Method "find_steam_exe" not implemented')
		return None

class SteamPlatformLinux(SteamPlatformGeneric):
	""" Try to locate "steamapps" folder """

	def steamapps_path(self):
		steamPath = QDir(QDir.fromNativeSeparators(QDir.homePath()) + '/.steam/steam/steamapps')
		if steamPath.exists():
			return steamPath.absolutePath()
		steamPath = QDir(QDir.fromNativeSeparators(QDir.homePath()) + '/.steam/steam/SteamApps')
		if steamPath.exists():
			return steamPath.absolutePath()
		return None

	def find_app_icon(self, appid):
		iconName = 'steam_icon_' + appid
		if not QIcon.fromTheme(iconName).isNull():
			return 'icon:///' + iconName
		return None

	def find_steam_exe(self):
		return [QStandardPaths.findExecutable('steam')]

class SteamPlatformWindows(SteamPlatformGeneric):
	def __init__(self):
		SteamPlatformGeneric.__init__(self)
		# FIXME load these from Registry
		self.search_paths = [
			QDir(QDir.fromNativeSeparators("C:\\Program Files\\Steam")),
			QDir(QDir.fromNativeSeparators("C:\\Program Files (x86)\\Steam")),
			QDir(QDir.fromNativeSeparators("C:\\Programme\\Steam")),
			QDir(QDir.fromNativeSeparators("C:\\Programme\\Steam (x86)"))
		]
		
	def steamapps_path(self):
		""" Try to locate "steamapps" folder """
		for steamPath in self.search_paths:
			steamPath = QDir(steamPath.absolutePath() + "/SteamApps")
			if steamPath.exists():
				return QDir.toNativeSeparators(steamPath.absolutePath())
		return None

	def find_steam_exe(self):
		""" Looks for steam in %PATH% and in C:\\Programme\\Steam (x86)\\steam.exe
		and inC:\\Program Files (x86)\\Steam\\steam.exe.
		FIXME Use registry to look up real installation path.
		"""
		path = QStandardPaths.findExecutable('steam.exe')
		if path:
			return [path]
			
		for steamPath in self.search_paths:
			steamPath = steamPath.absolutePath() + "/steam.exe"
			path = QFile(steamPath)
			if path.exists():
				return [QDir.toNativeSeparators(steamPath)]

		return None


class SteamPlatformOSX(SteamPlatformGeneric):
	def steamapps_path(self):
		""" Try to locate "steamapps" folder """
		steamPath = QDir(QDir.fromNativeSeparators(QDir.homePath()) + '/Library/Application Support/Steam/SteamApps')
		if steamPath.exists():
			return steamPath.absolutePath()
		return None
	
	def find_steam_exe(self):
		""" Don't know where a typical installation path lays...
		What should work is 'open -a Steam', but that's not
		a single command and is don't know how to check
		if this WOULD work.
		
		The result should be a list object
		"""
		path = QStandardPaths.findExecutable('Steam')
		if path:
			return [path]

		# Just a guess...
		path = '/Applications/Steam.app/Contents/MacOS/Steam'
		if QFile(path).exists():
			return [path]

		return None

class SteamAppItem(AppItem):
	def __init__(self, provider, manifest, icon = None, icon_selected = None, suspended = False):
		AppItem.__init__(self, 'steam_' + manifest['appid'], manifest['name'], provider.find_icon(manifest), icon_selected, suspended)
		self._appid = manifest['appid']
		self._provider = provider
		self.categories = ['Steam App']

		cmd = self._provider.find_steam_exe()
		if cmd:
			cmd.append('steam://rungameid/%s' % (self._appid))
			self.cmd = cmd

	def execute(self):
		""" Kills any existing steam instance. Otherwise we would not be
		able to do process control on the current application.
		"""
		procs = []
		for proc in psutil.process_iter():
			if proc.name().lower().find('steam') == 0:
				LOGGER.info('Terminating Steam process %s (%d)' % (proc.name(), proc.pid))
				killed_steam=True
				proc.terminate()
				procs.append(proc)
		if len(procs) > 0:
			# Wait a few seconds...
			psutil.wait_procs(procs, timeout=5)
		return AppItem.execute(self)
	
class SteamProvider(AppProvider):
	def __init__(self, settings):
		AppProvider.__init__(self, settings)
		# Find platform dependent implementation
		system = platform.system()
		if system == 'Linux':
			self.platform = SteamPlatformLinux()
		elif system == 'Darwin':
			self.platform = SteamPlatformOSX()
		elif system == 'Windows':
			self.platform = SteamPlatformWindows()
		else:
			LOGGER.warn('Failed to identify platform: ' + system)
			self.platform = SteamPlatformGeneric()

		# Find plattform dependent "steamapps" path
		self.path = self.settings.get(CONF_STEAM_SECTION, CONF_STEAM_STEAMAPPS)
		if not self.path:
			self.path = self.platform.steamapps_path()

	def get_apps(self):
		""" Returns a SteamAppItem instance for each installed app """
		apps = []
		if self.settings.getboolean(CONF_STEAM_SECTION, CONF_STEAM_ENABLED, True):
			for manifest in self.list_installed_app_manifests():
				apps.append(SteamAppItem(self, manifest))
		return apps

	def find_icon(self, appid):
		""" Tries to locate the application icon (in maximal resolution)
		for a given app id. This is platform dependent.
		"""
		if isinstance(appid, dict):
			appid = appid.get('appid')
		if appid:
			# Better safe than sorry...
			appid = str(int(appid))
			icon = self.platform.find_app_icon(appid)
			if not icon:
				# Download from steam network
				icon = self.find_icon_url(appid)
			return icon

		return None

	def find_steam_exe(self):
		""" Tries to locate the steam executable. This depends on the platform. """
		path = self.settings.getlist(CONF_STEAM_SECTION, CONF_STEAM_EXECUTABLE)
		if path is None:
			path = self.platform.find_steam_exe()
		return path

	def find_icon_url(self, appid):
		""" Retuns a URL where an icon may be available at """
		if isinstance(appid, dict):
			appid = appid.get('appid')
		# From https://steamdb.info/app/APPID/info/
		appid = str(int(appid))
		return 'https://steamcdn-a.akamaihd.net/steam/apps/' + appid + '/header.jpg'

	def list_all_app_manifests(self):
		"""Parses all .acf-Files in steamapps directory. ACF files
		are similar to JSON files, to I'm just change the syntax
		and use python's json_decode for parsing.
		
		Example:
			"AppState"
			{
				"appid"		"1234"
				"section"
				{
					"key1"		"value1"
					"key2"		"value2"
				}
			}
		
		Will be transformed to:
			{
				"appid": "1234",
				"section": {
					"key1": "value1",
					"key2": "value2"
				}
			}
		"""
		path = QDir(self.path)
		if path is None:
			LOGGER.warn('No "steamapps" directory configured')
			return []

		if not path.exists():
			LOGGER.warn('Directory not found: steamapps="%s"', path.absolutePath())
			return []

		manifests = []
		for fname in path.entryList(['*.acf']):
			fname = QDir.toNativeSeparators(self.path + "/" + fname)
			with open(fname) as f:
				json_contents = '{'
				level = 1;
				comma = ''
				for line in f:
					line = line.strip()
					if line == '{':
						json_contents += ": {\n"
						comma = ''
						level += 1
					elif line == '}':
						level -= 1
						json_contents += "\n" + ("\t" * level) + "} "
						comma = ','
					else:
						tabIndex = line.find("\"\t")
						if tabIndex > 0:
							line = line[:tabIndex+1] + ':' + line[tabIndex+2:]
						json_contents += comma + "\n" + ("\t" * level) + line
						comma = ','
				json_contents += "\n}"
				try:
					data = json.loads(json_contents)
					if data:
						appState = data.get('AppState')
						if appState:
							manifests.append(appState)
				except json.decoder.JSONDecodeError as e:
					LOGGER.warn("Failed to parse app manifest at " + fname + ": " + str(e))
		return manifests
	
	def list_installed_app_manifests(self):
		""" List all manifests from apps that seem to be installed. """
		manifests = self.list_all_app_manifests()
		installed = []
		for app in manifests:
			install_dir = app.get('installdir')
			if install_dir:
				install_dir = QDir(self.path + '/common/' + install_dir)
				if install_dir.exists():
					installed.append(app)
		return installed

#  vim: set fenc=utf-8 ts=4 sw=4 noet :
