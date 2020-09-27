// Based on examples written by Don Coleman as part of his 
// cordova-central-ble library

// Somehow a bunch of stuff is global, not sure how this is done...
//
/* global mainPage, deviceList, refreshButton */
/* global detailPage, resultDiv, messageInput, sendButton, disconnectButton */
/* global ble  */
/* jshint browser: true , devel: true*/

'use strict';

// ASCII only
function bytesToString(buffer) {
    return String.fromCharCode.apply(null, new Uint8Array(buffer));
}

// ASCII only
function stringToBytes(string) {
    var array = new Uint8Array(string.length);
    for (var i = 0, l = string.length; i < l; i++) {
        array[i] = string.charCodeAt(i);
    }
    return array.buffer;
}

// this is Nordic's UART service
var nisten_ble = {
    serviceUUID: '7b183224-9168-443e-a927-7aeea07e8105',
    rwCharacteristic: '56cd7757-5f47-4dcd-a787-07d648956068',
    sppCharacteristic: 'fec26ec4-6d71-4442-9f81-55bc21d658d6',
    datainCharacteristic: '398d2a6c-b541-4160-b4b0-c59b4e27a1bb'
};

var app = {
    initialize: function() {
        this.bindEvents();
        detailPage.hidden = true;
    },
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
        refreshButton.addEventListener('touchstart', this.refreshDeviceList, false);
        sendButton.addEventListener('click', this.sendData, false);
        startButton.addEventListener('click', this.sendStart, false);
        stopButton.addEventListener('click', this.sendStop, false);
        disconnectButton.addEventListener('touchstart', this.disconnect, false);
        deviceList.addEventListener('touchstart', this.connect, false); // assume not scrolling
    },
    onDeviceReady: function() {
        app.refreshDeviceList();
    },
    refreshDeviceList: function() {
        deviceList.innerHTML = ''; // empties the list
        ble.scan([nisten_ble.serviceUUID], 5, app.onDiscoverDevice, app.onError);
        // if Android can't find your device try scanning for all devices
        // ble.scan([], 5, app.onDiscoverDevice, app.onError);
    },
    onDiscoverDevice: function(device) {
        var listItem = document.createElement('li'),
            html = '<b>' + device.name + '</b><br/>' +
                'RSSI: ' + device.rssi + '&nbsp;|&nbsp;' +
                device.id;

        listItem.dataset.deviceId = device.id;
        listItem.innerHTML = html;
        deviceList.appendChild(listItem);
    },
    connect: function(e) {
        var errorConnect = function () {
            app.onError("Failed to connect");
            app.showMainPage();
        }
        var deviceId = e.target.dataset.deviceId,
            onConnect = function(peripheral) {
                sendButton.dataset.deviceId = deviceId;
                startButton.dataset.deviceId = deviceId;
                stopButton.dataset.deviceId = deviceId;
                disconnectButton.dataset.deviceId = deviceId;
                resultDiv.innerHTML = "";
                app.deviceId = deviceId;
                app.getStatus(deviceId, app.handleI);
            };
        resultDiv.innerHTML = "";
        app.showDetailPage();
        app.log("Trying to connect");
        ble.connect(deviceId, onConnect, errorConnect);
    },
    onData: function(data) { // data received from Arduino
        console.log(data);
        resultDiv.innerHTML = resultDiv.innerHTML + "Received: " + bytesToString(data) + "<br/>";
        resultDiv.scrollTop = resultDiv.scrollHeight;
    },
    sendData: function(event) { // send data to Arduino

        var success = function() {
            console.log("success");
            resultDiv.innerHTML = resultDiv.innerHTML + "Sent: " + messageInput.value + "<br/>";
            resultDiv.scrollTop = resultDiv.scrollHeight;
        };

        var failure = function() {
            alert("Failed writing data to the nisten_ble");
        };

        var data = stringToBytes(messageInput.value);
        var deviceId = event.target.dataset.deviceId;

        if (app.writeWithoutResponse) {
            ble.writeWithoutResponse(
                deviceId,
                nisten_ble.serviceUUID,
                nisten_ble.txCharacteristic,
                data, success, failure
            );
        } else {
            ble.write(
                deviceId,
                nisten_ble.serviceUUID,
                nisten_ble.txCharacteristic,
                data, success, failure
            );
        }

    },
    sendCmd: function(deviceId, data, success, failure ) {
        // resultDiv.innerHTML = resultDiv.innerHTML + "sendCmd "+ data  + "<br/>";
        // resultDiv.scrollTop = resultDiv.scrollHeight;
        ble.write(
            deviceId,
            nisten_ble.serviceUUID,
            nisten_ble.rwCharacteristic,
            data, success, failure
        );
    },
    sendSpp: function(deviceId, data, success, failure ) {
        // resultDiv.innerHTML = resultDiv.innerHTML + "sendSpp "+data.byteLength  + "<br/>";
        // resultDiv.scrollTop = resultDiv.scrollHeight;
        ble.writeWithoutResponse(  // ble.write does not work.
            deviceId,
            nisten_ble.serviceUUID,
            nisten_ble.sppCharacteristic,
            data, success, failure
        );
    },
    log: function(msg,newline=true) {
        resultDiv.innerHTML = resultDiv.innerHTML + msg;
        if (newline) {
            resultDiv.innerHTML += "<br/>";
        }
        resultDiv.scrollTop = resultDiv.scrollHeight;
    },
    sendStart: function(event) { // send data to Arduino
        var failure = function() {
            alert("Failed to send start");
        };
        var success = function() {
            app.log("Start: "+ new Date().toLocaleString());
            // resultDiv.innerHTML = resultDiv.innerHTML + "Start " + "<br/>";
            // resultDiv.scrollTop = resultDiv.scrollHeight;
            app.setStartStopButtons( true );
        };

        var successConfig = function() {
            // resultDiv.innerHTML = resultDiv.innerHTML + "config -> spp " + "<br/>";
            // resultDiv.scrollTop = resultDiv.scrollHeight;
            let data = stringToBytes("w");
            app.sendCmd(deviceId, data, success, failure);

        };

        var successR = function() {
            // resultDiv.innerHTML = resultDiv.innerHTML + "Raw " + "<br/>";
            // resultDiv.scrollTop = resultDiv.scrollHeight;
            var orientation;
            let orientationValue = document.getElementById("orientation").value;
            if (orientationValue === 'baseline') {
                orientation = 0;
            } else {
                orientation = orientationValue.charCodeAt(0) - 'a'.charCodeAt(0) + 1;
            }
            let d = document.getElementById("calibration-distance").value * 100;
            let config_array = new Uint16Array(2);
            config_array[0] = d;
            config_array[1] = orientation;


            // resultDiv.innerHTML = resultDiv.innerHTML + "array:" + config_array.length + "<br/>";
            // resultDiv.scrollTop = resultDiv.scrollHeight;
            // resultDiv.innerHTML = resultDiv.innerHTML + "app.deviceId:" + app.deviceId +":"+deviceId + "<br/>";
            // resultDiv.scrollTop = resultDiv.scrollHeight;
            app.sendSpp(deviceId, config_array.buffer, successConfig, failure);
            //successConfig();
        };

        var deviceId = event.target.dataset.deviceId;
        let data = stringToBytes("R");
        app.sendCmd(deviceId, data, successR, failure);


    },
    sendStop: function(event) { // send data to Arduino

        var success = function() {
            app.log("Stop: "+ new Date().toLocaleString());
            // resultDiv.innerHTML = resultDiv.innerHTML + "Stop" + "<br/>";
            // resultDiv.scrollTop = resultDiv.scrollHeight;
            app.setStartStopButtons( false );
        };

        var failure = function() {
            alert("Failed to send stop");
        };

        var deviceId = event.target.dataset.deviceId;
        var data = stringToBytes("s");
        app.sendCmd(deviceId, data, success, app.onError);
    },
    setTime: function() {
        let times = new Uint32Array(3);
        let count = 0;
        let epoch_time1 = (new Date()).getTime();
        let epoch_time2;
        var finishedO = function() {
            resultDiv.innerHTML = resultDiv.innerHTML + "Finished setting time <br/>";
            resultDiv.scrollTop = resultDiv.scrollHeight;
        }
        var sendO = function() {
            var data = stringToBytes("O");
            app.sendCmd(app.deviceId, data, finishedO, app.onError);
        };
        var doneA = function() {
            resultDiv.innerHTML = resultDiv.innerHTML + "Got uptime <br/>";
            resultDiv.scrollTop = resultDiv.scrollHeight;
            app.sendSpp(app.deviceId, times.buffer, sendO, app.onErr);
        };
        var success = function() {
            // resultDiv.innerHTML = resultDiv.innerHTML + "Sent cmd A: <br/>";
            // resultDiv.scrollTop = resultDiv.scrollHeight;
        };
        var readA = function(buffer) {
            var data = new Uint32Array(buffer);
            times[count+1] = data[0]
            // resultDiv.innerHTML = resultDiv.innerHTML + "readA " + times[count] + "<br/>";
            // resultDiv.scrollTop = resultDiv.scrollHeight;
            count++;
            if (count==2) {
                epoch_time2 = (new Date()).getTime();

                let mean = parseInt((epoch_time1 + epoch_time2) / 2);
                let offset = mean % 1000;
                mean = parseInt(mean / 1000);
                times[0] = mean;
                times[1] -= offset;

                // resultDiv.innerHTML = resultDiv.innerHTML + "times: " + times + "<br/>";
                // resultDiv.scrollTop = resultDiv.scrollHeight;
                ble.stopNotification(app.deviceId, nisten_ble.serviceUUID,
                    nisten_ble.sppCharacteristic, doneA, app.onError);
            }
        }
        // resultDiv.innerHTML = resultDiv.innerHTML + "start to get uptime" + "<br/>";
        // resultDiv.scrollTop = resultDiv.scrollHeight;
        ble.startNotification(app.deviceId, nisten_ble.serviceUUID, nisten_ble.sppCharacteristic, readA, app.onError);
        var data = stringToBytes("A");
        app.sendCmd(app.deviceId, data, success, app.onError);
    },
    getStatus: function(deviceId, callback) {
        var success = function() {
            app.log("Trying to get ", false);
            // resultDiv.innerHTML = resultDiv.innerHTML + "Trying to get status: ";
            // resultDiv.scrollTop = resultDiv.scrollHeight;
        };
        ble.startNotification(deviceId, nisten_ble.serviceUUID, nisten_ble.sppCharacteristic, callback, app.onError);
        var data = stringToBytes("I");
        app.sendCmd(deviceId, data, success, app.onError);
    },
    handleI: function(buffer) {
        var data = new Uint8Array(buffer);
        app.log("status :" + data[0]);
        // resultDiv.innerHTML = resultDiv.innerHTML + "status: " + data[0] + "<br/>";
        // resultDiv.scrollTop = resultDiv.scrollHeight;
        app.setStartStopButtons( data[0]&1 );
        ble.stopNotification(app.deviceId, nisten_ble.serviceUUID, nisten_ble.sppCharacteristic,
            app.onDone, app.onError);
    },
    onDone: function(){
        // resultDiv.innerHTML = resultDiv.innerHTML + "Stopped notification I" + "<br/>";
        // resultDiv.scrollTop = resultDiv.scrollHeight;
        // set scan parameters now
        let interval = 320;
        let time_window = 320;
        var success = function() {
            console.log("success");
            // resultDiv.innerHTML = resultDiv.innerHTML + "set scan parameters"+ "<br/>";
            // resultDiv.scrollTop = resultDiv.scrollHeight;
            app.setTime();
        };
        var sendB = function() {
            // resultDiv.innerHTML = resultDiv.innerHTML + "sent info, try to send cmdB"+ "<br/>";
            // resultDiv.scrollTop = resultDiv.scrollHeight;
            var data = stringToBytes("B");
            app.sendCmd(app.deviceId, data, success, app.onError);
        }
        let scan_array = new Uint16Array(2);
        scan_array[0] = interval;
        scan_array[1] = time_window;
        // resultDiv.innerHTML = resultDiv.innerHTML + "Send scan_array" + scan_array+ "<br/>";
        // resultDiv.scrollTop = resultDiv.scrollHeight;
        app.sendSpp(app.deviceId, scan_array.buffer, sendB, app.onError);
    },
    disconnect: function(event) {
        var deviceId = event.target.dataset.deviceId;
        // Try to clear messages
        resultDiv.innerHTML = "";
        ble.disconnect(deviceId, app.showMainPage, app.onError);
    },
    showMainPage: function() {
        mainPage.hidden = false;
        detailPage.hidden = true;
    },
    showDetailPage: function() {
        mainPage.hidden = true;
        detailPage.hidden = false;
    },
    setStartStopButtons(started) {
        if (started) {
            // already taking data, disable start
            document.getElementById("startButton").disabled = true;
            document.getElementById("stopButton").disabled = false;
        } else {
            document.getElementById("startButton").disabled = false;
            document.getElementById("stopButton").disabled = true;
        }
    },
    onError: function(reason) {
        alert("ERROR: " + JSON.stringify(reason)); // real apps should use notification.alert
    }
};
