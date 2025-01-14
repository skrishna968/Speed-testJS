/*
 * *
 *  Copyright 2014 Comcast Cable Communications Management, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 * /
 */
(function () {
  'use strict';
  //setting the initialization method for latency test suite
  var oldOnload = window.onload;
  window.onload = function () {
    void (oldOnload instanceof Function && oldOnload());
    //init for test
    initTest();
  };

  var testRunner = [];
  var currentInterval;
  var testButtonText = 'Start';
  var testPlan;
  var startTestButton;
  var firstRun = true;
  var downloadSize = 230483949;
  var testServerTimeout = 2000;
  var latencyTimeout = 3000;
  var downloadCurrentRuns = 18;
  var downloadTestTimeout = 12000;
  var downloadTestLength = 12000;
  var downloadMovingAverage = 18;
  var downloadProgressInterval = 25;
  var downloadUrls = [];
  var ports = [5020, 5021, 5022, 5023, 5024, 5025];
  var downloadMonitorInterval = 100;
  var uploadSize = 75000;
  var uploadCurrentRuns = 4;
  var uploadTestTimeout = 12000;
  var uploadTestLength = 12000;
  var uploadMovingAverage = 18;
  var uploadUrls = [];
  var uploadMonitorInterval = 200;
  var isMicrosoftBrowser = false;
  var sliceStartValue = 0.3;
  var sliceEndValue = 0.9;

  function initTest() {
    function addEvent(el, ev, fn) {
      void (el.addEventListener && el.addEventListener(ev, fn, false));
      void (el.attachEvent && el.attachEvent('on' + ev, fn));
      void (!(el.addEventListener || el.attachEvent) && function (el, ev) { el['on' + ev] = fn } (el, ev));
    }
    startTestButton = document.querySelector(".action-start");
    addEvent(startTestButton, 'click', function () {
      startTest();
    });
    getTestPlan(function (testPlan) {
      //initialize speedometer


      //show ipv6 fields if supported
      var resultsEl = document.querySelectorAll('.IPv6');
      if (testPlan.hasIPv6) {
        for (var i = 0; i < resultsEl.length; i++) {
          removeClass(resultsEl[i], 'hide');
        }
      }

      latencyTest(testPlan.hasIPv6 ? 'IPv6' : 'IPv4');

    });
  }

  function hasClass(el, className) {
    return (el.classList) ? el.classList.contains(className) : !!el.className.match(new RegExp('(\\s|^)' + className + '(\\s|$)'));
  }

  function addClass(el, className) {
    if (!hasClass(el, className)) {
      el.className += " " + className;
      return;
    }
    void (el.classList && el.classList.add(className));
  }

  function removeClass(el, className) {
    if (hasClass(el, className)) {
      var reg = new RegExp('(\\s|^)' + className + '(\\s|$)');
      el.className = el.className.replace(reg, ' ');
      return;
    }
    void ((el.classList) && el.classList.remove(className));
  }


  function getTestPlan(func) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
      if (xhr.readyState == XMLHttpRequest.DONE) {
        var data = JSON.parse(xhr.responseText);
        testPlan = data;
        testPlan.hasIPv6 = false;
        if (testPlan.performLatencyRouting) {
          latencyBasedRouting();
        }
        void ((func && func instanceof Function) && func(data));
      }
    };
    xhr.open('GET', '/testplan', true);
    xhr.send(null);
  }

  function latencyBasedRoutingOnComplete(result) {
    //TODO update the base urls for websockets if you want to perform the latency test via websockets
    testPlan.baseUrlIPv4 = result.IPv4Address;
    testPlan.baseUrlIPv6 = result.IPv6Address;
  }

  function latencyBasedRoutingOnError(result) {
    console.log(result);
  }

  function latencyBasedRouting() {
    // pass in the client location instead of the hard coded value
    var latencyBasedRouting = new window.latencyBasedRouting('NJ', '/testServer', testServerTimeout, latencyTimeout, latencyBasedRoutingOnComplete, latencyBasedRoutingOnError);
    latencyBasedRouting.getNearestServer();
  }

  function startTest() {

    if (firstRun) {
      firstRun = false;
    } else {
      var resultsEl = document.querySelectorAll('.test-result');
      for (var i = 0; i < resultsEl.length; i++) {
        resultsEl[i].innerHTML = '';
      }
    }


    void (setTimeout(function () { !firstRun && downloadTest(testPlan.hasIPv6 ? 'IPv6' : 'IPv4'); }, 500));

    //update button text to communicate current state of test as In Progress
    startTestButton.innerHTML = 'Testing in Progress ...';
    //disable button
    startTestButton.disabled = true;
    //set accessiblity aria-disabled state.
    //This will also effect the visual look by corresponding css
    startTestButton.setAttribute('aria-disabled', true);
  }

  function formatSpeed(value) {
    var value = parseFloat(Math.round(value * 100) / 100).toFixed(2);
    value = (value > 1000) ? parseFloat(value / 1000).toFixed(2) + ' Gbps' : value + ' Mbps';
    return value;
  }

  function latencyTest(version) {
    var currentTest = 'latency';

    function latencyHttpOnComplete(result) {

      result = result.sort(function (a, b) {
        return +a.time - +b.time;
      });

      if(version === 'IPv6'){
        setTimeout(latencyTest('IPv4'),500);
      }
      else{
        updateValue(currentTest, result[0].time.toFixed(2) + ' ms');
      }

    }

    function latencyHttpOnProgress() {
    }

    function latencyHttpOnAbort(result) {
      if(result && result.results && result.results.length === 0) {
        startTestButton.setAttribute('aria-disabled', false);
        //update button text to communicate current state of test as In Progress
        startTestButton.innerHTML = 'Start Test';
        //enable start button
        startTestButton.disabled = false;
      }else{
        result = result.results.sort(function (a, b) {
          return +a.time - +b.time;
        });
        updateValue(currentTest, result[0].time.toFixed(2) + ' ms');
      }
      if (version === 'IPv6') {
        latencyTest('IPv4');
        return;
      }
    }

    function latencyHttpOnTimeout(result) {
      if(result && result.results && result.results.length === 0) {
        //This will also effect the visual look by corresponding css
        startTestButton.setAttribute('aria-disabled', false);
        //update button text to communicate current state of test as In Progress
        startTestButton.innerHTML = 'Start Test';
        //enable start button
        startTestButton.disabled = false;
      }else{
        result = result.results.sort(function (a, b) {
          return +a.time - +b.time;
        });
        updateValue(currentTest, result[0].time + ' ms');
      }
      if (version === 'IPv6') {
        latencyTest('IPv4');
        return;
      }
    }

    function latencyHttpOnError(result) {
      if(result && result.results && result.results.length === 0) {
        //set accessiblity aria-disabled state.
        //This will also effect the visual look by corresponding css
        startTestButton.setAttribute('aria-disabled', false);
        //update button text to communicate current state of test as In Progress
        startTestButton.innerHTML = 'Start Test';
        //enable start button
        startTestButton.disabled = false;
      }else{
        result = result.results.sort(function (a, b) {
          return +a.time - +b.time;
        });
        updateValue(currentTest, result[0].time + ' ms');
      }
      if (version === 'IPv6') {
        latencyTest('IPv4');
        return;
      }
    }

    var baseUrl = (version === 'IPv6') ? 'http://' + testPlan.baseUrlIPv6 + '/latency' : 'http://' + testPlan.baseUrlIPv4 + '/latency';

    var latencyHttpTestSuite = new window.latencyHttpTest(baseUrl, 10, 3000, latencyHttpOnComplete, latencyHttpOnProgress,
      latencyHttpOnAbort, latencyHttpOnTimeout, latencyHttpOnError);
    latencyHttpTestSuite.initiateTest();
  }

  function updateValue(selector, value) {
    var sel = ['.', selector, '-result'].join('');
    var dom = document.querySelector(sel);

    if (dom) {
      dom.innerHTML = value;
    }
  }

  function mobileAndTabletcheck() {
    var check = false;
    (function(a) {
        if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)))
        check = true;
    })(navigator.userAgent||navigator.vendor||window.opera);
    return check;
  };


  function downloadTest(version) {
    var currentTest = 'download';

    function calculateStatsonComplete(result) {
      var finalValue = parseFloat(Math.round(result.stats.mean * 100) / 100).toFixed(2);
      finalValue = (finalValue > 1000) ? parseFloat(finalValue / 1000).toFixed(2) + ' Gbps' : finalValue + ' Mbps';
      void (version === 'IPv6' && downloadTest('IPv4'));

      if(version==='IPv4'){
        void (!(testPlan.hasIPv6 === 'IPv6') && setTimeout(function () { !firstRun && uploadTest(testPlan.hasIPv6 ? 'IPv6' : 'IPv4'); }, 500));
      }
      //void (!(version === 'IPv6') && uploadTest(testPlan.hasIPv6 ? 'IPv6' : 'IPv4'));
      updateValue([currentTest, '-', version].join(''), finalValue);
    }

    function downloadHttpOnComplete(result) {

        var calculateMeanStats = new window.statisticalCalculator(result, false, sliceStartValue, sliceEndValue, calculateStatsonComplete);
        calculateMeanStats.getResults();
    }

    function downloadHttpOnProgress(result) {
      console.log(result)
document.getElementById("download-progress-result").innerHTML = result.toFixed(2);;
    }

    function downloadHttpOnAbort(result) {
      if (version === 'IPv6') {
        testPlan.hasIPv6 = false;
        downloadTest('IPv4');
        return;
      }
      //set accessiblity aria-disabled state.
      //This will also effect the visual look by corresponding css
      startTestButton.setAttribute('aria-disabled', false);
      //update button text to communicate current state of test as In Progress
      startTestButton.innerHTML = 'Start Test';
      //enable start button
      startTestButton.disabled = false;
    }

    function downloadHttpOnTimeout(result) {
      if (version === 'IPv6') {
        testPlan.hasIPv6 = false;
        downloadTest('IPv4');
        return;
      }
      //set accessiblity aria-disabled state.
      //This will also effect the visual look by corresponding css
      startTestButton.setAttribute('aria-disabled', false);
      //update button text to communicate current state of test as In Progress
      startTestButton.innerHTML = 'Start Test';
      //enable start button
      startTestButton.disabled = false;
    }

    function downloadHttpOnError(result) {
      if (version === 'IPv6') {
        testPlan.hasIPv6 = false;
        downloadTest('IPv4');
        return;
      }
      //set accessiblity aria-disabled state.
      //This will also effect the visual look by corresponding css
      startTestButton.setAttribute('aria-disabled', false);
      //update button text to communicate current state of test as In Progress
      startTestButton.innerHTML = 'Start Test';
      //enable start button
      startTestButton.disabled = false;
    }

    downloadUrls.length=0;
    var baseUrl = (version === 'IPv6') ? testPlan.baseUrlIPv6NoPort : testPlan.baseUrlIPv4NoPort;
    for (var i = 0; i < ports.length; i++) {
      for(var b= 0; b <6; b++ )
      {
        downloadUrls.push('http://' + baseUrl + ':' + ports[i] + '/download?bufferSize=');
      }
    }

    var isHandheld = mobileAndTabletcheck();
    if (isHandheld) {
        downloadCurrentRuns = 4;
        downloadSize = 20000000;
        downloadTestTimeout = 10000;
        downloadTestLength = 10000;
    } else {
      performDesktopDownloadTest(version);
      return;
    }

    var downloadHttpConcurrentProgress = new window.downloadHttpConcurrentProgress(downloadUrls, 'GET', downloadCurrentRuns, downloadTestTimeout, downloadTestLength, downloadMovingAverage, downloadHttpOnComplete, downloadHttpOnProgress,
      downloadHttpOnAbort, downloadHttpOnTimeout, downloadHttpOnError,downloadSize, downloadProgressInterval,downloadMonitorInterval, isHandheld);

    downloadHttpConcurrentProgress.initiateTest();
  }

  function performDesktopDownloadTest(version) {
    var currentTest = 'download';

    function downloadHttpOnProgress(event) {

      document.getElementById("download-progress-result").innerHTML = event.toFixed(2);
    }

    function downloadHttpOnComplete(event) {
      updateValue([currentTest, '-', version].join(''), event.downloadSpeed.toFixed(2));
      setTimeout(function() { uploadTest(version); }, 500);
    }

    function downloadHttpOnError(event) {
      console.log(event);
    }

    downloadSize = 200000000;
    downloadCurrentRuns = 18;
    downloadTestLength = 15000;
    downloadMonitorInterval = 1000;

    var downloadTest = new window.algoV1(downloadUrls, downloadSize,
            downloadCurrentRuns,downloadTestLength, downloadMonitorInterval,
            downloadHttpOnProgress, downloadHttpOnComplete, downloadHttpOnError);

    downloadTest.initiateTest();

}

  function uploadTest(version) {
    var currentTest = 'upload';

    function uploadHttpOnComplete(result) {
      var finalValue = parseFloat(Math.round(result.mean * 100) / 100).toFixed(2);
      finalValue = (finalValue > 1000) ? parseFloat(finalValue / 1000).toFixed(2) + ' Gbps' : finalValue + ' Mbps';
      void ((version === 'IPv6') && uploadTest('IPv4'));
      if (!(version === 'IPv6')) {
        //update dom with final result
        startTestButton.disabled = false;
        //update button text to communicate current state of test as In Progress
        startTestButton.innerHTML = 'Start Test';
        //set accessiblity aria-disabled state.
        //This will also effect the visual look by corresponding css
        startTestButton.setAttribute('aria-disabled', false);
        startTestButton.disabled = false;
      }

      updateValue([currentTest, '-', version].join(''), finalValue);
    }
    function uploadHttpOnProgress(result) {
        document.getElementById("upload-progress-result").innerHTML = result.toFixed(2);
    }
    function uploadHttpOnError(result) {
      if (version === 'IPv6') {
        testPlan.hasIPv6 = false;
        uploadTest('IPv4');
        return;
      }
      //set accessiblity aria-disabled state.
      //This will also effect the visual look by corresponding css
      startTestButton.setAttribute('aria-disabled', false);
      //update button text to communicate current state of test as In Progress
      startTestButton.innerHTML = 'Start Test';
      //enable start button
      startTestButton.disabled = false;
    }

      //TODO needs to removed once we know the issues  with ie
      if (navigator.appVersion.indexOf("MSIE") != -1 || navigator.appVersion.indexOf("Trident") != -1 || navigator.appVersion.indexOf("Edge") != -1) {
          isMicrosoftBrowser = true;
      }

      var baseUrl = (version === 'IPv6') ? testPlan.baseUrlIPv6NoPort : testPlan.baseUrlIPv4NoPort;
      uploadUrls.length = 0;
      for (var i = 0; i < ports.length; i++) {
          for (var b = 0; b < 6; b++) {
              uploadUrls.push('http://' + baseUrl + ':' + ports[i] + '/upload');

          }
      }

      var uploadHttpConcurrentProgress = new window.uploadHttpConcurrentProgress(uploadUrls, 'POST', uploadCurrentRuns, uploadTestTimeout, uploadTestLength, uploadMovingAverage, uploadHttpOnComplete, uploadHttpOnProgress,
          uploadHttpOnError, uploadSize, testPlan.maxuploadSize, uploadMonitorInterval, isMicrosoftBrowser);

      uploadHttpConcurrentProgress.initiateTest();
  }

})();
