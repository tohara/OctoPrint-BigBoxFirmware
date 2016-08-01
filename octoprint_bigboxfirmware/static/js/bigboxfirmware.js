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
    

        self.inSettingsDialog = false;

        
        
        self.makeMarlin = function() {
        	console.log('makeMarlin');
     

            $.ajax({
                url: PLUGIN_BASEURL + "bigboxfirmware/make",
                type: "POST",
                dataType: "json",
                data: JSON.stringify({
                    selected_port: ''
                }),
                contentType: "application/json; charset=UTF-8"
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
