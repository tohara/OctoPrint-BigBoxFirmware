# coding=utf-8
from __future__ import absolute_import


import flask
import json
import os

import octoprint.plugin
import httplib2

import octoprint.server.util.flask
from octoprint.server import admin_permission
from octoprint.events import Events
from subprocess import call, Popen, PIPE
import threading
import time



class BigBoxFirmwarePlugin(octoprint.plugin.BlueprintPlugin,
                           octoprint.plugin.TemplatePlugin,
                           octoprint.plugin.AssetPlugin,
                           octoprint.plugin.SettingsPlugin,
                           octoprint.plugin.EventHandlerPlugin,
                           octoprint.plugin.StartupPlugin):
    
    
    
    
    def on_after_startup(self):
        dataFolder = self.get_plugin_data_folder()
        profileFolder = dataFolder + '/profiles'
        defaultProfileFolder = self._basefolder + '/default_profiles'
      
        if not os.path.isdir(profileFolder):
            os.mkdir(profileFolder)
            call(['cp', '-a', defaultProfileFolder + '/.', profileFolder + '/' ])
            
        
        
    
    @octoprint.plugin.BlueprintPlugin.route("/make", methods=["POST"])
    @octoprint.server.util.flask.restricted_access
    @octoprint.server.admin_permission.require(403)
    def make_marlin(self):
        
        avrdudePath = '/usr/bin/avrdude'
        selectedPort = flask.request.json['selected_port'] if flask.request.json.has_key('selected_port') else ''
        profileId = flask.request.json['profileId']
        dataFolder = self.get_plugin_data_folder()
        buildFolder = dataFolder + '/tmp'
        hexPath = buildFolder + '/Marlin.hex'
        libPath = self._basefolder + '/lib'
        arduinoLibPath = libPath + '/arduino-1.6.8'
        makeFilePath = libPath + '/Makefile'
        
        profile = self.getProfileFromId(profileId)
        repoPath = self.getRepoNamePath(profile['url'])
        marlinFolder = repoPath + '/Marlin'
        
        
        if self._printer.is_printing() or self._printer.is_paused():
            self._sendStatus(line='Printer is busy! Aborted Flashing!', stream='stderr')
            return flask.make_response("Error.", 500)
        
        
        self._sendStatus(line='Checking out selected branch...', stream='message')
        
        self.execute(['git', 'checkout', '-f', profile['branch']], cwd= repoPath)
        
        self._sendStatus(line='Writing configuration..........', stream='message')
        
        self.writeMarlinConfig(profile, marlinFolder)

        self._sendStatus(line='Building Marlin................', stream='message')
        
        #TODO: Temporary fix to be able to use RC6 and RC7 source. Need to get this done properly by the makefile
        self.execute(['make', '-f', makeFilePath, 'BUILD_DIR=' + buildFolder, 'ARDUINO_LIB_DIR=' + arduinoLibPath, 'CXXSRC=' + self.getMakeDep(marlinFolder)], cwd=marlinFolder)
  
        
        if os.path.exists(hexPath):

            self._sendStatus(line='Marlin.hex found! Proceeding to flash with avrdude.', stream='message')
        
            self._printer.disconnect()   
            
            avrdude_command = [avrdudePath, "-v", "-p", "m2560", "-c", "wiring", "-P", selectedPort, "-U", "flash:w:" + hexPath + ":i", "-D"]
             
            self._sendStatus(line='Command: ' + ' '.join(avrdude_command), stream='stdout')
            
            if selectedPort in ('VIRTUAL', 'AUTO', ''): 
                
                self._sendStatus(line='Selected port: ' + selectedPort + ' can not be used!', stream='stderr')
            else: 
                self._printer.disconnect() 
                self.execute(avrdude_command, cwd=os.path.dirname(avrdudePath))        
                self._printer.connect(port=selectedPort)
         
        else:   
            self._sendStatus(line='Something went wrong. Hex file does not exist!', stream='stderr')
            
        self._sendStatus(line='Cleaning up build files....', stream='message')
             
        self.execute(['make', 'clean', '-f', makeFilePath, 'BUILD_DIR=' + buildFolder, 'ARDUINO_LIB_DIR=' + arduinoLibPath], cwd=marlinFolder)

 
        return flask.make_response("Ok.", 200)
        
        
    def getMakeDep(self, marlinFolder):
        #TODO: Temporary fix to be able to use RC6 and RC7 source. Need to get this done properly by the makefile
        depRC6 = 'WMath.cpp WString.cpp Print.cpp Marlin_main.cpp    \
                MarlinSerial.cpp Sd2Card.cpp SdBaseFile.cpp SdFatUtil.cpp    \
                SdFile.cpp SdVolume.cpp planner.cpp stepper.cpp \
                temperature.cpp cardreader.cpp configuration_store.cpp \
                watchdog.cpp SPI.cpp servo.cpp Tone.cpp ultralcd.cpp digipot_mcp4451.cpp \
                dac_mcp4728.cpp vector_3.cpp qr_solve.cpp stopwatch.cpp \
                mesh_bed_leveling.cpp buzzer.cpp LiquidCrystal.cpp main.cpp'
                
        depRC7 = 'WMath.cpp WString.cpp Print.cpp Marlin_main.cpp    \
                MarlinSerial.cpp Sd2Card.cpp SdBaseFile.cpp SdFatUtil.cpp    \
                SdFile.cpp SdVolume.cpp planner.cpp stepper.cpp \
                temperature.cpp cardreader.cpp configuration_store.cpp \
                watchdog.cpp SPI.cpp servo.cpp Tone.cpp ultralcd.cpp digipot_mcp4451.cpp \
                dac_mcp4728.cpp vector_3.cpp qr_solve.cpp endstops.cpp stopwatch.cpp \
                mesh_bed_leveling.cpp utility.cpp LiquidCrystal.cpp main.cpp'
                
        if 'endstops.cpp' in os.listdir(marlinFolder):
            return depRC7
        else:
            return depRC6
                
        
                
                
    def writeMarlinConfig(self, profile, marlinFolder):
        templates = ('Configuration.h', 'Configuration_adv.h')
        processedIds = []
        
               
        def insertDefine(splittedLine, targFile, line):
            
            identifier = splittedLine.strip().split()[1]
            offset = line.replace('//', '').find('#define') * ' '
            
            if identifier in processedIds:
                return
            
            for param in profile['define']:
                if param['identifier'] == identifier:
                    enabled = '' if param['enabled'] else '//'
                    targFile.write(enabled + offset + '#define ' + param['identifier'] + ' ' + param['value'] + ' //Modified by BigBoxFirmware Plugin\n')
                    processedIds.append(param['identifier'])
                    break
            else:
                targFile.write(line)
                
            
        for template in templates:
            with open(marlinFolder + '/' + template, 'r') as f:
                templateFileBuffer = f.readlines()

            targFile = open(marlinFolder + '/' + template, 'w')  
                            
            for line in templateFileBuffer:
                
                splitted = line.split('//', 2)
                
                if splitted[0].strip()[:7] == '#define':
                    insertDefine(splitted[0], targFile, line)
                    continue
                
                elif len(splitted) >= 2:
                    if splitted[1].strip()[:7] == '#define':
                        insertDefine(splitted[1], targFile, line)
                        continue
                    
                
                targFile.write(line)
           
            targFile.flush()
            targFile.close()
            
            
    def getProfileFromId(self, profileId):
        dataFolder = self.get_plugin_data_folder()
        profilePath = dataFolder + '/profiles/' + profileId
        with open(profilePath, 'r+b') as f:
                profile = eval(f.read())['profile']
                
        return profile       
            
    
    depList = ['avr-libc', 'avrdude', 'make']

    @octoprint.plugin.BlueprintPlugin.route("/check_dep", methods=["POST"])
    @octoprint.server.util.flask.restricted_access
    @octoprint.server.admin_permission.require(403)
    def check_dep(self):
        #cache = apt.Cache()
        
        def checkInstalled(package):
            res = Popen(['dpkg', '-s', package], stdout=PIPE)
            
            return 'Status: install ok installed' in res.communicate()[0]
            
        isInstalled = True
        
        for packageName in self.depList:
            try:
                isInstalled = isInstalled and checkInstalled(packageName)
            except:
                isInstalled = False
                    
        return flask.jsonify(isInstalled=isInstalled)
    
    @octoprint.plugin.BlueprintPlugin.route("/firmwareprofiles", methods=["GET"])
    def getProfileList(self):
        dataFolder = self.get_plugin_data_folder()
        profile_folder = dataFolder + '/profiles'
        
        if not os.path.isdir(profile_folder):
            os.mkdir(profile_folder)
        
        _,_,fileList = os.walk(profile_folder).next()
        
        returnDict = {}
        defineLib = {}
        for pFile in fileList:
            with open(profile_folder +'/'+ pFile, 'r+b') as f:
                profile = eval(f.read())['profile']
