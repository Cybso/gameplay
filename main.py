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

###
# HTML5/JavaScript based application frontend
###
class Frontend(QMainWindow):
	def __init__(self, basepath, yagala):
		super(Frontend, self).__init__()
		self.basepath = basepath
		self.yagala = yagala
		self.setWindowTitle('Yagala')

		# Add web view
		self.web = QWebView(self)
		self.web.setPage(FrontendWebPage())
		self.web.load(QUrl.fromLocalFile(basepath + 'index.html'))
		self.frame = self.web.page().mainFrame()
		self.frame.javaScriptWindowObjectCleared.connect(self.load_api)

		# Add inspector
		self.inspector = QWebInspector(self)
		self.inspector.setPage(self.web.page())

		# And put both into a splitter
		self.splitter = QSplitter(self)
		self.splitter.setOrientation(Qt.Vertical)
		self.splitter.addWidget(self.web)
		self.splitter.addWidget(self.inspector)
		self.setCentralWidget(self.splitter)
		
		# Add toolbar (after QWebView has been initialized)
		self.create_toolbar()

		# Add global shortcuts
		QtWidgets.QShortcut(QtGui.QKeySequence("Ctrl+Q"), self.web, self.close)
		QtWidgets.QShortcut(QtGui.QKeySequence("Alt+F4"), self.web, self.close)
		QtWidgets.QShortcut(QtGui.QKeySequence("Ctrl+R"), self.web, self.forceRefresh)
		QtWidgets.QShortcut(QtGui.QKeySequence("ALT+F5"), self.web, self.forceRefresh)
		QtWidgets.QShortcut(QtGui.QKeySequence("F12"), self.web, self.toggleWebInspector)
		QtWidgets.QShortcut(QtGui.QKeySequence("F11"), self.web, self.toggleFullscreen)

		#  Hide toolbar and web inspector per default
		self.inspector.setVisible(False)
		self.toolbar.setVisible(False)

		# Get initial window state
		self._lastWindowState = self.windowState()
	
	def forceRefresh(self):
		self.web.page().settings().clearMemoryCaches()
		self.web.reload()
	
	###
	# Toggles fullscreen mode (F11)
	###
	def toggleFullscreen(self):
		if self.windowState() == Qt.WindowFullScreen:
			if self._lastWindowState:
				self.setWindowState(self._lastWindowState)
			else:
				self.setWindowState(Qt.WindowNoState)
		else:
			self._lastWindowState = self.windowState()
			self.setWindowState(Qt.WindowFullScreen)

	###
	# Creates a toolbar that is visible in developer mode (F12)
	###
	def create_toolbar(self):
		self.toolbar = self.addToolBar('Toolbar')

		# Add back handler
		action = QAction('Back', self)
		action.triggered.connect(self.web.back)
		self.toolbar.addAction(action)

		# Add reload handler
		action = QAction('Reload', self)
		action.setShortcut('F5')
		action.triggered.connect(self.web.reload)
		self.toolbar.addAction(action)

		# Add forward handler
		action = QAction('Forward', self)
		action.triggered.connect(self.web.forward)
		self.toolbar.addAction(action)

		# Add spacer
		spacer = QWidget()
		spacer.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Expanding);
		self.toolbar.addWidget(spacer)

		# Add exit handler
		action = QAction('Exit', self)
		action.triggered.connect(self.close)
		self.toolbar.addAction(action)


	###
	# Add 'yagala' controller to JavaScript context when the frame is loaded.
	# Due to security reasons ensure that the URL is local and a child of
	# our own base path.
	###
	def load_api(self):
		url = self.frame.url()
		if url.isLocalFile():
			if os.path.abspath(url.path()).startswith(self.basepath):
				LOGGER.info('Adding Yagala controller to %s' % url)
				self.frame.addToJavaScriptWindowObject('yagala', self.yagala)
	
	def toggleWebInspector(self):
		self.inspector.setVisible(not self.inspector.isVisible())
		self.toolbar.setVisible(self.inspector.isVisible())

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
	parser.add_argument("-f", "--fullscreen", help="start in fullscreen mode", action="store_true")
	args = parser.parse_args()

	if args.verbose:
		LOGGER.setLevel(logging.INFO)

	if args.debug:
		LOGGER.setLevel(logging.DEBUG)
		LOGGER.debug('Debugging enabled')

	# Start application (and ensure it can be killed with CTRL-C)
	signal.signal(signal.SIGINT, signal.SIG_DFL)
	app = QApplication(sys.argv)
	app.setWindowIcon(QIcon('ui/img/Y.svg'))
	yagala = Yagala()

	QWebSettings.globalSettings().setAttribute(QWebSettings.DeveloperExtrasEnabled, True)

	frontend = Frontend(uipath, yagala)
	if args.fullscreen:
		frontend.showFullScreen()
	else:
		frontend.show()

	sys.exit(app.exec_())

#  vim: set fenc=utf-8 ts=4 sw=4 noet :
