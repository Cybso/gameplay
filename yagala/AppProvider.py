#!/usr/bin/env python3
###
# Defines the class interfaces for implementation that fetches
# informations about runnable apps. This could be Steam, 
# Emulators, local .desktop entries or the application menu.
#
# Each implementation must implement at least AppProvider and
# AppItem.
###

from subprocess import Popen
import logging
LOGGER = logging.getLogger(__name__)

class AppItem:
    def __init__(self, id, label, icon = None, icon_selected = None, suspended = False, cmd=None):
        self.id = id
        self.label = label
        self.icon = icon
        self.icon_selected = icon_selected
        self.suspended = suspended
        self.cmd = cmd

    ###
    # Executes the application and returns a Popen object,
    # False if the command fails to run and None if the
    # AppItem is not executable.
    ###
    def execute(self):
        if self.cmd is not None:
            LOGGER.info('Executing command "%s"' % ' '.join(self.cmd))
            return Popen(self.cmd)
        return None

class AppProvider:
    def __init__(self, settings):
        self.settings = settings

    ###
    # Returns a list of AppItem objects
    ###
    def get_apps(self):
        return []