#                 profile['isDefault'] = False
                returnDict[profile['id']] = profile 
                self.updateDefineLib(defineLib, profile)
                       
                
        repos = self.getRepos()
                
        return flask.jsonify(profiles=returnDict, repos=repos, defineLib = defineLib)
    
    def updateDefineLib(self, defineLib, profile):
        
        if defineLib.has_key(profile['url']):
            if defineLib[profile['url']].has_key(profile['branch']):
                return
        else:
            defineLib[profile['url']] =  {}
            
        try:
            repoPath = self.getRepoNamePath(profile['url'])
            marlinFolder = repoPath + '/Marlin'
            self.execute(['git', 'checkout', '-f', profile['branch']], cwd= repoPath)
        except:
            return
        
        if not os.path.exists(marlinFolder):
            return
            
        
        templates = ('Configuration.h', 'Configuration_adv.h')
        defList = []
        
        
        def insertDefine(splittedLine):
            
            sp = splittedLine.strip().split()
            identifier = sp[1]
                
                
            if identifier not in defList:
                defList.append(identifier)
               
            
        for template in templates:
            tempFile = open(marlinFolder + '/' + template, 'r')
            
            
            for line in tempFile.readlines():
                
                splitted = line.split('//', 2)
                
                if splitted[0].strip()[:7] == '#define':
                    insertDefine(splitted[0])
                    continue
                
                elif len(splitted) >= 2:
                    if splitted[1].strip()[:7] == '#define':
                        insertDefine(splitted[1])
                        continue
                    
            
            tempFile.close()
            
            
        defineLib[profile['url']][profile['branch']] = defList
        
        
    
    @octoprint.plugin.BlueprintPlugin.route("/install", methods=["POST"])
    @octoprint.server.util.flask.restricted_access
    @octoprint.server.admin_permission.require(403)
    def install_dep(self):
        
        installCommand = ['sudo', '-S', 'apt-get', 'install', '-y'] + self.depList
        self._sendStatus(line='Command: ' + ' '.join(installCommand), stream='stdout')
        
        self.execute(installCommand, stdin=PIPE, pswd='raspberry')
                    
        return flask.make_response("Ok.", 200)
    
    @octoprint.plugin.BlueprintPlugin.route("/firmwareprofiles", methods=["POST"])
    @octoprint.server.util.flask.restricted_access
    @octoprint.server.admin_permission.require(403)
    def addNewProfile(self):
        dataFolder = self.get_plugin_data_folder()
        profile_folder = dataFolder + '/profiles'
        
        if not os.path.isdir(profile_folder):
            os.mkdir(profile_folder)
            
        profile_id = flask.request.json['profile']['id']
        
        profile_file = open(profile_folder + '/' + profile_id, 'w+b')
        
        profile_file.write(str(flask.request.json))
        profile_file.flush()
        profile_file.close()
        
        
