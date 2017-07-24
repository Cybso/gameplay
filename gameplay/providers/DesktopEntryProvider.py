###
# Parse .desktop entries from the following locations:
#   - Program directory
#   - AppData directory
###

import os
import sys
import configparser
import shlex
import re

from gameplay.AppProvider import AppProvider, AppItem
from PyQt5.QtCore import QDir, QStandardPaths

class DesktopEntryProvider(AppProvider):
	def __init__(self, settings, sources=None):
		AppProvider.__init__(self, settings)
		if sources is None:
			self.sources = [QDir.toNativeSeparators(x + '/applications') for x in QStandardPaths.standardLocations(QStandardPaths.AppDataLocation)]
			self.sources.insert(0, os.path.dirname(sys.argv[0]) + os.sep + 'applications')
		else:
			self.sources = sources
	
	###
	# This can be overwritten to filter apps
	# by their categories.
	###
	def filter_category(self, categories):
		return True
	
	###
	# Returns a list of all identified .desktop files.
	# The name of earch file must be unique.
	###
	def find_desktop_files(self):
		filesByName = {}
		for source in self.sources:
			for root, dirnames, filenames in os.walk(source):
				for filename in filenames:
					if filesByName.get(filename) is None and filename.endswith('.desktop'):
						filesByName[filename] = root + os.sep + filename
		return list(filesByName.values())
	
	###
	# Parses a .desktop file using configparser
	###
	def parse_file(self, f):
		cfg = configparser.ConfigParser()
		cfg.read_file(open(f))
		if cfg.has_section('Desktop Entry'):
			apptype = cfg.get('Desktop Entry', 'Type', fallback=None, raw=True)
			if apptype is None or apptype == 'Application':
				name = cfg.get('Desktop Entry', 'Name', fallback=None, raw=True)
				cmd = cfg.get('Desktop Entry', 'Exec', fallback=None, raw=True)
				if cmd and name:
					icon = cfg.get('Desktop Entry', 'Icon', fallback=None, raw=True)
					categories = cfg.get('Desktop Entry', 'Categories', fallback='', raw=True).split(';')

				if cfg.has_section('Desktop Action Fullscreen'):
					cmd = cfg.get('Desktop Action Fullscreen', 'Exec', fallback=cmd, raw=True)

				# Remove field codes from command, we do not have them
				# https://standards.freedesktop.org/desktop-entry-spec/desktop-entry-spec-latest.html#exec-variables
				if cmd.find('%') >= 0:
					cmd = re.sub(r'%%', '%', re.sub(r'%[^%]', '', cmd))
				cmd = shlex.split(cmd)

				if icon:
					icon = 'icon://' + icon

				if self.filter_category(categories):
					return AppItem(os.path.basename(f), name, icon=icon, cmd=cmd, categories=categories)
		return None
	
	def get_apps(self):
		apps = []
		for f in self.find_desktop_files():
			app = self.parse_file(f)
			if app is not None:
				apps.append(app)
		return apps

#  vim: set fenc=utf-8 ts=4 sw=4 noet :

