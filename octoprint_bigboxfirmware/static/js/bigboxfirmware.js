/*
 * View model for OctoPrint-BigBoxFirmware
 *
 * Author: Tom Haraldseid
 * License: AGPLv3
 */


$(function() {
    function BigBoxFirmwareViewModel(parameters) {
        var self = this;

        self.settingsViewModel = parameters[0];
        self.loginState = parameters[1];
        self.connection = parameters[2];
        self.printerState = parameters[3];
        
   
        self.isBusy = ko.observable(false);
        self.updateAvailable = ko.observable(false);

        
        self.myTitle = ko.observable("My Big Box");
        
        self.loglines = ko.observableArray([]);
        self.working = ko.observable(false);
        self.workingTitle = ko.observable();
        self.workingDialog = undefined;
        self.workingOutput = undefined;
       
        
        self.depInstalled = ko.observable(false);
    

        self.inSettingsDialog = false;
        
        self.editorNew = ko.observable(false);

        self.editorName = ko.observable();
        self.editorIdentifier = ko.observable();
        self.editorIdentifierPlaceholder = ko.observable();
        self.editorInfo = ko.observable();
        self.editorIsDefault = ko.observable();
        self.editorDefine = ko.observableArray(undefined);
        self.editorUrl = ko.observable();
        self.editorRepo = ko.observable();
        self.editorBranch = ko.observable();
        self.editorBranchList = ko.observableArray(undefined);
        self.editorUrlList = ko.observableArray(undefined);
        self.defineLib = ko.observableArray(undefined);
        
        self.repoUrlList = ko.observableArray(undefined);
        self.repoEditorUrlList = ko.observableArray(undefined);

        self._cleanProfile = function() {
            return {
                id: "",
                name: "",
                info: "",
                define: [],
                url: '',
                branch: ''
            }
        };
        
        self.requestInProgress = ko.observable(false);
        
        self.profiles = new ItemListHelper(
                "firmwareProfiles",
                {
                    "name": function(a, b) {
                        // sorts ascending
                        if (a["name"].toLocaleLowerCase() < b["name"].toLocaleLowerCase()) return -1;
                        if (a["name"].toLocaleLowerCase() > b["name"].toLocaleLowerCase()) return 1;
                        return 0;
                    }
                },
                {},
                "name",
                [],
                [],
                10
            );
        
        self.currentProfileData = ko.observable(ko.mapping.fromJS(self._cleanProfile()));
        
//        var items = []
//        items.push({id: 'test111', name: 'Tom sin firmware111', info: 'bare tull'})
//        items.push({id: 'test124', name: 'Tom sin firmware', info: 'bare tull'})
//        items.push({id: 'test125', name: 'Tom sin firmware', info: 'bare tull'})
//        items.push({id: 'test126', name: 'Tom sin firmware', info: 'bare tull'})
//        items.push({id: 'test127', name: 'Tom sin firmware', info: 'bare tull'})
//        items.push({id: 'test128', name: 'Tom sin firmware', info: 'bare tull', define: {}})
//
//        
//        self.profiles.updateItems(items);
        
        self.editorNameInvalid = ko.pureComputed(function() {
            return !self.editorName();
        });

        self.editorIdentifierInvalid = ko.pureComputed(function() {
            var identifier = self.editorIdentifier();
            var placeholder = self.editorIdentifierPlaceholder();
            var data = identifier;
            if (!identifier) {
                data = placeholder;
            }

            var validCharacters = (data && (data == self._sanitize(data)));
            
            var existingProfile = self.profiles.getItem(function(item) {return item.id == data});
            return !data || !validCharacters || (self.editorNew() && existingProfile != undefined);
        });

        self.editorIdentifierInvalidText = ko.pureComputed(function() {
            if (!self.editorIdentifierInvalid()) {
                return "";
            }

            if (!self.editorIdentifier() && !self.editorIdentifierPlaceholder()) {
                return "Identifier must be set";
            } else if (self.editorIdentifier() != self._sanitize(self.editorIdentifier())) {
                return "Invalid characters, only a-z, A-Z, 0-9, -, ., _, ( and ) are allowed"
            } else {
                return "A profile with such an identifier already exists";
            }
        });

        self.enableEditorSubmitButton = ko.pureComputed(function() {
            return !self.editorNameInvalid() && !self.editorIdentifierInvalid() && !self.requestInProgress();
        });

        self.editorName.subscribe(function() {
            self.editorIdentifierPlaceholder(self._sanitize(self.editorName()).toLowerCase());
        });
        
        self.editorUrl.subscribe(function() {
        	
        	self.editorBranchList.removeAll();
        	_.each(self.repoUrlList(), function(repo) {  
        		if (repo.repoUrl == self.editorUrl()) {
        			_.each(repo.branchList, function(branch) {
        				self.editorBranchList.push(branch);
        			});
        			
        		}
            });
        });
        
        
        self.addProfile = function(callback) {
            var profile = self._editorData();
            self.requestInProgress(true);
            $.ajax({
                url: PLUGIN_BASEURL + "bigboxfirmware/firmwareprofiles",
                type: "POST",
                dataType: "json",
                contentType: "application/json; charset=UTF-8",
                data: JSON.stringify({profile: profile}),
                success: function() {
                    
                    if (callback !== undefined) {
                        callback();
                    }
                    self.requestData();
                    
                },
                error: function() {
                    self.requestInProgress(false);
                    var text = "There was unexpected error while saving the profile.";
                    new PNotify({title: "Saving failed", text: text, type: "error", hide: false});
                }
            });
        };

        self.removeProfile = function(data) {
        	
            self.requestInProgress(true);
            $.ajax({
                url: PLUGIN_BASEURL + "bigboxfirmware/firmwareprofiles/" + data.id,
                type: "DELETE",
                dataType: "json",
                success: function() {
                    
                    self.requestData();
                   
                },
                error: function() {
                    self.requestInProgress(false);
                    var text = "There was unexpected error while removing the profile.";
                    new PNotify({title: "Saving failed", text: text, type: "error", hide: false});
                }
            })
        };

        self.updateProfile = function(profile, callback) {
            if (profile == undefined) {
                profile = self._editorData();
            }

            self.requestInProgress(true);

            $.ajax({
                url: PLUGIN_BASEURL + "bigboxfirmware/firmwareprofiles/" + profile.id,
                type: "PATCH",
                dataType: "json",
                contentType: "application/json; charset=UTF-8",
                data: JSON.stringify({profile: profile}),
                success: function() {
                    
                    if (callback !== undefined) {
                        callback();
                    }
                    self.requestData();
                    
                },
                error: function() {
                    self.requestInProgress(false);
                    var text = "There was unexpected error while updating the profile.";
                    new PNotify({title: "Saving failed", text: text, type: "error", hide: false});
                }
            });
        };
        
        self.requestData = function() {
        	items = [];
        	$.ajax({
                url: PLUGIN_BASEURL + "bigboxfirmware/firmwareprofiles",
                type: "GET",
                dataType: "json",
                success: function(data) {
                		_.each(data.profiles, function(profile) {                        
                                               
                        items.push(profile);
                    });
                		
                    self.profiles.updateItems(items);
                    self.repoUrlList(data.repos);
                    self.defineLib(data.defineLib);
                    self.requestInProgress(false);
                	
                }
            });       
     
        };
        
        self.duplicateProfile = function(data) {
        	
        	var dataCopy = jQuery.extend(true, {}, data);
        	dataCopy.name = "copy of " + data.name;
        	dataCopy.id = "";
        	
        	self.showEditProfileDialog(dataCopy, true);
        };
        
        self.defineSortFunc = function(a, b) {
            try {
            	indexA = self.defineLib()[self.editorUrl()][self.editorBranch()].indexOf(a["identifier"]);
            	indexB = self.defineLib()[self.editorUrl()][self.editorBranch()].indexOf(b["identifier"]);
            }
        	catch (err) {
        		return 0;
        	}
        	
            return indexA - indexB;
        };
        
        self.defineCheckExist = function(define) {
        	try {
        		define['missing'] = self.defineLib()[self.editorUrl()][self.editorBranch()].indexOf(define['identifier']) == -1;
        	}
        	catch (err) {
        		define['missing'] = true;
        	}
        	
        	return define;
        	
        };
        
        
        self.showEditProfileDialog = function(data, add) {
            
        	if (add == undefined) {
        		add = false;
        	}
        	
            if (data == undefined) {
                data = self._cleanProfile();
                add = true;
            }
            
            
            self.editorUrlList.removeAll();
        	_.each(self.repoUrlList(), function(repo) {  
//        		console.log('add repo url:');
//        		console.log(repo.repoUrl);
        		self.editorUrlList.push(repo.repoUrl);
        		
            });
            
            self.editorNew(add);
            
            self.editorIdentifier(data.id);
            self.editorName(data.name);
            self.editorInfo(data.info);
            self.editorUrl(data.url);
            self.editorBranch(data.branch);
            self.editorDefine(data.define.sort(self.defineSortFunc).map(self.defineCheckExist));
            
            
            var editDialog = $("#settings_plugin_bigboxfirmware_editDialog");
            var confirmButton = $("button.btn-confirm", editDialog);
            var dialogTitle = $("h3.modal-title", editDialog);
            
            var profileImportFile = $("#settings_plugin_bigboxfirmware_profile_import", editDialog);
            
            
            profileImportFile.fileupload({
                maxNumberOfFiles: 1,
                autoUpload: true,
                success: function(data) {
                    self.editorName(data.name);
                    self.editorInfo(data.info);
//                    self.editorDefine(data.define);
                    self.editorUrl(data.url);
                    self.editorBranch(data.branch);
                    self.editorDefine(data.define.map(function(define){
                    	
                    	define['missing'] = false;
                    	return define;
                    	
                    	}
                    ));
                						
                },
                error: function () {
                	new PNotify({
                        title: "Import Profile",
                        text: "Not able to import the selected profile!",
                        
                        buttons: {
                            closer: true,
                            sticker: false
                        },
                        hide: true,
                        type: 'error'
                    });
                	
                }
                
            });
            
              
            dialogTitle.text(add ? gettext("Add Firmware Profile") : _.sprintf(gettext("Edit Firmware Profile \"%(name)s\""), {name: data.name}));
            confirmButton.unbind("click");
            confirmButton.bind("click", function() {
                if (self.enableEditorSubmitButton()) {
                    self.confirmEditProfile(add);
                }
            });
            editDialog.modal("show");
        };
        
        
        self.confirmEditProfile = function(add) {
            var callback = function() {
                $("#settings_plugin_bigboxfirmware_editDialog").modal("hide");
            };

            if (add) {
                self.addProfile(callback);
            } else {
                self.updateProfile(undefined, callback);
            }
        };
        
        self._editorData = function() {
            var identifier = self.editorIdentifier();
            if (!identifier) {
                identifier = self.editorIdentifierPlaceholder();
            }

            var profile = {
                id: identifier,
                name: self.editorName(),
                info: self.editorInfo(),
                define : self.editorDefine().map(function(obj) {
                	delete obj.missing;
                	return obj;
                }),
                url: self.editorUrl(),
                branch: self.editorBranch()
                               
            }

            return profile;
        };
        
        self.addDefine = function() {
        	
            self.editorDefine.push({identifier: "identifier", enabled: false, value: "", missing: false});
    
           
        };

        self.removeDefine= function(profile) {
            self.editorDefine.remove(profile);
        };
        
        
        self.showRepoDialog = function() {
           
            
            var repoDialog = $("#settings_plugin_bigboxfirmware_repoDialog");
            var confirmButton = $("button.btn-confirm", repoDialog);
            var dialogTitle = $("h3.modal-title", repoDialog);
            
            self.repoEditorUrlList(self.repoUrlList.slice());
          

            dialogTitle.text("Github Firmware sources");
            confirmButton.unbind("click");
            confirmButton.bind("click", function() {
                
                    self.confirmRepo();
                
            });
            repoDialog.modal("show");
        };
        
        self.addRepo = function() {
        	
            self.repoEditorUrlList.push({repoUrl: "https://", add: true, branchList: []});
    
        };
        
        self.removeRepo = function(repo) {
//        	console.log(repo);
        	var repoInUse = self.profiles.getItem(function(item) {return item.url == repo.repoUrl});
        	if (repoInUse && repo.repoUrl != '') {
        		new PNotify({
                    title: "Remove Repo Source",
                    text: "Repo is used by a profile and can not be removed",
                    
                    buttons: {
                        closer: true,
                        sticker: false
                    },
                    hide: true,
                    type: 'error'
                })
        	} else {
        		self.repoEditorUrlList.remove(repo);
        		        		
        	}
        };
        
        self.updateRepo = function(repo) {
//        	console.log('Update:');
//        	console.log(repo);
//        	self.repoEditorUrlList.remove(repo);
//        	self.repoEditorUrlList.push({repoUrl: repo.repoUrl, add: true, branchList: []});
        	
        	if (repo.add) {
        		var text = "Github repository need to be saved before it can be updated!";
        		new PNotify({title: "Update failed", text: text, type: "error", hide: true});
        		return;
        	}
        	
        	self.requestInProgress(true);
        	self._markWorking('Update GitHub Repositories', 'Updating: ' + repo.repoUrl);
        	
        	$.ajax({
                url: PLUGIN_BASEURL + "bigboxfirmware/updateRepos/",
                type: "PATCH",
                dataType: "json",
                contentType: "application/json; charset=UTF-8",
                data: JSON.stringify({repo: repo}),
                success: function() {
                    
                    self.requestData();
                    
                    self._markDone();
                },
                error: function() {
                    self.requestInProgress(false);
                    var text = "There was unexpected error while updating repos.";
                    new PNotify({title: "Update failed", text: text, type: "error", hide: true});
                    self._markDone();
                }
            });
            
        };
        
        self.confirmRepo = function() {
        	self.requestInProgress(true);
        	self._markWorking('Update GitHub Repositories', 'Starting....');
        	
        	$.ajax({
                url: PLUGIN_BASEURL + "bigboxfirmware/updateRepos/",
                type: "POST",
                dataType: "json",
                contentType: "application/json; charset=UTF-8",
                data: JSON.stringify({repoUrlList: self.repoEditorUrlList()}),
                success: function() {
                    
                    $("#settings_plugin_bigboxfirmware_repoDialog").modal("hide");
                    self.requestData();
                    
                    self._markDone();
                },
                error: function() {
                    self.requestInProgress(false);
                    var text = "There was unexpected error while saving repos.";
                    new PNotify({title: "Saving failed", text: text, type: "error", hide: true});
                    self._markDone();
                }
            });
        	
        	
        };
        
        self._sanitize = function(name) {
            return name.replace(/[^a-zA-Z0-9\-_\.\(\) ]/g, "").replace(/ /g, "_");
        };
        
        
        self.onStartup = function() {
            self.workingDialog = $("#settings_plugin_bigboxfirmware_workingdialog");
            self.workingOutput = $("#settings_plugin_bigboxfirmware_workingdialog_output");
            if (!self.depInstalled()) {
        		self.checkInstalledDep();
        	}
            self.requestData();
           
           
        };
 
        
        self._markWorking = function(title, line) {
            self.working(true);
            self.workingTitle(title);

            self.loglines.removeAll();
            self.loglines.push({line: line, stream: "message"});

            self.workingDialog.modal("show");
        };

        self._markDone = function() {
            self.working(false);
            self.loglines.push({line: gettext("Done!"), stream: "message"});
            self._scrollWorkingOutputToEnd();
        };
        
        self._scrollWorkingOutputToEnd = function() {
            self.workingOutput.scrollTop(self.workingOutput[0].scrollHeight - self.workingOutput.height());
        };
       
         
        self.flashProfile = function(profile) {
        	if (!self.depInstalled()) { return;}
        	//console.log('makeMarlin');
        	self.isBusy(true);
        	self._markWorking('Flash Printer', 'Starting......');
     

            $.ajax({
                url: PLUGIN_BASEURL + "bigboxfirmware/make",
                type: "POST",
                dataType: "json",
                data: JSON.stringify({
                    selected_port: self.connection.selectedPort(),
                    profileId: profile.id
                }),
                contentType: "application/json; charset=UTF-8",
                complete: function() {
                	self._markDone();
                	self.isBusy(false);
                }
            });
        };
        
        self.installDep = function() {
        	 	
        	self.isBusy(true);
        	self._markWorking('Install', 'installing....');
     

            $.ajax({
                url: PLUGIN_BASEURL + "bigboxfirmware/install",
                type: "POST",
                dataType: "json",
                contentType: "application/json; charset=UTF-8",
                complete: function() {
                	self._markDone();
                	self.isBusy(false);
                	self.checkInstalledDep()
                }
            });
        };
        
        self.onDataUpdaterPluginMessage = function(plugin, data) {
            if (plugin != "bigboxfirmware") {
                return;
            }
            
            if (!self.loginState.isAdmin()) {
                return;
            }

            if (!data.hasOwnProperty("type")) {
                return;
            }
            
            var messageType = data.type;

            if (messageType == "logline" && self.working()) {
            	self.loglines.push({line: data.line, stream: data.stream});
                self._scrollWorkingOutputToEnd();
            }
            
           
        };
        
        self.checkInstalledDep = function() {
           	
            $.ajax({
                url: PLUGIN_BASEURL + "bigboxfirmware/check_dep",
                type: "POST",
                dataType: "json",
                data: JSON.stringify({
                    selected_port: self.connection.selectedPort()
                }),
                contentType: "application/json; charset=UTF-8",
                complete: function(result) {
                	
                	if (result.responseJSON.isInstalled) {
                		self.depInstalled(true);
                	
                	} 
                }
            });
        };
   

    }

    // view model class, parameters for constructor, container to bind to
    OCTOPRINT_VIEWMODELS.push([
        BigBoxFirmwareViewModel,

        // e.g. loginStateViewModel, settingsViewModel, ...
        ["settingsViewModel", "loginStateViewModel", "connectionViewModel", "printerStateViewModel"],

        // e.g. #settings_plugin_pidtune, #tab_plugin_pidtune, ...
        "#settings_plugin_bigboxfirmware"
    ]);
});
