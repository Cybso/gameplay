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

class FrontendWebPage(QWebPage):
	def javaScriptConsoleMessage(self, msg, line, source):
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

if __name__ == "__main__":
	import sys
	import argparse

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


	# Start application
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
