#!/usr/bin/env python3
###
# Defines the class interfaces for implementation that fetches
# informations about runnable apps. This could be Steam, 
# Emulators, local .desktop entries or the application menu.
#
# Each implementation must implement at least AppFinder and
# AppItem.
###

class AppItem:
    def __init__(self, id, label, icon = None, icon_selected = None, suspended = False):
        self.id = id
        self.label = label
        self.icon = icon
        self.icon_selected = icon_selected
        self.suspended = suspended

    ###
    # Executes the application and returns a Popen object,
    # False if the command fails to run and None if the
    # AppItem is not executable.
    ###
    def execute(self):
        return None

class AppFinder:
    def __init__(self, settings):
        self.settings = settings

    ###
    # Returns a list of AppItem objects
    ###
    def get_apps(self):
        return []
