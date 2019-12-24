// https://gist.github.com/jonleighton/958841
// bytes: Uint8Array
function uint8ArrayToBase64(bytes) {
  var base64    = ''
  var encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  var byteLength    = bytes.byteLength
  var byteRemainder = byteLength % 3
  var mainLength    = byteLength - byteRemainder
  var a, b, c, d
  var chunk
  for (var i = 0; i < mainLength; i = i + 3) {
    chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]
    a = (chunk & 16515072) >> 18 // 16515072 = (2^6 - 1) << 18
    b = (chunk & 258048)   >> 12 // 258048   = (2^6 - 1) << 12
    c = (chunk & 4032)     >>  6 // 4032     = (2^6 - 1) << 6
    d = chunk & 63               // 63       = 2^6 - 1
    base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d]
  }
  if (byteRemainder == 1) {
    chunk = bytes[mainLength]
    a = (chunk & 252) >> 2 // 252 = (2^6 - 1) << 2
    b = (chunk & 3)   << 4 // 3   = 2^2 - 1
    base64 += encodings[a] + encodings[b] + '=='
  } else if (byteRemainder == 2) {
    chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1]
    a = (chunk & 64512) >> 10 // 64512 = (2^6 - 1) << 10
    b = (chunk & 1008)  >>  4 // 1008  = (2^6 - 1) << 4
    c = (chunk & 15)    <<  2 // 15    = 2^4 - 1
    base64 += encodings[a] + encodings[b] + encodings[c] + '='
  }
  return base64
}


// https://stackoverflow.com/a/21797381
// https://stackoverflow.com/a/7261048
function base64ToUint8Array(uri) { // i.e. base64.b64_decode() in python
    var binary_string =  window.atob(uri.split(",")[1]);
    var len = binary_string.length;
    var bytes = new Uint8Array( len );
    for (var i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes;
}

zxing = ZXing();

function scanBarcode(canvasElement, format) {

    var imgWidth = canvasElement.width;
    var imgHeight = canvasElement.height;
    var imageData = canvasElement.getContext('2d').getImageData(0, 0, imgWidth, imgHeight);
    var sourceBuffer = imageData.data;

    var buffer = zxing._malloc(sourceBuffer.byteLength);
    zxing.HEAPU8.set(sourceBuffer, buffer);
    var result = zxing.readBarcodeFromPixmap(buffer, imgWidth, imgHeight, true, format);
    zxing._free(buffer);
    return result;

}

var state = {
  scanActive: null,
  targetElement: null,
  codeCallback: renderCodeToTargetElement,
  values: []
}

function renderCodeInOutputMessage(code) {
  var outputContainer = document.getElementById("output");
  var outputMessage = document.getElementById("outputMessage");
  var outputData = document.getElementById("outputData");

  outputContainer.hidden = false;

  if (code.error) {
    outputMessage.hidden = true;
    outputData.parentElement.hidden = false;
    outputData.innerText = code.error;
  } else if(code.format) {
    outputMessage.hidden = true;
    outputData.parentElement.hidden = false;
    outputData.innerText = code.text;
  } else {
    outputMessage.hidden = false;
    outputData.parentElement.hidden = true;
  }
}

function renderCodeToTargetTextArea(code) {
  if (code.format) {
    var currentValue = state.targetElement.value.trim();
    if (!currentValue.match(code.text)) {
      currentValue = currentValue + "\n" + code.text;
    }
    state.targetElement.value = currentValue
  }
}

function renderCodeToTargetElement(code) {
  if (state.targetElement.localName == "textarea") {
    renderCodeToTargetTextArea(code);
  }
}


function initializeScanner() {
  console.log("initialize")
  var video = document.createElement("video");
  var canvasElement = document.getElementById("zxing-canvas");
  var canvas = canvasElement.getContext("2d");
  var loadingMessage = document.getElementById("loadingMessage");

  function scanFrame() {
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvasElement.hidden = false;

      canvasElement.height = video.videoHeight;
      canvasElement.width = video.videoWidth;
      canvas.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);

      var format = "";
      try {
        var code = scanBarcode(canvasElement, format);

        state.codeCallback(code)
      }
      catch (error) {
        requestAnimationFrame(scanFrame);
      }
    }
    if (state.scanActive) {
      requestAnimationFrame(scanFrame);
    } else {
      video.srcObject.getTracks().forEach(function(track) {
        track.stop();
      });
      video.pause();

    }
  }

  // Use facingMode: environment to attemt to get the front camera on phones
  navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).then(function(stream) {
    video.srcObject = stream;
    video.setAttribute("playsinline", true); // required to tell iOS safari we don't want fullscreen
    video.play();
    requestAnimationFrame(scanFrame);
  });
}


if (!Element.prototype.matches) {
  Element.prototype.matches = Element.prototype.msMatchesSelector;
}
// document.addDelegatedEventListener("click", "a[href^='http']", -> confirm("external link") )
HTMLDocument.prototype.addDelegatedEventListener = function(event, matcher, cb) {
  var newCB;
  newCB = function(event) {
    if (event.target.matches && event.target.matches(matcher)) {
      return cb(event);
    }
  };
  return this.addEventListener(event, newCB);
};



document.addDelegatedEventListener("focusin", "*[data-zxing-output-target]", function(event){
  state.scanActive = true;
  state.targetElement = event.target;
  initializeScanner();
})

document.addDelegatedEventListener("focusout", "*", function(event){
  state.scanActive = false;
  console.log(state)
})

