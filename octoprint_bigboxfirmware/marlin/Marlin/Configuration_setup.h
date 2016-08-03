#define STRING_CONFIG_H_AUTHOR "(none, default config)"
#define SHOW_BOOTSCREEN

#define CUSTOM_MACHINE_NAME "BigBox"

#define TEMP_SENSOR_0 20
#define TEMP_SENSOR_1 20

#define TEMP_SENSOR_BED 5

#define HEATER_0_MAXTEMP 320
#define HEATER_1_MAXTEMP 320

#define BED_MAXTEMP 150


#define PID_AUTOTUNE_MENU // Add PID Autotune to the LCD "Temperature" menu to run M303 and apply the result.
#define PID_PARAMS_PER_HOTEND // Uses separate PID parameters for each extruder (useful for mismatched extruders)

#define  DEFAULT_Kp 29.20
#define  DEFAULT_Ki 04.73
#define  DEFAULT_Kd 45.33


  #define  DEFAULT_bedKp 336
  #define  DEFAULT_bedKi 61
  #define  DEFAULT_bedKd 462.4



#define X_PROBE_OFFSET_FROM_EXTRUDER 0   // X offset: -left  +right  [of the nozzle]
#define Y_PROBE_OFFSET_FROM_EXTRUDER 32  // Y offset: -front +behind [the nozzle]
#define Z_PROBE_OFFSET_FROM_EXTRUDER -1  // Z offset: -below +above  [the nozzle]
#define XY_PROBE_SPEED 3000

#define Z_MIN_PROBE_USES_Z_MIN_ENDSTOP_PIN


#define INVERT_E0_DIR true
#define INVERT_E1_DIR false

#define MIN_Z_HEIGHT_FOR_HOMING 4 // (in mm) Minimal z height before homing (G28) for Z clearance above the bed, clamps, ...

#define X_MIN_POS 0
#define Y_MIN_POS 0
#define Z_MIN_POS 0
#define X_MAX_POS 260
#define Y_MAX_POS 240
#define Z_MAX_POS 300

#define MESH_BED_LEVELING    // Enable mesh bed leveling.
  #define MESH_INSET 10        // Mesh inset margin on print area
  #define MESH_NUM_X_POINTS 3  // Don't use more than 7 points per axis, implementation limited.
  #define MESH_NUM_Y_POINTS 3
  #define MESH_HOME_SEARCH_Z 4  // Z after Home, bed somewhere below but above 0.0.
  //#define MESH_G28_REST_ORIGIN // After homing all axes ('G28' or 'G28 XYZ') rest at origin [0,0,0]
  #define MANUAL_BED_LEVELING  // Add display menu option for bed leveling.
    #define MBL_Z_STEP 0.025  // Step size while manually probing Z axis.
//#define AUTO_BED_LEVELING_FEATURE // Delete the comment to enable (remove // at the start of the line)

  #define AUTO_BED_LEVELING_GRID
    #define LEFT_PROBE_BED_POSITION 15
    #define RIGHT_PROBE_BED_POSITION 170
    #define FRONT_PROBE_BED_POSITION 20
    #define BACK_PROBE_BED_POSITION 170
    #define MIN_PROBE_EDGE 10 // The Z probe minimum square sides can be no smaller than this.
    #define AUTO_BED_LEVELING_GRID_POINTS 2
    #define ABL_PROBE_PT_1_X 15
    #define ABL_PROBE_PT_1_Y 180
    #define ABL_PROBE_PT_2_X 15
    #define ABL_PROBE_PT_2_Y 20
    #define ABL_PROBE_PT_3_X 170
    #define ABL_PROBE_PT_3_Y 20
  //#define Z_PROBE_END_SCRIPT "G1 Z10 F12000\nG1 X15 Y330\nG1 Z0.5\nG1 Z10" // These commands will be executed in the end of G29 routine.
//#define BED_CENTER_AT_0_0
//#define MANUAL_X_HOME_POS 0
//#define MANUAL_Y_HOME_POS 0
//#define MANUAL_Z_HOME_POS 0 // Distance between the nozzle to printbed after homing
//#define Z_SAFE_HOMING
  #define Z_SAFE_HOMING_X_POINT ((X_MIN_POS + X_MAX_POS) / 2)    // X point for Z homing when homing all axis (G28).
  #define Z_SAFE_HOMING_Y_POINT ((Y_MIN_POS + Y_MAX_POS) / 2)    // Y point for Z homing when homing all axis (G28).
