###
# Encapsulates ConfigParser to read configs from
# multiple sources but writes (modified) values
# to a single destination only.
#
# This is intended to be used for global and local settings.
#
# The paths are requested from QStandardPaths.writableLocation(QStandardPaths.AppConfigLocation)
# and QStandardPaths.standardLocations(QStandardPaths.AppConfigLocation), suffixed with
# the given filename.
#
# This does not use QSettings since this interprets entries as list if a comma is
# found within them.
#
# remove_section and remove_option are not supported since the global files would not
# be writable and thus these options might still exists on the next run.
#
# In contrast to ConfigParser this doesn't throw an exception on get/set if a
# section does not exists.
###

import os
import configparser
import shlex
import logging

from PyQt5.QtCore import QStandardPaths, QDir

LOGGER = logging.getLogger(__name__)

class YagalaConfig:
	def __init__(self, filename):
		self.globalConfig = configparser.ConfigParser()
		self.localConfig = configparser.ConfigParser()
		# FIXME Does QStandardPaths return native or unix paths?
		self._localFile = QStandardPaths.writableLocation(QStandardPaths.AppConfigLocation) + os.sep + filename
		for path in QStandardPaths.standardLocations(QStandardPaths.AppConfigLocation):
			filePath = path + os.sep + filename
			if os.path.exists(filePath):
				try:
					LOGGER.info('Reading global config from "%s"' % filePath)
					self.globalConfig.read(open(filePath))
				except:
					LOGGER.exception('Failed to parse config from "%s"' % filePath)
		if os.path.exists(self._localFile):
			try:
				LOGGER.info('Reading local config from "%s"' % self._localFile)
				self.globalConfig.read_file(open(self._localFile))
				self.localConfig.read_file(open(self._localFile))
			except:
				LOGGER.exception('Failed to parse config from "%s"' % self._localFile)
	
	def sections(self):
		first_list = self.globalConfig.sections()
		second_list = self.localConfig.sections()
		return first_list + list(set(second_list) - set(first_list))

	def has_section(self, section):
		return self.localConfig.has_section(section) or self.globalConfig.has_section(section)

	def add_section(self, section):
		return self.localConfig.add_section(section)

	def options(self, section):
		first_list = self.globalConfig.options(section)
		second_list = self.localConfig.options(section)
		return list(set(second_list) - set(first_list))

	def has_option(self, section, option):
		return self.localConfig.has_option(section, option) or self.globalConfig.has_option(section, option)

	def get(self, section, option, fallback=None):
		value = None
		if self.localConfig.has_section(section):
			if self.localConfig.has_option(section, option):
				value = self.localConfig.get(section, option, raw=True)
		if value is None:
			if self.globalConfig.has_section(section):
				if self.globalConfig.has_option(section, option):
					value = self.globalConfig.get(section, option, raw=True)
		if value is None:
			value = fallback
		return value

	def getint(self, section, option, fallback=None):
		value = None
		if self.localConfig.has_section(section):
			if self.localConfig.has_option(section, option):
				value = self.localConfig.getint(section, option, raw=True)
		if value is None:
			if self.globalConfig.has_section(section):
				if self.globalConfig.has_option(section, option):
					value = self.globalConfig.getint(section, option, raw=True)
		if value is None:
			value = fallback
		return value
		

	def getfloat(self, section, option, fallback=None):
		value = None
		if self.localConfig.has_section(section):
			if self.localConfig.has_option(section, option):
				value = self.localConfig.getfloat(section, option, raw=True)
		if value is None:
			if self.globalConfig.has_section(section):
				if self.globalConfig.has_option(section, option):
					value = self.globalConfig.getfloat(section, option, raw=True)
		if value is None:
			value = fallback
		return value

	def getboolean(self, section, option, fallback=None):
		value = None
		if self.localConfig.has_section(section):
			if self.localConfig.has_option(section, option):
				value = self.localConfig.getboolean(section, option, raw=True)
		if value is None:
			if self.globalConfig.has_section(section):
				if self.globalConfig.has_option(section, option):
					value = self.globalConfig.getboolean(section, option, raw=True)
		if value is None:
			value = fallback
		return value

	###
	# Parses a value with shlex.split()
	###
	def getlist(self, section, option, fallback=None):
		value = self.get(section, option)
		if value is not None:
			return shlex.split(value)
		return fallback
	
	def set(self, section, option, value):
		if not self.localConfig.has_section(section):
			self.localConfig.add_section(section)
		self.localConfig.set(section, option, value)
	
	def write(self):
		if not os.path.exists(os.path.dirname(self._localFile)):
			os.makedirs(os.path.dirname(self._localFile))
		self.localConfig.write(open(self._localFile, 'w'))

#  vim: set fenc=utf-8 ts=4 sw=4 noet :
