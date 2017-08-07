#!/usr/bin/env python3
###
# Game✜Play - Yet Another Gamepad Launcher
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
from importlib import util

def find_preferred_engine():
	if util.find_spec("PyQt5.QtWebKit") is not None:
		return 'webkit'
	elif util.find_spec("PyQt5.QtWebEngineWidgets") is not None:
		return 'webengine'
	return None

# Requires at least Python 3.4
if sys.version_info < (3,4):
	sys.stderr.write("This program requires at least Python 3.4, found version %d.%d.%d%s" % (
		sys.version_info[0], sys.version_info[1], sys.version_info[2], os.linesep
	))
	sys.exit(1)

# Check for PyQt5 before loading it to create a nice error message if this is missing
if util.find_spec("PyQt5") is None:
	sys.stderr.write("Module PyQt5 not found. Maybe you need to install 'python3-pyqt5'.%s" % os.linesep)
	sys.exit(1)

if find_preferred_engine() is None:
	sys.stderr.write("Neither module 'PyQt5.QtWebKit' nor 'PyQt5.QtWebEngineWidgets' found. Maybe you need to install 'python3-pyqt5.qtwebkit'.%s" % os.linesep)
	sys.exit(1)

if util.find_spec("psutil") is None:
	sys.stderr.write("Module 'psutil' not found. Maybe you need to install 'python3-psutil'.%s" % os.linesep)
	sys.exit(1)

import argparse
import signal
import logging

from PyQt5.Qt import Qt
from PyQt5.QtCore import QDir, QStandardPaths
from PyQt5.QtWidgets import QApplication
from PyQt5.QtGui import QIcon

# Automatically convert between python strings and QString
import sip
sip.setapi('QString', 2)

def main():
	basepath=QDir.fromNativeSeparators(os.path.dirname(os.path.abspath(__file__))) + '/ui/'

	# Define and parse program arguments
	parser = argparse.ArgumentParser()
	parser.add_argument("-v", "--verbose", help="be verbose", action="store_true")
	parser.add_argument("-d", "--debug", help="be even verboser", action="store_true")
	parser.add_argument("-f", "--fullscreen", help="start in fullscreen mode", action="store_true")
	parser.add_argument("-s", "--stayontop", help="stay on top (while not running any apps)", action="store_true")
	parser.add_argument("-e", "--engine", help="browser engine that should be used ('webkit', 'webengine')", choices=['webkit', 'webengine'], default=find_preferred_engine())
	parser.add_argument("-r", "--docroot", help="Document root of UI files (default: %s)" % (basepath), default=basepath)
	args = parser.parse_args()

	# Ensure that the given document root ends with /
	args.docroot = os.path.abspath(args.docroot) + os.sep
	if not os.path.exists(args.docroot):
		sys.stderr.write("Document root not found: '%s'%s" % (args.docroot, os.linesep))
		sys.exit(1)

	# This must be configured before any logger is initialized
	if args.debug:
		logging.basicConfig(stream=sys.stdout, level=logging.DEBUG)
	elif args.verbose:
		logging.basicConfig(stream=sys.stdout, level=logging.INFO)
	else:
		logging.basicConfig(stream=sys.stdout, level=logging.WARN)
	
	LOGGER = logging.getLogger(__name__)

	# This must be imported AFTER logging has been configured!
	from gameplay import GamePlay
	from gameplay import Frontend

	# Start application (and ensure it can be killed with CTRL-C)
	signal.signal(signal.SIGINT, signal.SIG_DFL)
	app = QApplication(sys.argv)

	app.setApplicationName('gameplay')
	app.setWindowIcon(QIcon(args.docroot + 'img' + os.sep + 'Y.svg'))
	gameplay = GamePlay()

	# Initialize frontend
	frontend = Frontend(args, gameplay)

	if args.stayontop:
		LOGGER.info('Enable WindowStayOnTop')
		frontend.setWindowFlags(int(frontend.windowFlags()) | Qt.WindowStaysOnTopHint)

	if args.fullscreen:
		LOGGER.info('Fullscreen mode')
		frontend.showFullScreen()
	else:
		frontend.show()

	sys.exit(app.exec_())

if __name__ == "__main__":
	main()

#  vim: set fenc=utf-8 ts=4 sw=4 noet :
