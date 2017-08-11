#!/usr/bin/env python3

DEPS = [
	{
		"module": "PyQt5",
		"pip": "PyQt5",
		"debian": "python3-pyqt5"
	},
	{
		"module": "PyQt5.QtWebEngineWidgets",
		"debian": "python3-pyqt5.qtwebengine",
		"alternative": {
			"module": "PyQt5.QtWebKit"
		}
	},
	{
		"module": "psutil",
		"pip": "psutil",
		"debian": "python3-psutil"
	},
	{
		"module": "win32gui",
		"pip": "pypiwin32",
		"systems": ["Windows"]
	},
	{
		"module": "extract_icon",
		"pip": "extract-icon",
		"systems": ["Windows"]
	},
	{
		"command": "which xdotool",
		"label": "xdotool",
		"debian": "xdotools",
		"systems": ["Linux"]
	}
]

import os
import sys
import platform
import subprocess
from gameplay import utils as gameplay_utils
from importlib import util

def check_dependency(dep):
	if dep.get('command'):
		p = subprocess.run(dep['command'], shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
		if p.returncode == 0:
			return True
	if dep.get('module'):
		if util.find_spec(dep['module']) is not None:
			return True
	if dep.get('alternative'):
		return check_dependency(dep['alternative'])
	return False



if __name__ == "__main__":
	system = platform.system()
	missing=[]
	for dep in DEPS:
		if not dep.get('systems') or system in dep['systems']:
			if not check_dependency(dep):
				missing.append(dep)

	# If this is not started on a terminal, write the output into a file 'dependencies.txt'
	output = gameplay_utils.find_output('dependencies.txt')
	if missing:
		pip_pkgs=[]
		apt_pkgs=[]
		print("The following dependencies are missing: ")
		print()
		for dep in missing:
			print("	%s" % dep.get("label", dep.get("module")))
			if dep.get("pip"):
				pip_pkgs.append(dep["pip"])
			if dep.get("debian"):
				apt_pkgs.append(dep["debian"])
		print()

		if len(pip_pkgs) > 0:
			print("Install them using 'pip': ")
			print()
			print("	pip3 install %s" % ' '.join(pip_pkgs) )
			print("	(try 'pip' if 'pip3' is not available)")
			print()
		if system == 'Linux':
			(distname, version, id) = platform.linux_distribution()
			if distname in ['debian', 'ubuntu'] and len(apt_pkgs) > 0:
				print("Install them using APT:")
				print()
				print("	sudo apt-get install %s" % ' '.join(apt_pkgs) )
				print()
	else:
		print('All dependencies fullfilled.')
	
	if output is not None:
		output.close()
	else:
		getch = gameplay_utils.find_getch()
		if getch is not None:
			print('Press any key to continue')
			getch()

#  vim: set fenc=utf-8 ts=4 sw=4 noet :
