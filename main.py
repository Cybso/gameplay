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
import sys
import importlib

# Requires at least Python 3.4
if sys.version_info < (3,4):
	sys.stderr.write("This program requires at least Python 3.4, found version %d.%d.%d%s" % (
		sys.version_info[0], sys.version_info[1], sys.version_info[2], os.linesep
	))
	sys.exit(1)

# Check for PyQt5 before loading it to create a nice error message if this is missing
spec = importlib.util.find_spec("PyQt5")
if importlib.util.find_spec("PyQt5") is None:
	sys.stderr.write("Module PyQt5 not found. Maybe you need to install 'python3-pyqt5'.%s" % os.linesep)
	sys.exit(1)

if importlib.util.find_spec("PyQt5.QtQml") is None:
	sys.stderr.write("Module PyQt5.QtQml not found. Maybe you need to install 'python3-pyqt5.qtquick'.%s" % os.linesep)
	sys.exit(1)



import argparse
import signal
import logging

from PyQt5.QtCore import QDir, QStandardPaths
from PyQt5.QtWidgets import QApplication
from PyQt5.QtGui import QIcon
from PyQt5.QtWebKit import QWebSettings

# Automatically convert between python strings and QString
import sip
sip.setapi('QString', 2)

#APPDATA_PATHS = [QDir.toNativeSeparators(x + 'yagala/') for x in QStandardPaths.locateAll(QStandardPaths.AppDataLocation, "", QStandardPaths.LocateDirectory)]
#APPLICATION_PATHS = QStandardPaths.locateAll(QStandardPaths.ApplicationsLocation, "", QStandardPaths.LocateDirectory)

# Force usage of IniFile since this application should be portable 
#settings = QtCore.QSettings(CONFIG_PATH, QSettings.IniFormat)
#print(settings.value('yagala/foo'))
#settings.setValue('yagala/foo', 'bar')
#settings.sync()


def main():
	uipath=QDir.fromNativeSeparators(os.path.dirname(os.path.abspath(__file__))) + '/ui/'

	# Define and parse program arguments
	parser = argparse.ArgumentParser()
	parser.add_argument("-v", "--verbose", help="be verbose", action="store_true")
	parser.add_argument("-d", "--debug", help="be even verboser", action="store_true")
	parser.add_argument("-f", "--fullscreen", help="start in fullscreen mode", action="store_true")
	args = parser.parse_args()

	# This must be configured before any logger is initialized
	if args.debug:
		logging.basicConfig(stream=sys.stdout, level=logging.DEBUG)
	elif args.verbose:
		logging.basicConfig(stream=sys.stdout, level=logging.INFO)
	else:
		logging.basicConfig(stream=sys.stdout, level=logging.WARN)

	# This must be imported AFTER logging has been configured!
	from yagala import Yagala
	from yagala import Frontend

	# Start application (and ensure it can be killed with CTRL-C)
	signal.signal(signal.SIGINT, signal.SIG_DFL)
	app = QApplication(sys.argv)
	app.setApplicationName('yagala')
	app.setWindowIcon(QIcon(uipath + 'img/Y.svg'))
	yagala = Yagala()

	# Enable developer console
	QWebSettings.globalSettings().setAttribute(QWebSettings.DeveloperExtrasEnabled, True)

	# Initialize frontend
	frontend = Frontend(uipath, yagala)
	if args.fullscreen:
		frontend.showFullScreen()
	else:
		frontend.show()

	sys.exit(app.exec_())

if __name__ == "__main__":
	main()

#  vim: set fenc=utf-8 ts=4 sw=4 noet :