#         
#         print '****************Output from addNewProfile:*************************'
#         print flask.request.json
#         for i in flask.request.json['profile']:
#             print i
#         print type(flask.request.json)
       
       
        return flask.make_response("", 204)            
 
    @octoprint.plugin.BlueprintPlugin.route("/import_profile", methods=["POST"])
    @octoprint.server.util.flask.restricted_access
    @octoprint.server.admin_permission.require(403)
    def importProfile(self):
        
        inputName = "file"
        inputUploadPath = inputName + "." + self._settings.global_get(["server", "uploads", "pathSuffix"])

        if inputUploadPath not in flask.request.values:       
            return flask.make_response("Error.", 500)

        uploadProfilePath = flask.request.values[inputUploadPath]
       
        try:
            with open(uploadProfilePath, 'r+b') as f:
                profile = eval(f.read())['profile']
        except:
            return flask.make_response("Error.", 415)
   
       
        return flask.jsonify(profile)     
        
        
    @octoprint.plugin.BlueprintPlugin.route("/firmwareprofiles/<string:identifier>", methods=["DELETE"])
    @octoprint.server.util.flask.restricted_access
    @octoprint.server.admin_permission.require(403)
    def deleteProfile(self, identifier):
        dataFolder = self.get_plugin_data_folder()
        file_path = dataFolder + '/profiles/' + identifier
           
        if os.path.isfile(file_path):
            os.remove(file_path)
                 
        return flask.make_response("", 204)
    
    @octoprint.plugin.BlueprintPlugin.route("/firmwareprofiles/<string:identifier>", methods=["PATCH"])
    @octoprint.server.util.flask.restricted_access
    @octoprint.server.admin_permission.require(403)
    def updateProfile(self, identifier):
        dataFolder = self.get_plugin_data_folder()
        profile_folder = dataFolder + '/profiles'
        
        if not os.path.isdir(profile_folder):
            os.mkdir(profile_folder)
            
        profile_id = flask.request.json['profile']['id']
        
        profile_file = open(profile_folder + '/' + profile_id, 'w+b')
        
        profile_file.write(str(flask.request.json))
        profile_file.flush()
        profile_file.close()
        
        
        
