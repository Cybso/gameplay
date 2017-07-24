###
# Provides access to the system apps (global .desktop files for Linux,
# Start Menu on windows.
# FIXME Implement Windows
# FIXME Implement OSX
###

import platform
from gameplay.AppProvider import AppProvider, AppItem

system = platform.system()
if system == 'Linux':
	from .DesktopEntryProvider import DesktopEntryProvider
	from PyQt5.QtCore import QDir, QStandardPaths

	class SystemAppProvider(DesktopEntryProvider):
		def __init__(self, settings):
			DesktopEntryProvider.__init__(self, settings, [QDir.toNativeSeparators(x) for x in QStandardPaths.standardLocations(QStandardPaths.ApplicationsLocation)])

		def filter_category(self, categories):
			for c in ['WebBrowser', 'Game', 'TV']:
				if c in categories:
					return True
			return False

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

