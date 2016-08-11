# OctoPrint-BigBoxFirmware 

Plugin to enable and disable features in the firmware and compile and flash using OctoPi. <br>


### Parameters:
		Each entry represents a #define variable from Configuration.h or Configuration_adv.h.

#### Define Identifier:
		The #define variable name from Configuration.h or Configuration_adv.h.
	
#### Value:
		The value of the #define variable. Leave blank if no value is used.
		
#### Enabled:
		If this check box is not ticked the #define variable will be commented out in the configuration files.
		I.e: Enabled => "#define EXTRUDERS 2" , not enabled => "//#define EXTRUDERS 2"
		
		

## Setup

Install via the bundled [Plugin Manager](https://github.com/foosel/OctoPrint/wiki/Plugin:-Plugin-Manager)
or manually using this URL:

    https://github.com/tohara/OctoPrint-BigBoxFirmware/archive/master.zip
