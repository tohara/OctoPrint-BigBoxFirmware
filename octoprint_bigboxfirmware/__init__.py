# coding=utf-8
from __future__ import absolute_import


import flask
import json
import os
import requests
import tempfile
import time
import urllib
import urllib2
import urlparse

import octoprint.plugin

import octoprint.server.util.flask
from octoprint.server import admin_permission
from octoprint.events import Events
from subprocess import call, Popen, PIPE
import threading
import apt


class BigBoxFirmwarePlugin(octoprint.plugin.BlueprintPlugin,
                           octoprint.plugin.TemplatePlugin,
                           octoprint.plugin.AssetPlugin,
                           octoprint.plugin.SettingsPlugin,
                           octoprint.plugin.EventHandlerPlugin):
    
    
    
    @octoprint.plugin.BlueprintPlugin.route("/make", methods=["POST"])
    @octoprint.server.util.flask.restricted_access
    @octoprint.server.admin_permission.require(403)
    def make_marlin(self):
        
        avrdude_path = '/usr/bin/avrdude'
        selected_port = flask.request.json['selected_port']
        data_folder = self.get_plugin_data_folder()
        build_folder = data_folder + '/tmp'
        hex_path = build_folder + '/Marlin.hex'
        
        
        if self._printer.is_printing():
            self._plugin_manager.send_plugin_message(self._identifier, 
                                                     dict(type="logline",
                                                          line='Printer is busy! Aborted Flashing!',
                                                          stream='stderr'))
            
            return flask.make_response("Error.", 500)
        
        output = self.execute(['make', 'BUILD_DIR=' + build_folder], cwd=self._basefolder + '/marlin/Marlin')

            
        hexFileExist = os.path.exists(hex_path)
        
        if not hexFileExist:
            self._plugin_manager.send_plugin_message(self._identifier, 
                                                     dict(type="logline",
                                                          line='Something went wrong. Hex file does not exist!',
                                                          stream='stderr'))
            return flask.make_response("Error", 500)
        
        else:
            self._plugin_manager.send_plugin_message(self._identifier,
                                                     dict(type="logline",
                                                          line='Marlin.hex found! Proceeding to flash with avrdude.',
                                                          stream='message'))
        
              
        
        avrdude_command = [avrdude_path, "-v", "-p", "m2560", "-c", "wiring", "-P", selected_port, "-U", "flash:w:" + hex_path + ":i", "-D"]
        
        self._plugin_manager.send_plugin_message(self._identifier,
                                                     dict(type="logline",
                                                          line='Command: ' + ' '.join(avrdude_command),
                                                          stream='stdout'))
        
        output = self.execute(avrdude_command, cwd=os.path.dirname(avrdude_path))
        
        self._plugin_manager.send_plugin_message(self._identifier,
                                                     dict(type="logline",
                                                          line='Cleaning up build files....',
                                                          stream='message'))
        
        output = self.execute(['make', 'clean', 'BUILD_DIR=' + build_folder], cwd=self._basefolder + '/marlin/Marlin')
        
        

 
        return flask.make_response("Ok.", 200)
    
    depList = ['avr-libc', 'avrdude', 'make']

    @octoprint.plugin.BlueprintPlugin.route("/check_dep", methods=["POST"])
    @octoprint.server.util.flask.restricted_access
    @octoprint.server.admin_permission.require(403)
    def check_dep(self):
        cache = apt.Cache()
        
        isInstalled = True
        
        for packageName in self.depList:
            try:
                isInstalled = isInstalled and cache[packageName].is_installed
            except:
                isInstalled = False
                    
        return flask.jsonify(isInstalled=isInstalled)
    
    @octoprint.plugin.BlueprintPlugin.route("/firmwareprofiles", methods=["GET"])
    def getProfileList(self):
        data_folder = self.get_plugin_data_folder()
        profile_folder = data_folder + '/profiles'
        
        _,_,fileList = os.walk(profile_folder).next()
        
        returnDict = {}
        for pFile in fileList:
            with open(profile_folder +'/'+ pFile, 'r+b') as f:
                profile = eval(f.read())['profile']
                returnDict[profile['id']] = profile
                
        return flask.jsonify(profiles=returnDict)
    
    @octoprint.plugin.BlueprintPlugin.route("/install", methods=["POST"])
    @octoprint.server.util.flask.restricted_access
    @octoprint.server.admin_permission.require(403)
    def install_dep(self):
        
        installCommand = ['sudo', '-S', 'apt-get', 'install', '-y'] + self.depList
        self._plugin_manager.send_plugin_message(self._identifier,
                                                     dict(type="logline",
                                                          line='Command: ' + ' '.join(installCommand),
                                                          stream='stdout'))
        
        self.execute(installCommand, stdin=PIPE, pswd='ubuntu')
                    
        return flask.make_response("Ok.", 200)
    
    @octoprint.plugin.BlueprintPlugin.route("/firmwareprofiles", methods=["POST"])
    @octoprint.server.util.flask.restricted_access
    @octoprint.server.admin_permission.require(403)
    def addNewProfile(self):
        data_folder = self.get_plugin_data_folder()
        profile_folder = data_folder + '/profiles'
        
        if not os.path.isdir(profile_folder):
            os.mkdir(profile_folder)
            
        profile_id = flask.request.json['profile']['id']
        
        profile_file = open(profile_folder + '/' + profile_id, 'w+b')
        
        profile_file.write(str(flask.request.json))
        profile_file.flush()
        profile_file.close()
        
        
        
        print '****************Output from addNewProfile:*************************'
        print flask.request.json
        for i in flask.request.json['profile']:
            print i
        print type(flask.request.json)
       
       
        return flask.make_response("", 204)            
    
    @octoprint.plugin.BlueprintPlugin.route("/firmwareprofiles/<string:identifier>", methods=["DELETE"])
    @octoprint.server.util.flask.restricted_access
    @octoprint.server.admin_permission.require(403)
    def deleteProfile(self, identifier):
        data_folder = self.get_plugin_data_folder()
        file_path = data_folder + '/profiles/' + identifier
           
        if os.path.isfile(file_path):
            os.remove(file_path)
                 
        return flask.make_response("", 204)
    
    @octoprint.plugin.BlueprintPlugin.route("/firmwareprofiles/<string:identifier>", methods=["PATCH"])
    @octoprint.server.util.flask.restricted_access
    @octoprint.server.admin_permission.require(403)
    def updateProfile(self, identifier):
        data_folder = self.get_plugin_data_folder()
        profile_folder = data_folder + '/profiles'
        
        if not os.path.isdir(profile_folder):
            os.mkdir(profile_folder)
            
        profile_id = flask.request.json['profile']['id']
        
        profile_file = open(profile_folder + '/' + profile_id, 'w+b')
        
        profile_file.write(str(flask.request.json))
        profile_file.flush()
        profile_file.close()
        
        
        
        print '****************Output from addNewProfile:*************************'
        print flask.request.json
        for i in flask.request.json['profile']:
            print i
        print type(flask.request.json)
       
       
        return flask.make_response("", 204)
            

    def execute(self, args, **kwargs):
        
        pswd = kwargs.pop('pswd', None)
        res = Popen(args, stdout=PIPE, stderr=PIPE,  **kwargs)
        
        if pswd:
            res.stdin.write(pswd + '\n')
            
        linesStdout = iter(res.stdout.readline, "")
        linesStderr = iter(res.stderr.readline, "")
        
        
        def stdoutListener():
            for line in linesStdout:
                self._plugin_manager.send_plugin_message(self._identifier, dict(type="logline", line=line.replace('\n', ''), stream='stdout'))
                
        def stderrListener():
            for line in linesStderr:
                self._plugin_manager.send_plugin_message(self._identifier, dict(type="logline", line=line.replace('\n', ''), stream='stderr'))
            
        
        stdoutThread = threading.Thread(target=stdoutListener)
        stdoutThread.daemon = False
        stdoutThread.start()
        
        stderrThread = threading.Thread(target=stderrListener)
        stderrThread.daemon = False
        stderrThread.start()
            
        stderrThread.join()
        stdoutThread.join()
        
                     
    
	##~~ SettingsPlugin mixin

    def get_settings_defaults(self):
        return dict(
			# put your plugin's default settings here
		)

	##~~ AssetPlugin mixin
    
    def get_assets(self):
		# Define your plugin's asset files to automatically include in the
		# core UI here.
		return dict(
			js=["js/bigboxfirmware.js"],
			css=["css/bigboxfirmware.css"],
			less=["less/bigboxfirmware.less"]
		)

	##~~ Softwareupdate hook
    
    def get_update_information(self):
		# Define the configuration for your plugin to use with the Software Update
		# Plugin here. See https://github.com/foosel/OctoPrint/wiki/Plugin:-Software-Update
		# for details.
		return dict(
			bigboxfirmware=dict(
				displayName="BigBox Firmware Flasher",
				displayVersion=self._plugin_version,

				# version check: github repository
				type="github_commit",
				user="tohara",
				repo="OctoPrint-BigBoxFirmware",
                branch="dev",
				current=self._plugin_version,

				# update method: pip
				pip="https://github.com/tohara/OctoPrint-BigBoxFirmware/archive/{target_version}.zip"
			)
		)
        
    #~~ Extra methods
    def _send_status(self, status_type, status_value, status_description=""):
        self._plugin_manager.send_plugin_message(self._identifier, dict(type="status", status_type=status_type, status_value=status_value, status_description=status_description))


# If you want your plugin to be registered within OctoPrint under a different name than what you defined in setup.py
# ("OctoPrint-PluginSkeleton"), you may define that here. Same goes for the other metadata derived from setup.py that
# can be overwritten via __plugin_xyz__ control properties. See the documentation for that.
__plugin_name__ = "BigBoxFirmware"

def __plugin_load__():
	global __plugin_implementation__
	__plugin_implementation__ = BigBoxFirmwarePlugin()

	global __plugin_hooks__
	__plugin_hooks__ = {
		"octoprint.plugin.softwareupdate.check_config": __plugin_implementation__.get_update_information
	}