#define HOMING_FEEDRATE_XY (50*60)
#define HOMING_FEEDRATE_Z  (4*60)
#define DEFAULT_AXIS_STEPS_PER_UNIT   {160,180,1600,304}  // default steps per unit for Ultimaker
#define DEFAULT_MAX_FEEDRATE          {150, 150, 6, 25}    // (mm/sec)
#define DEFAULT_MAX_ACCELERATION      {400,400,100,5000}    // X, Y, Z, E maximum start speed for accelerated moves. E default values are good for Skeinforge 40+, for older versions raise them a lot.
#define DEFAULT_ACCELERATION          400     // X, Y, Z and E acceleration in mm/s^2 for printing moves
#define DEFAULT_RETRACT_ACCELERATION  5000    // E acceleration in mm/s^2 for retracts
#define DEFAULT_TRAVEL_ACCELERATION   400     // X, Y, Z acceleration in mm/s^2 for travel (non printing) moves
#define DEFAULT_XYJERK                8.0    // (mm/sec)
#define DEFAULT_ZJERK                 0.4     // (mm/sec)
#define DEFAULT_EJERK                 5.0    // (mm/sec)

#define PREHEAT_1_TEMP_HOTEND 180
#define PREHEAT_1_TEMP_BED     70
#define PREHEAT_1_FAN_SPEED     0 // Value from 0 to 255
#define PREHEAT_2_TEMP_HOTEND 240
#define PREHEAT_2_TEMP_BED    110
#define PREHEAT_2_FAN_SPEED     0 // Value from 0 to 255

//#define NOZZLE_PARK_FEATURE
  #define NOZZLE_PARK_POINT { (X_MIN_POS + 10), (Y_MAX_POS - 10), 20 }
//#define NOZZLE_CLEAN_FEATURE
  #define NOZZLE_CLEAN_STROKES  12
  #define NOZZLE_CLEAN_START_POINT { 30, 30, (Z_MIN_POS + 1)}
  #define NOZZLE_CLEAN_END_POINT   {100, 60, (Z_MIN_POS + 1)}
  #define NOZZLE_CLEAN_GOBACK
#define PRINTJOB_TIMER_AUTOSTART
//#define PRINTCOUNTER

#define ENCODER_PULSES_PER_STEP 4
#define ENCODER_STEPS_PER_MENU_ITEM 1
//#define REVERSE_ENCODER_DIRECTION
//#define REVERSE_MENU_DIRECTION
//#define INDIVIDUAL_AXIS_HOMING_MENU

#define LCD_FEEDBACK_FREQUENCY_DURATION_MS 2
#define LCD_FEEDBACK_FREQUENCY_HZ 100



//#define BABYSTEPPING
  #define BABYSTEP_XY  //not only z, but also XY in the menu. more clutter, more functions
  #define BABYSTEP_INVERT_Z false  //true for inverse movements in Z
  #define BABYSTEP_MULTIPLICATOR 1 //faster movements
//#define ADVANCE
  #define EXTRUDER_ADVANCE_K .0
  #define D_FILAMENT 2.85
//#define LIN_ADVANCE
  #define LIN_ADVANCE_K 75
  #define MESH_MIN_X (X_MIN_POS + MESH_INSET)
  #define MESH_MAX_X (X_MAX_POS - (MESH_INSET))
  #define MESH_MIN_Y (Y_MIN_POS + MESH_INSET)
  #define MESH_MAX_Y (Y_MAX_POS - (MESH_INSET))
#define ARC_SUPPORT  // Disabling this saves ~2738 bytes
#define MM_PER_ARC_SEGMENT 1
#define N_ARC_CORRECTION 25



//#define FWRETRACT  //ONLY PARTIALLY TESTED
  #define MIN_RETRACT 0.1                //minimum extruded mm to accept a automatic gcode retraction attempt
  #define RETRACT_LENGTH 3               //default retract length (positive mm)
  #define RETRACT_LENGTH_SWAP 13         //default swap retract length (positive mm), for extruder change
  #define RETRACT_FEEDRATE 45            //default feedrate for retracting (mm/s)
  #define RETRACT_ZLIFT 0                //default retract Z-lift
  #define RETRACT_RECOVER_LENGTH 0       //default additional recover length (mm, added to retract length when recovering)
  #define RETRACT_RECOVER_LENGTH_SWAP 0  //default additional swap recover length (mm, added to retract length when recovering from extruder change)
  #define RETRACT_RECOVER_FEEDRATE 8     //default feedrate for recovering from retraction (mm/s)
