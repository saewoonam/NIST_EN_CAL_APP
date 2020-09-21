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
        var deviceId = e.target.dataset.deviceId,
            onConnect = function(peripheral) {
                sendButton.dataset.deviceId = deviceId;
                startButton.dataset.deviceId = deviceId;
                stopButton.dataset.deviceId = deviceId;
                disconnectButton.dataset.deviceId = deviceId;
                resultDiv.innerHTML = "";
                app.showDetailPage();
            };

        ble.connect(deviceId, onConnect, app.onError);
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
    sendStart: function(event) { // send data to Arduino
        var failure = function() {
            alert("Failed to send start");
        };
        var success = function() {
            console.log("success");
            resultDiv.innerHTML = resultDiv.innerHTML + "Start " + "<br/>";
            resultDiv.scrollTop = resultDiv.scrollHeight;
        };

        var successR = function() {
            console.log("success");
            resultDiv.innerHTML = resultDiv.innerHTML + "Raw " + "<br/>";
            resultDiv.scrollTop = resultDiv.scrollHeight;

            data = stringToBytes("w");

            ble.write(
                deviceId,
                nisten_ble.serviceUUID,
                nisten_ble.rwCharacteristic,
                data, success, failure
            );
        };

        var deviceId = event.target.dataset.deviceId;

        let data = stringToBytes("R");
        ble.write(
            deviceId,
            nisten_ble.serviceUUID,
            nisten_ble.rwCharacteristic,
            data, successR, failure
        );


    },
    sendStop: function(event) { // send data to Arduino

        var success = function() {
            console.log("success");
            resultDiv.innerHTML = resultDiv.innerHTML + "Stop" + "<br/>";
            resultDiv.scrollTop = resultDiv.scrollHeight;
        };

        var failure = function() {
            alert("Failed to send stop");
        };

        var deviceId = event.target.dataset.deviceId;
        var data = stringToBytes("s");

        ble.write(
            deviceId,
            nisten_ble.serviceUUID,
            nisten_ble.rwCharacteristic,
            data, success, failure
        );

    },
    disconnect: function(event) {
        var deviceId = event.target.dataset.deviceId;
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
    onError: function(reason) {
        alert("ERROR: " + JSON.stringify(reason)); // real apps should use notification.alert
    }
};
