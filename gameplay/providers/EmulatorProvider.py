###
# Reads the 'emulators.ini' from application data directory
# searches for emulator entries.
# FIXME Add documentation
###

# wit:
#   wit list --sections -r SOURCE
# Images:
# http://art.gametdb.com/wii/cover/EN/GM4P01.png
# http://art.gametdb.com/wii/coverfullHQ/EN/SB4P01.png

import os
import sys
import platform
import logging
import configparser
import subprocess
import fnmatch
import hashlib
from PyQt5.QtCore import *

from gameplay.AppProvider import AppProvider, AppItem
from gameplay.GamePlayConfig import GamePlayConfig

LOGGER = logging.getLogger(__name__)
CONF_EMULATOR_SECTION='providers/emulator'
CONF_EMULATOR_ENABLED='enabled'

###
# Uses the basename (without suffix and underscores
# replaced with spaces) for 'name'. If a .png, .jpg,
# .jpeg or .gif file exists next to the basename this
# is returned as icon.
###
def filename_image_info_handler(path):
	info = QFileInfo(path)
	basename = info.completeBaseName()
	abspath = info.absolutePath()
	icon = None
	for suffix in ['jpeg', 'JPEG', 'jpg', 'JPG', 'png', 'PNG', 'apng', 'APNG', 'gif', 'GIF']:
		if QFile(abspath + '/' + basename + '.' + suffix).exists():
			icon = abspath + os.sep + basename + '.' + suffix
			break
	if icon is None:
		# Try short basename instead of long one, if the filename has multiple suffixes
		basename2 = info.baseName()
		if basename2 != basename:
			for suffix in ['jpeg', 'JPEG', 'jpg', 'JPG', 'png', 'PNG', 'apng', 'APNG', 'gif', 'GIF']:
				if QFile(abspath + basename2 + '.' + suffix).exists():
					icon = abspath + basename2 + '.' + suffix
					basename = basename2
					break
	
	return (basename.replace('_', ' '), icon)

###
# Uses the program 'wit' (http://wit.wiimm.de/) to extract
# the disc label from the image. If there is a .png, .jpeg,
# .jpg or .gif file next to the images basename it is
# returned as icon. Otherwise the URL
# http://art.gametdb.com/wii/cover/EN/{DISID}.png
# is returned as a placeholder.
# If 'wit' is not available or fails this falls back
# to the filename_image_info_handler.
###
def wit_image_info_handler(path):
	# Fetch fallback data, first
	(label, icon) = filename_image_info_handler(path)
	if wit_image_info_handler.executable is None:
		# Try to locate wit executable
		wit_image_info_handler.executable = QStandardPaths.findExecutable('wit')
		if not wit_image_info_handler.executable:
			wit_image_info_handler.executable = QStandardPaths.findExecutable('wit.exe')
			if not wit_image_info_handler.executable:
				wit_image_info_handler.executable = False
	
	if wit_image_info_handler.executable:
		discid=None
		cmd = [wit_image_info_handler.executable, 'list', '--sections', path]
		try:
			p = subprocess.run(cmd, stdout=subprocess.PIPE)
			conf = configparser.ConfigParser()
			conf.read_string(p.stdout.decode('UTF-8'))
			if conf.has_section('disc-0'):
				if conf.has_option('disc-0', 'id'):
					discid = conf.get('disc-0', 'id')
				if conf.has_option('disc-0', 'name'):
					label = conf.get('disc-0', 'name')
				if conf.has_option('disc-0', 'title'):
					# Better than 'name'
					label = conf.get('disc-0', 'title')
				if conf.has_option('disc-0', 'disctype'):
					disctype = conf.get('disc-0', 'disctype')
					(disctype, disctypename) = disctype.split(' ', 1)
					if disctypename:
						label += ' [' + disctypename + ']'
		except:
			LOGGER.exception("Failed to execute %s" % ' '.join(cmd))
		if not icon:
			if discid:
				icon = 'http://art.gametdb.com/wii/cover/EN/' + discid + '.png'

	return (label, icon)
wit_image_info_handler.executable=None

class Emulator:
	def __init__(self, config, section):
		self.label = config.get(section, 'label', section)
		self.command = config.getlist(section, 'command', None)
		self.icon = config.get(section, 'icon', None)
		self.image_path = config.getlist(section, 'image-path', [])
		self.image_pattern = config.getlist(section, 'image-pattern', [])
		image_info_handler = config.get(section, 'image-info-handler', None)
		if image_info_handler == 'wit':
			self.image_info_handler = wit_image_info_handler
		elif image_info_handler == 'filename':
			self.image_info_handler = filename_image_info_handler
		else:
			self.image_info_handler = filename_image_info_handler
	
	def get_apps(self):
		files=[]
		for path in  self.image_path:
			path=os.path.expanduser(path)
			for root, dirnames, filenames in os.walk(path):
				for pattern in self.image_pattern:
					for filename in fnmatch.filter(filenames, pattern):
						files.append(os.path.join(root, filename))

		apps = []
		for f in files:
			(label, icon) = self.image_info_handler(f)
			sha_1 = hashlib.sha1()
			sha_1.update(f.encode('utf-16be'))
			id = sha_1.hexdigest()

			# Build command...
			has_placeholder = False
			cmd = []
			for part in self.command:
				if part.find('%s') >= 0:
					part = part.replace('%s', f)
					has_placeholder = True
				cmd.append(part)
			if not has_placeholder:
				cmd.append(f)

			if not icon:
				icon = self.icon

			apps.append(AppItem(id, label, icon, cmd=cmd))

		return apps

class EmulatorProvider(AppProvider):
	def __init__(self, settings):
		AppProvider.__init__(self, settings)

		# Load 'emulators.ini'
		self.emulators = []
		emulatorIni = GamePlayConfig('emulators.ini')
		for section in emulatorIni.sections():
			try:
				LOGGER.info('Loading emulator configuration for "%s"' % section)
				self.emulators.append(Emulator(emulatorIni, section))
			except:
				LOGGER.exception('Failed to load config for emulator entry "%s"' % section)

	###
	# Returns a EmulatorAppItem instance for each installed app
	###
	def get_apps(self):
		apps = []
		for emulator in self.emulators:
			apps += emulator.get_apps()
		return apps

#  vim: set fenc=utf-8 ts=4 sw=4 noet :
