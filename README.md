#  NIST Exposure Notification Calibration

This is a mobile app that is written for cordova and uses the cordova package to communicate via bluetooth with NIST expsoure notification hardware.   The purpose of the app is to communicate with the hardware to start and stop data collection.

## Requirements
- Install cordova
- Use cordova-plugin-ble-central repo cited below instead of the standard repo.... Seems to help with android bugs having to do with gps
## Android

        cordova platform add android
        cordova plugin add git+https://github.com/rajeshpandalss/cordova-plugin-ble-central.git
        cordova run android

## iOS

        cordova platform add ios
        cordova plugin add git+https://github.com/rajeshpandalss/cordova-plugin-ble-central.git
        cordova run ios

Note: Sometimes Xcode can't deploy from the command line. If that happens, open NIST-EN-CAL.xcworkspace and deploy to your phone using Xcode.

    open platforms/ios/NIST-EN-CAL.xcworkspace

## To deploy to app store
-  Remember to build for Generic iOS device
-  Select Build Archive, this is greyed out if a specific device has been selected
-  Go to Organizer to upload/validate app
