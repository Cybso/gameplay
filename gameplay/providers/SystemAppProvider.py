###
# Provides access to the system apps (global .desktop files for Linux,
# Start Menu on windows).
#
# Linux:
#  SystemAppProvider parses and interprets .desktop files
#  from all paths defined by QStandardPaths::ApplicationsLocation
#  (http://doc.qt.io/qt-5/qstandardpaths.html).
#
#  The processing is done by DesktopEntryProvider (which primary
#  is used for CUSTOM .desktop files).
#
#  Only the Main Categories defined by 
#  https://standards.freedesktop.org/menu-spec/latest/apa.html
#  will be returned. Other categories will be ignored.
#  This list can be overwritten in the configuration file:
#
#    [SystemAppProvider]
#    categories=Game Video Network
#
# FIXME Implement Windows
# FIXME Implement OSX
###

import platform
from gameplay.AppProvider import AppProvider, AppItem

system = platform.system()
if system == 'Linux':
	from .DesktopEntryProvider import DesktopEntryProvider
	from PyQt5.QtCore import QDir, QStandardPaths

	# https://standards.freedesktop.org/menu-spec/latest/apa.html
	MAIN_CATEGORIES = [
		"AudioVideo",
		"Development",
		"Education",
		"Game",
		"Graphics",
		"Network",
		"Office",
		"Science",
		"Settings",
		"System",
		"Utility"
	];

	class SystemAppProvider(DesktopEntryProvider):
		def __init__(self, settings):
			DesktopEntryProvider.__init__(self, settings, [QDir.toNativeSeparators(x) for x in QStandardPaths.standardLocations(QStandardPaths.ApplicationsLocation)])

		###
		# Lists are passed by reference, so this method
		# can be used to remove all Non-Standard-Categories
		# from the list.
		###
		def filter_category(self, categories):
			keep_categories = self.settings.getlist('SystemAppProvider', 'categories', fallback=MAIN_CATEGORIES)
			# Work on a copy, because we are going to modify
			# the list while iterating it.
			for c in  categories[:]:
				if not c in keep_categories:
					categories.remove(c)
					print(categories)
			return len(categories) > 0

#elif system == 'Darwin':
#elif system == 'Windows':
else:
	###
	#  Dummy implementation
	###
	class SystemAppProvider(AppProvider):
		def __init__(self, settings):
			AppProvider.__init__(self, settings)

#  vim: set fenc=utf-8 ts=4 sw=4 noet :

