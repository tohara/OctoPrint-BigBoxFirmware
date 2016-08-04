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
        
        self.configPathAvrdude = ko.observable();
        self.hexFileName = ko.observable(undefined);
        self.hexFileURL = ko.observable(undefined);

        self.alertMessage = ko.observable("");
        self.alertType = ko.observable("alert-warning");
        self.showAlert = ko.observable(false);
        self.missingParamToFlash = ko.observable(false);
        self.progressBarText = ko.observable();
        self.isBusy = ko.observable(false);
        self.updateAvailable = ko.observable(false);

        self.pathBroken = ko.observable(false);
        self.pathOk = ko.observable(false);
        self.pathText = ko.observable();
        
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
        self.editorDefine = ko.observableArray(undefined);

        self._cleanProfile = function() {
            return {
                id: "",
                name: "",
                info: "",
                define: []
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
                    self.requestInProgress(false);
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
                    self.requestInProgress(false);
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
                    self.requestInProgress(false);
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
                	
                }
            });       
     
        }
        
        self.duplicateProfile = function(data) {
        	
        	var dataCopy = jQuery.extend(true, {}, data);
        	dataCopy.name = "copy of " + data.name;
        	dataCopy.id = "";
        	
        	self.showEditProfileDialog(dataCopy, true);
        };
        
        self.showEditProfileDialog = function(data, add=false) {
            
            if (data == undefined) {
                data = self._cleanProfile();
                add = true;
            }
            
            
            
            self.editorNew(add);
            
            self.editorIdentifier(data.id);
            self.editorName(data.name);
            self.editorInfo(data.info);
            self.editorDefine(data.define);
           
            
            
            
            var editDialog = $("#settings_plugin_bigboxfirmware_editDialog");
            var confirmButton = $("button.btn-confirm", editDialog);
            var dialogTitle = $("h3.modal-title", editDialog);
          

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
                define : self.editorDefine()
                
            }

            return profile;
        };
        
        self.addDefine = function() {
        	
            self.editorDefine.push({identifier: "identifier", enabled: false, value: ""});
    
           
        };

        self.removeDefine= function(profile) {
            self.editorDefine.remove(profile);
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
        
        self.testNotify = function() {
        	new PNotify({
                title: "test123",
                text: "testtext 123",
                confirm: {
                    confirm: true,
                    buttons: [{
                        text: "button text",
                        click: function () {
                            
                        }
                    }]
                },
                buttons: {
                    closer: false,
                    sticker: false
                },
                hide: false
            })
        }
        
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
        
//        self.onSettingsShown = function() {
////        	console.log("Startup completedasdfasfd");
//        	if (!self.depInstalled()) {
//        		self.checkInstalledDep();
//        	}	
//        }
        
        

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