#         print '****************Output from addNewProfile:*************************'
#         print flask.request.json
#         for i in flask.request.json['profile']:
#             print i
#         print type(flask.request.json)
       
       
        return flask.make_response("", 204)
    
    @octoprint.plugin.BlueprintPlugin.route("/updateRepos/", methods=["POST"])
    @octoprint.server.util.flask.restricted_access
    @octoprint.server.admin_permission.require(403)
    def saveRepos(self):
        repoList = flask.request.json['repoUrlList']
        
        for exsitingRepo in self.getRepos():
            if exsitingRepo['repoUrl'] not in map(lambda x: x['repoUrl'], repoList):
                repoUserFolder = self.getRepoUserPath(exsitingRepo['repoUrl'])
                #print 'Going to delete:', exsitingRepo['repoUrl']
                self.execute(['rm', '-rfv', self.getRepoName(exsitingRepo['repoUrl'])], cwd= repoUserFolder)
        
        for repo in repoList:
            
            if repo['add']:
                if self.isValidGithubRepo(repo['repoUrl']):
                    repoUserFolder = self.getRepoUserPath(repo['repoUrl'])
                    
                    self.execute(['git', 'clone', '-v', '--progress', repo['repoUrl']], cwd= repoUserFolder)
          
       
        return flask.make_response("", 204)
    
    @octoprint.plugin.BlueprintPlugin.route("/updateRepos/", methods=["PATCH"])
    @octoprint.server.util.flask.restricted_access
    @octoprint.server.admin_permission.require(403)
    def updateRepos(self):
       
        repo = flask.request.json['repo']
        repoUrl = repo['repoUrl']
        repoNamePath = self.getRepoNamePath(repoUrl)
        
        self._sendStatus(line= 'Pull changes from remote:' + repoUrl, stream='stdout')
        
        self.execute(['git', 'checkout', '-f'], cwd= repoNamePath) # Throw away any changes before pull
        self.execute(['git', 'pull', '-f'], cwd= repoNamePath)
       
       
        return flask.make_response("", 204)
            
    def getRepos(self):
        repo_folder = self.getRepoPath()
            
        repoUserList = os.listdir(repo_folder)
        repoList = []
        for repoUser in repoUserList:
            for repo in os.listdir(repo_folder + '/' + repoUser):
                gitInfo = self.getGitInfo(repo_folder + '/' + repoUser + '/' + repo)
                if not gitInfo == None:
                    gitInfo['add'] = False
                    repoList.append(gitInfo) 
                
        
        return repoList
        
    def getGitInfo(self, path):
        # * remote origin
        #   Fetch URL: https://github.com/tohara/OctoPrint-BigBoxFirmware.git
        #   Push  URL: https://github.com/tohara/OctoPrint-BigBoxFirmware.git
        #   HEAD branch: (not queried)
        #   Remote branches: (status not queried)
        #     RC6
        #     RC6dev
        #     RC7
        #     dev
        #   Local branch configured for 'git pull':
        #     RC6 merges with remote RC6
        #   Local ref configured for 'git push' (status not queried):
        #     (matching) pushes to (matching)

        gitCall = Popen(['git', 'remote', 'show', '-n', 'origin'], stdout=PIPE, cwd=path)
        res, err = gitCall.communicate()
        
        #print 'Form getGitInfo: ', res, err, path
        
        retDict = {}
        retDict['repoUrl'] = ''
        retDict['branchList'] = []
        branchTrigger = False
        
        for line in res.split('\n'):
            if 'Fetch URL:' in line:
                retDict['repoUrl'] = line.replace('Fetch URL:', '').strip()
            
            if 'Local branch' in line: 
                branchTrigger = False
                
            if branchTrigger:
                retDict['branchList'].append(line.strip())
            
            
            if 'Remote branch' in line: 
                branchTrigger = True
            
        return retDict if self.isValidGithubRepo(retDict['repoUrl'], False) else None
    
        
    def isValidGithubRepo(self, repoUrl, checkOnline=True):
        
        valid = False
        try:
            if 'https://' == repoUrl[0:8] and '.git' == repoUrl[-4:]:
                if checkOnline:
                    h = httplib2.Http()
                    resp = h.request(repoUrl)
                    valid = int(resp[0]['status']) < 400
                else:
                    valid = True
        except:
            valid = False
            
        if not valid:
            self._sendStatus(line= repoUrl + ' is not a valid Github repo or no internet connection.',stream='stderr')
            
        return valid
    
    def getRepoUser(self, repoUrl):
        if not ('https://' == repoUrl[0:8] and '.git' == repoUrl[-4:]):
            raise self.RepoUrlException('The repo URL is wrong format!')
        
        try:
            return repoUrl.replace('https://', '').split('/')[1]
        except Exception:
            raise self.RepoUrlException('The repo URL is wrong format!')
    def getRepoPath(self):
        dataFolder = self.get_plugin_data_folder()
        repoFolder = dataFolder + '/repos'
        
        if not os.path.isdir(repoFolder):
            os.mkdir(repoFolder)
            
        return repoFolder
            
    def getRepoUserPath(self, repoUrl):
                       
        repoUserPath = self.getRepoPath() + '/' + self.getRepoUser(repoUrl)
        
        if not os.path.isdir(repoUserPath):
            os.mkdir(repoUserPath)
        
        return repoUserPath
    
    def getRepoName(self, repoUrl):
        
        if not ('https://' == repoUrl[0:8] and '.git' == repoUrl[-4:]):
            raise self.RepoUrlException('The repo URL is wrong format!')
        
        try:
            return repoUrl.replace('https://', '').split('/')[2].replace('.git', '').strip()
        except Exception:
            raise self.RepoUrlException('The repo URL is wrong format!')
    
    def getRepoNamePath(self, repoUrl):
        
        repoNamePath = self.getRepoUserPath(repoUrl) + '/' + self.getRepoName(repoUrl)
        if not os.path.isdir(repoNamePath):
            os.mkdir(repoNamePath)
        
        return repoNamePath
    
    class RepoUrlException(Exception):
        pass

    def execute(self, args, **kwargs):
        
        pswd = kwargs.pop('pswd', None)
        res = Popen(args, stdout=PIPE, stderr=PIPE, universal_newlines=True, **kwargs)
        
        if pswd:
            res.stdin.write(pswd + '\n')
            
        linesStdout = iter(res.stdout.readline, "")
        linesStderr = iter(res.stderr.readline, "")
        
        
        def stdoutListener():
            for line in linesStdout:
                #print 'stdout:', line
                self._sendStatus(line=line.replace('\n', ''), stream='stdout')
                
        def stderrListener():
            for line in linesStderr:
                #print 'stderr:', line
                self._sendStatus(line=line.replace('\n', ''), stream='stderr')
                
            
        
        stdoutThread = threading.Thread(target=stdoutListener)
        stdoutThread.daemon = False
        stdoutThread.start()
        
        stderrThread = threading.Thread(target=stderrListener)
        stderrThread.daemon = False
        stderrThread.start()
        
            
        #print 'Waiting for error thread'   
        stderrThread.join()
        #print 'Waiting for stdout thread' 
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
        
    def route_hook(self, server_routes, *args, **kwargs):
        from octoprint.server.util.tornado import LargeResponseHandler
        
        def mime_type_guesser(path):
            from octoprint.filemanager import get_mime_type
            return get_mime_type(path)

        return [
            (r"/export_profile/(.*)", LargeResponseHandler, dict(path=self.get_plugin_data_folder() + '/profiles',
                                                           as_attachment=True,
                                                           mime_type_guesser=mime_type_guesser))
                
           
        ]
    
    #~~ Extra methods
    def _sendStatus(self, line, stream):
        self._plugin_manager.send_plugin_message(self._identifier, dict(type="logline", line=line, stream=stream))



# If you want your plugin to be registered within OctoPrint under a different name than what you defined in setup.py
# ("OctoPrint-PluginSkeleton"), you may define that here. Same goes for the other metadata derived from setup.py that
# can be overwritten via __plugin_xyz__ control properties. See the documentation for that.
__plugin_name__ = "BigBoxFirmware"

def __plugin_load__():
	global __plugin_implementation__
	__plugin_implementation__ = BigBoxFirmwarePlugin()
    

	global __plugin_hooks__
	__plugin_hooks__ = {
		"octoprint.plugin.softwareupdate.check_config": __plugin_implementation__.get_update_information,
        "octoprint.server.http.routes": __plugin_implementation__.route_hook
	}

