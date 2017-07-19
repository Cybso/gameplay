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
import inspect
import pkgutil

from PyQt5.QtCore import QObject, pyqtSlot

###
# Import finder modules
###
#from .finders import common
#import yagala.finders.Steam
from .AppFinder import AppFinder, AppItem

LOGGER = logging.getLogger(__name__)


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
	


#  vim: set fenc=utf-8 ts=4 sw=4 noet :
