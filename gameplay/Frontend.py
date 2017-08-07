#!/usr/bin/env python3
"""Game✜Play - Yet Another Gamepad Launcher

A Python and PyQt5 based application launcher that uses
HTML5's gamepad API to implement a platform independent
UI that can be controlled via keyboard, mouse and 
gamepad/joystick.

Author: Roland Tapken <roland@bitarbeiter.net>
License: GPLv3
"""

import os
import sys
import logging

from PyQt5.QtGui import QKeySequence
from PyQt5.QtCore import Qt, QEvent, QUrl
from PyQt5.QtWidgets import QSplitter, QAction, QSizePolicy, QShortcut, QMessageBox, QApplication, QWidget, QMainWindow

LOGGER = logging.getLogger(__name__)

class Frontend(QMainWindow):
	""" HTML5/JavaScript based application frontend """

	def __init__(self, args, gameplay):
		super(Frontend, self).__init__()
		self.gameplay = gameplay
		self.gameplay.window = self
		self.setWindowTitle('GamePlay')
		self.webkit = args.engine == 'webkit'
		if self.webkit:
			from .platform.WebkitWebView import WebView, Inspector
		else:
			from .platform.WebengineWebView import WebView, Inspector

		self.web = WebView(self, gameplay, args)
		self.inspector = Inspector(self, self.web)
		self.inspector.setVisible(False)
		QShortcut(QKeySequence("F12"), self.web, self.toggleWebInspector)

		# And put both into a splitter
		self.splitter = QSplitter(self)
		self.splitter.setOrientation(Qt.Vertical)
		self.splitter.addWidget(self.web)
		self.splitter.addWidget(self.inspector)
		self.setCentralWidget(self.splitter)

		# Intercept local protocols
		self.web.load(QUrl.fromLocalFile(args.docroot + 'index.html'))

		self._currentVisibilityState = None
		self.updateVisibilityState();

		# Add toolbar (after QWebView has been initialized)
		self.create_toolbar()

		# Add a flag that controls whether close() must be confirmed
		self.confirmClose = True

		# Add global shortcuts
		QShortcut(QKeySequence("Ctrl+Q"), self.web, self.close)
		QShortcut(QKeySequence("Alt+F4"), self.web, self.close)
		QShortcut(QKeySequence("Ctrl+R"), self.web, self.forceRefresh)
		QShortcut(QKeySequence("ALT+F5"), self.web, self.forceRefresh)
		QShortcut(QKeySequence("F11"), self.web, self.toggleFullscreen)

		#  Hide toolbar and  per default
		self.toolbar.setVisible(False)

		# Get initial window state
		self._lastWindowState = self.windowState()
	
	def forceRefresh(self):
		""" reloadAndBypassCache has been implemented use that,
		Otherwise, try to clear the cache first (WebKit only)
		and just execute a normal reload.
		"""
		if hasattr(self.web, 'reloadAndBypassCache'):
			self.web.reloadAndBypassCache()
		else:
			if hasattr(self.web.page().settings(), 'clearMemoryCaches'):
				self.web.page().settings().clearMemoryCaches()
			self.web.reload()

	def toggleFullscreen(self):
		""" Toggles fullscreen mode (F11)"""

		if self.windowState() == Qt.WindowFullScreen:
			if self._lastWindowState:
				self.setWindowState(self._lastWindowState)
			else:
				self.setWindowState(Qt.WindowNoState)
		else:
			self._lastWindowState = self.windowState()
			self.setWindowState(Qt.WindowFullScreen)

	def create_toolbar(self):
		""" Creates a toolbar that is visible in developer mode (F12) """

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



	def toggleWebInspector(self):
		self.inspector.setVisible(not self.inspector.isVisible())
		self.toolbar.setVisible(self.inspector.isVisible())


	def changeEvent(self, event):
		eventType = event.type();
		if eventType == QEvent.WindowStateChange:
			self.updateVisibilityState()
		if eventType == QEvent.ActivationChange:
			self.updateVisibilityState()
	
	def updateVisibilityState(self):
		""" Updates webkit visibility state when the window is either
		minimized or not the active window. This temporary disables
		the gamepadLoop.
		"""
		if self._currentVisibilityState is None and not self.isVisible():
			# Not ready, yet
			return

		hidden = False
		if self.windowState() & Qt.WindowMinimized:
			hidden = True
		if not self.isActiveWindow():
			state = False
			hidden = True
		if self._currentVisibilityState != hidden:
			self._currentVisibilityState = hidden
			self.web.page().setHidden(hidden)

	def closeEvent(self, event):
		"""Print an 'Are you sure' message when the user closes the window
		and quit the whole application on confirmation.
		"""
		if self.confirmClose and QMessageBox.question(None, '', "Are you sure you want to quit?",
				QMessageBox.Yes | QMessageBox.No,
				QMessageBox.No) == QMessageBox.No:
			event.ignore() 
			return
		sys.exit(0)
		#QApplication.quit()

#  vim: set fenc=utf-8 ts=4 sw=4 noet :
