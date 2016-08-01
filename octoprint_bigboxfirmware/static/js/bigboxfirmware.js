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

        self.selectHexPath = $("#settings_bigboxfirmware_selectHexPath");
        self.configurationDialog = $("#settings_plugin_bigboxfirmware_configurationdialog");
        
        
        self.makeMarlin = function() {
            if (!self.loginState.isAdmin()){
                self.alertType("alert-warning")
                self.alertMessage(gettext("Administrator privileges are needed to flash firmware."));
                self.showAlert(true);
                return false;
            }
            if (self.printerState.isPrinting() || self.printerState.isPaused()){
                self.alertType("alert-warning")
                self.alertMessage(gettext("Printer is printing. Please wait for the print to be finished."));
                self.showAlert(true);
                return false;
            }
           

            self.isBusy(true);
            self.showAlert(false);
            self.progressBarText("Building firmware...");

            $.ajax({
                url: PLUGIN_BASEURL + "bigboxfirmware/make",
                type: "POST",
                dataType: "json",
                data: JSON.stringify({
                    selected_port: ''
                }),
                contentType: "application/json; charset=UTF-8"
            })
        }
        
        self.onDataUpdaterPluginMessage = function(plugin, data) {
            if (plugin != "bigboxfirmware") {
                return;
            }
            if (data.type == "status" && data.status_type == "check_update_status") {
                if (data.status_value == "progress") {
                    self.progressBarText(data.status_description);
                    return;
                }
                if (data.status_value == "update_available") {
                    if (!self.inSettingsDialog) {
                        self.showUpdateAvailablePopup(data.status_description);
                    }
                    self.updateAvailable(true);
                    self.isBusy(false);
                    return;
                }
                if (data.status_value == "up_to_date") {
                    self.updateAvailable(false);
                    self.isBusy(false);
                    self.showAlert(false);
                    if (self.inSettingsDialog) {
                        self.alertType("alert-success");
                        self.alertMessage(data.status_description);
                        self.showAlert(true);
                    }
                    return;
                }
                if (data.status_value == "error") {
                    self.updateAvailable(false);
                    self.isBusy(false);
                    self.alertType("alert-danger");
                    self.alertMessage(data.status_description);
                    self.showAlert(true);
                    return;
                }
            }
            if (data.type == "status" && data.status_type == "flashing_status") {
                if (data.status_value == "starting_flash") {
                    self.isBusy(true);
                } else if (data.status_value == "progress") {
                    self.progressBarText(data.status_description);
                } else if (data.status_value == "info") {
                    self.alertType("alert-info");
                    self.alertMessage(data.status_description);
                    self.showAlert(true);
                } else if (data.status_value == "successful") {
                    self.showPopup("success", "Flashing Successful", "");
                    self.isBusy(false);
                    self.showAlert(false);
                    self.hexFileName(undefined);
                    self.hexFileURL(undefined);
                } else if (data.status_value == "error") {
                    self.showPopup("error", "Flashing Failed", data.status_description);
                    self.isBusy(false);
                    self.showAlert(false);
                }
            }
        }
        
        // Popup Messages

        self.showUpdateAvailablePopup = function(new_fw_version) {
            self.updateAvailablePopup = new PNotify({
                title: gettext('Firmware Update Available'),
                text: gettext('Version ') + new_fw_version,
                icon: true,
                hide: false,
                type: 'success',
                buttons: {
                    closer: true,
                    sticker: false,
                },
                history: {
                    history: false
                }
            });
        }

        self.showPopup = function(message_type, title, text){
            if (self.popup !== undefined){
                self.closePopup();
            }
            self.popup = new PNotify({
                title: gettext(title),
                text: text,
                type: message_type,
                hide: false
            });
        }

        self.closePopup = function() {
            if (self.popup !== undefined) {
                self.popup.remove();
            }
        }

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
