#!/usr/bin/env python3
###
# Game:Play - Yet Another Gamepad Launcher
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

QTWEBENGINE_REMOTE_DEBUGGING_PORT='26512'
LOGGER = logging.getLogger(__name__)

###
# HTML5/JavaScript based application frontend
###
class Frontend(QMainWindow):
	def __init__(self, args, basepath, gameplay):
		super(Frontend, self).__init__()
		self.basepath = basepath
		self.gameplay = gameplay
		self.gameplay.window = self
		self.setWindowTitle('GamePlay')
		self.webkit = args.engine == 'webkit'
		if self.webkit:
			from PyQt5.QtWebKitWidgets import QWebView, QWebPage, QWebInspector
			from PyQt5.QtWebKit import QWebSettings
			from .FrontendWebPage import FrontendWebPage
			QWebSettings.globalSettings().setAttribute(QWebSettings.DeveloperExtrasEnabled, True)
			self.web = QWebView(self)
			self.web.setPage(FrontendWebPage())
			self.frame = self.web.page().mainFrame()
			self.frame.javaScriptWindowObjectCleared.connect(self.load_api)

			# Add inspector
			self.inspector = QWebInspector(self)
			self.inspector.setPage(self.web.page())
			self.inspector.setVisible(False)
			QShortcut(QKeySequence("F12"), self.web, self.toggleWebInspector)

			# And put both into a splitter
			self.splitter = QSplitter(self)
			self.splitter.setOrientation(Qt.Vertical)
			self.splitter.addWidget(self.web)
			self.splitter.addWidget(self.inspector)
			self.setCentralWidget(self.splitter)
		else:
			if args.debug:
				LOGGER.warn("QTWEBENGINE_REMOTE_DEBUGGING enabled on port http://localhost:%s/. This may be a security issue. Remove '-d/--debug' for production environments." % (QTWEBENGINE_REMOTE_DEBUGGING_PORT))
				os.environ['QTWEBENGINE_REMOTE_DEBUGGING'] = QTWEBENGINE_REMOTE_DEBUGGING_PORT;
			# WebEngine does not have a WebInspector component
			from PyQt5.QtWebEngineWidgets import QWebEngineView, QWebEnginePage
			from PyQt5.QtWebChannel import QWebChannel
			from .FrontendWebPage import FrontendWebEnginePage
			self.web = QWebEngineView(self)
			page = FrontendWebEnginePage(self)
			self.web.setPage(page)
			channel = QWebChannel(page);
			page.setWebChannel(channel);
			channel.registerObject("gameplay", gameplay);

			# Add inspector
			self.inspector = QWebEngineView(self)
			self.inspector.load(QUrl('http://localhost:' + QTWEBENGINE_REMOTE_DEBUGGING_PORT))
			self.inspector.setVisible(False)
			QShortcut(QKeySequence("F12"), self.web, self.toggleWebInspector)

			# And put both into a splitter
			self.splitter = QSplitter(self)
			self.splitter.setOrientation(Qt.Vertical)
			self.splitter.addWidget(self.web)
			self.splitter.addWidget(self.inspector)
			self.setCentralWidget(self.splitter)

		# Intercept local protocols
		self.web.load(QUrl.fromLocalFile(basepath + 'index.html'))

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
		# TODO
		if hasattr(self.web, 'reloadAndBypassCache'):
			self.web.reloadAndBypassCache()
		else:
			if hasattr(self.web.page().settings(), 'clearMemoryCaches'):
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
	# Add 'gameplay' controller to JavaScript context when the frame is loaded.
	# Due to security reasons ensure that the URL is local and a child of
	# our own base path.
	###
	def load_api(self):
		url = self.frame.url()
		if url.isLocalFile():
			if os.path.abspath(url.path()).startswith(self.basepath):
				LOGGER.info('Adding GamePlay controller to %s' % url)
				self.frame.addToJavaScriptWindowObject('gameplay', self.gameplay)
	
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
		if self._currentVisibilityState is None and not self.isVisible():
			# Not ready, yet
			return

		if self.webkit:
			from PyQt5.QtWebKitWidgets import QWebPage
			state = QWebPage.VisibilityStateVisible
			if self.windowState() & Qt.WindowMinimized:
				state = QWebPage.VisibilityStateHidden
			if not self.isActiveWindow():
				state = QWebPage.VisibilityStateHidden
			if self._currentVisibilityState != state:
				self._currentVisibilityState = state
				self.web.page().setVisibilityState(state)
		else:
			state = True
			if self.windowState() & Qt.WindowMinimized:
				state = False
			if not self.isActiveWindow():
				state = False
			if self._currentVisibilityState != state:
				self._currentVisibilityState = state
				self.web.page().setVisibilityState(state)


			#	self.web.page().view().setVisible(state)

	###
	# Print an 'Are you sure' message when the user closes the window
	# and quit the whole application on confirmation.
	###
	def closeEvent(self, event):
		if self.confirmClose and QMessageBox.question(None, '', "Are you sure you want to quit?",
				QMessageBox.Yes | QMessageBox.No,
				QMessageBox.No) == QMessageBox.No:
			event.ignore()
			return
		QApplication.quit()

#  vim: set fenc=utf-8 ts=4 sw=4 noet :
