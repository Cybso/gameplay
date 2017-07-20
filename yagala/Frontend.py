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

from PyQt5.QtGui import QKeySequence
from PyQt5.QtCore import Qt, QEvent, QUrl
from PyQt5.QtWidgets import QSplitter, QAction, QSizePolicy, QShortcut, QMessageBox, QApplication, QWidget, QMainWindow
from PyQt5.QtWebKitWidgets import QWebView, QWebPage, QWebInspector

from .FrontendWebPage import FrontendWebPage

LOGGER = logging.getLogger(__name__)

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

		self._currentVisibilityState = None
		self.updateVisibilityState();

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
		QShortcut(QKeySequence("Ctrl+Q"), self.web, self.close)
		QShortcut(QKeySequence("Alt+F4"), self.web, self.close)
		QShortcut(QKeySequence("Ctrl+R"), self.web, self.forceRefresh)
		QShortcut(QKeySequence("ALT+F5"), self.web, self.forceRefresh)
		QShortcut(QKeySequence("F12"), self.web, self.toggleWebInspector)
		QShortcut(QKeySequence("F11"), self.web, self.toggleFullscreen)

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


	def changeEvent(self, event):
		eventType = event.type();
		if eventType == QEvent.WindowStateChange:
			self.updateVisibilityState()
		if eventType == QEvent.ActivationChange:
			self.updateVisibilityState()
	
	###
	# Updates webkit visibility state when the window is either
	# minimized or not the active window. This temporary disables
	# the gamepadLoop.
	###
	def updateVisibilityState(self):
		state = QWebPage.VisibilityStateVisible
		if self.windowState() & Qt.WindowMinimized:
			state = QWebPage.VisibilityStateHidden
		if not self.isActiveWindow():
			state = QWebPage.VisibilityStateHidden
		if self._currentVisibilityState != state:
			self._currentVisibilityState = state
			self.web.page().setVisibilityState(state)

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

#  vim: set fenc=utf-8 ts=4 sw=4 noet :
