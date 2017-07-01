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
import logging
import json

# Automatically convert between python strings and QString
import sip
sip.setapi('QString', 2)

from PyQt5 import QtCore, QtGui, QtWidgets
from PyQt5.QtCore import *
from PyQt5.QtGui import *
from PyQt5.QtWidgets import *
from PyQt5.QtWebKit import *
from PyQt5.QtWebKitWidgets import *
from PyQt5.QtWidgets import QApplication, QWidget, QMainWindow

LOGGER = logging.getLogger('main.py')

class Yagala(QObject):

	@pyqtSlot(int, result=str)
	def foo(self, value):
		return '=' + str(value) + '='

	# take a list of strings and return a string
	# because of setapi line above, we get a list of python strings as input
	@pyqtSlot('QStringList', result=str)
	def concat(self, strlist):
		return ''.join(strlist)

	# take a javascript object and return string
	# javascript objects come into python as dictionaries
	# functions are represented by an empty dictionary
	@pyqtSlot('QVariantMap', result=str)
	def json_encode(self, jsobj):
		# import is here to keep it separate from 'required' import
		return json.dumps(jsobj)

	# take a string and return an object (which is represented in python
	# by a dictionary
	@pyqtSlot(str, result='QVariantMap')
	def json_decode(self, jsstr):
		return json.loads(jsstr)

###
# Override QWebPage to redirect JavaScript console output
# to logger (level 'info'). If the output starts with 'debug',
# 'warn', 'error' or 'exception' the appropirate level is
# choosen instead.
###
class FrontendWebPage(QWebPage):
	def javaScriptConsoleMessage(self, msg, line, source):
		if msg.startswith('debug'):
			LOGGER.debug('%s line %d: %s' % (source, line, msg))
		elif msg.startswith('warn'):
			LOGGER.warn('%s line %d: %s' % (source, line, msg))
		elif msg.startswith('error') or msg.startswith('exception'):
			LOGGER.error('%s line %d: %s' % (source, line, msg))
		else:
			LOGGER.info('%s line %d: %s' % (source, line, msg))

class Frontend(QWebView):
	def __init__(self, yagala):
		super(Frontend, self).__init__()
		self.yagala = yagala
		self.setPage(FrontendWebPage())
		self.setWindowTitle('Yagala')
		self.load(QUrl.fromLocalFile(uipath + 'index.html'))
		
		# get the main frame of the view so that we can load the api each time
		# the window object is cleared
		self.frame = self.page().mainFrame()
		self.frame.javaScriptWindowObjectCleared.connect(self.load_api)

	# event handler for javascript window object being cleared
	def load_api(self):
		# add pyapi to javascript window object
		# slots can be accessed in either of the following ways -
		#   1.  var obj = window.pyapi.json_decode(json);
		#   2.  var obj = pyapi.json_decode(json)
		self.frame.addToJavaScriptWindowObject('yagala', self.yagala)

	###
	# Print an 'Are you sure' message when the user closes the window
	# and quit the whole application on confirmation.
	###
	def closeEvent(self, event):
		if QMessageBox.question(None, '', "Are you sure you want to quit?",
				QMessageBox.Yes | QMessageBox.No,
				QMessageBox.No) == QMessageBox.No:
			event.ignore()
			return
		QApplication.quit()

if __name__ == "__main__":
	import sys
	import argparse
	import signal

	logging.basicConfig(stream=sys.stdout, level=logging.WARN)
	uipath=os.path.dirname(os.path.abspath(__file__)) + os.sep + 'ui' + os.sep

	# Define and parse program arguments
	parser = argparse.ArgumentParser()
	parser.add_argument("-v", "--verbose", help="be verbose", action="store_true")
	parser.add_argument("-d", "--debug", help="be even verboser", action="store_true")
	parser.add_argument("--console", help="Enable developer console", action="store_true")
	args = parser.parse_args()

	if args.verbose:
		LOGGER.setLevel(logging.INFO)

	if args.debug:
		LOGGER.setLevel(logging.DEBUG)
		LOGGER.debug('Debugging enabled')

	# Start application (and ensure it can be killed with CTRL-C)
	signal.signal(signal.SIGINT, signal.SIG_DFL)
	app = QApplication(sys.argv)
	yagala = Yagala()

	if args.console:
		LOGGER.info('Development console enabled')
		QWebSettings.globalSettings().setAttribute(QWebSettings.DeveloperExtrasEnabled, True)

	frontend = Frontend(yagala)
	frontend.show()

	if args.console:
		inspect = QWebInspector()
		inspect.setPage(frontend.page())
		inspect.show()

	sys.exit(app.exec_())

#  vim: set fenc=utf-8 ts=4 sw=4 noet :
