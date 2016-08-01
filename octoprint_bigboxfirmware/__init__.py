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

### (Don't forget to remove me)
# This is a basic skeleton for your plugin's __init__.py. You probably want to adjust the class name of your plugin
# as well as the plugin mixins it's subclassing from. This is really just a basic skeleton to get you started,
# defining your plugin as a template plugin, settings and asset plugin. Feel free to add or remove mixins
# as necessary.
#
# Take a look at the documentation on what other plugin mixins are available.


class BigBoxFirmwarePlugin(octoprint.plugin.BlueprintPlugin,
                           octoprint.plugin.TemplatePlugin,
                           octoprint.plugin.AssetPlugin,
                           octoprint.plugin.SettingsPlugin,
                           octoprint.plugin.EventHandlerPlugin):



    @octoprint.plugin.BlueprintPlugin.route("/make", methods=["POST"])
    @octoprint.server.util.flask.restricted_access
    @octoprint.server.admin_permission.require(403)
    def make_marlin(self):
        if self._printer.is_printing():
            self._send_status(status_type="flashing_status", status_value="error", status_description="Printer is busy")
            self._logger.debug(u"Printer is busy")
            return flask.make_response("Error.", 500)

        if not self._check_avrdude():
            self._send_status(status_type="flashing_status", status_value="error", status_description="Avrdude error")
            return flask.make_response("Error.", 500)


        return flask.make_response("Ok.", 200)
    
    
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
			pidtune=dict(
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

