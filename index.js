// ==UserScript==
// @name         get x video from gif
// @namespace    http://tampermonkey.net/
// @version      2025-07-04
// @description  try to download the gif file with video type.
// @author       Daryl
// @include      https://x.com/*/status/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=bilibili.com
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @require      https://incubated-geek-cc.github.io/video-to-GIF/js/GIFEncoder.js
// @require      https://incubated-geek-cc.github.io/video-to-GIF/js/NeuQuant.js
// @require      https://incubated-geek-cc.github.io/video-to-GIF/js/LZWEncoder.js
// @run-at       document-end
// @grant        GM_log
// ==/UserScript==

(function () {
  "use strict";
  const scale = window.devicePixelRatio;
  var FPS = 0;
  var continueCallback = true;
  function encode64(input) {
    var output = "",
      i = 0,
      l = input.length,
      key = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
      chr1,
      chr2,
      chr3,
      enc1,
      enc2,
      enc3,
      enc4;
    while (i < l) {
      chr1 = input.charCodeAt(i++);
      chr2 = input.charCodeAt(i++);
      chr3 = input.charCodeAt(i++);
      enc1 = chr1 >> 2;
      enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
      enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
      enc4 = chr3 & 63;
      if (isNaN(chr2)) enc3 = enc4 = 64;
      else if (isNaN(chr3)) enc4 = 64;
      output =
        output +
        key.charAt(enc1) +
        key.charAt(enc2) +
        key.charAt(enc3) +
        key.charAt(enc4);
    }
    return output;
  }
  function toggleImageSmoothing(_CANVAS, isEnabled) {
    _CANVAS.getContext("2d").mozImageSmoothingEnabled = isEnabled;
    _CANVAS.getContext("2d").webkitImageSmoothingEnabled = isEnabled;
    _CANVAS.getContext("2d").msImageSmoothingEnabled = isEnabled;
    _CANVAS.getContext("2d").imageSmoothingEnabled = isEnabled;
  }

  function scaleCanvas(_CANVAS, videoObj, vidHeight, vidWidth, scale) {
    _CANVAS["style"]["height"] = `${vidHeight}px`;
    _CANVAS["style"]["width"] = `${vidWidth}px`;

    let cWidth = vidWidth * scale;
    let cHeight = vidHeight * scale;

    _CANVAS.width = cWidth;
    _CANVAS.height = cHeight;

    toggleImageSmoothing(_CANVAS, true);
    _CANVAS.getContext("2d").scale(scale, scale);
  }
  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      let fileredr = new FileReader();
      fileredr.onload = () => resolve(fileredr.result);
      fileredr.onerror = () => reject(fileredr);
      fileredr.readAsDataURL(file);
    });
  }
  const loadVideo = (url) =>
    new Promise((resolve, reject) => {
      var vid = document.createElement("video");
      vid.addEventListener("canplay", () => resolve(vid));
      vid.addEventListener("error", (err) => reject(err));
      vid.src = url;
    });
  async function downloadGif(curObj, videoFile) {
    try {
      let _CANVAS = document.createElement("canvas");
      let b64Str = await readFileAsDataURL(videoFile);
      let videoObj = await loadVideo(b64Str);
      videoObj.autoplay = true;
      videoObj.muted = true;
      videoObj.loop = false;
      let vidHeight = videoObj.videoHeight; // 720
      let vidWidth = videoObj.videoWidth; // 1280
      console.log(vidHeight, ":", vidWidth);
      videoObj.height = vidHeight;
      videoObj.width = vidWidth;
      videoObj["style"]["height"] = `${vidHeight}px`;
      videoObj["style"]["width"] = `${vidWidth}px`;
      let exactVideoDuration = videoObj.duration;
      let vidDuration = parseInt(exactVideoDuration);
      let displayedSize = 500;
      var encoder = new GIFEncoder(vidWidth, vidHeight);
      encoder.setRepeat(0); // 0 for repeat, -1 for no-repeat
      encoder.setDelay(0); // frame delay in ms // 500
      encoder.setQuality(16); // [1,30] | Best=1 | >20 not much speed improvement. 10 is default.
      scaleCanvas(_CANVAS, videoObj, vidHeight, vidWidth, scale);
      document.body.appendChild(_CANVAS);
      // =============== calculate displayed sizes ====================
      let totalFrames = 33;
      if (exactVideoDuration <= 10) {
        totalFrames = 33;
      } else if (exactVideoDuration <= 12) {
        totalFrames = 25;
      } else if (exactVideoDuration <= 15) {
        totalFrames = 20;
      } else if (exactVideoDuration <= 25) {
        totalFrames = 12;
      } else if (exactVideoDuration <= 30) {
        totalFrames = 10;
      } else if (exactVideoDuration <= 35) {
        totalFrames = 8;
      } else if (exactVideoDuration <= 42) {
        totalFrames = 7;
      } else if (exactVideoDuration <= 60) {
        totalFrames = 5;
      }

      let sizeBenchmark = vidHeight;
      if (vidWidth > vidHeight) {
        sizeBenchmark = vidWidth;
      }
      let scaleRatio = parseFloat(displayedSize / sizeBenchmark);
      let displayedHeight = scaleRatio * vidHeight;
      let displayedWidth = scaleRatio * vidWidth;
      scaleCanvas(_CANVAS, videoObj, displayedHeight, displayedWidth, scale);
      // Sets frame rate in frames per second
      var startTime = 0;
      var frameIndex = 0;
      var staticFrames = "";

      var jsonArrRecords = [];
      var jsonObjRecord = {};
      let hasDownloaded = false;
      let hasTriggerStart = false;
      // 60fps 速度绘制gif
      const drawFrame = async (duration) => {
        let curCost = 0;
        const doDraw = () => {
          frameIndex++;
          _CANVAS
            .getContext("2d")
            .drawImage(videoObj, 0, 0, displayedWidth, displayedHeight);
          encoder.addFrame(_CANVAS.getContext("2d"));
        };
        //doDraw();
        while (curCost <= duration * 1000) {
          curCost += 1000 / 60;
          await new Promise((res) => {
            setTimeout(() => {
              //let encodeDelaySetting=0;
              let totalFrames = 100;
              const FPS = 60;
              let encodeDelaySetting =
                FPS * exactVideoDuration >= totalFrames
                  ? 0
                  : (totalFrames * 1.0) / exactVideoDuration - FPS;
              encodeDelaySetting = Math.floor(encodeDelaySetting * 1000);
              encoder.setDelay(encodeDelaySetting);
              continueCallback && doDraw();
              res("done");
            }, 1000 / 60);
          });
        }
      };
      const step = async () => {
        // in milliseconds
        startTime = startTime == 0 ? Date.now() : 0;
        _CANVAS
          .getContext("2d")
          .drawImage(videoObj, 0, 0, displayedWidth, displayedHeight);
        encoder.addFrame(_CANVAS.getContext("2d"));

        //let frameB64Str=_CANVAS.toDataURL();
        //staticFrames+=`<th><small>Frame #${frameIndex++}</small><br><img src=${frameB64Str} width='75' /></th>`;
        frameIndex++;
        if (FPS === 0) {
          let ms_elapsed = Date.now() - startTime;
          console.log(ms_elapsed);
          FPS = 30; //(frameIndex / ms_elapsed)*1000.0;
          console.log("FPS: " + FPS + " | Duration: " + exactVideoDuration);
          let encodeDelaySetting =
            FPS * exactVideoDuration >= totalFrames
              ? 0
              : (totalFrames * 1.0) / exactVideoDuration - FPS;
          encodeDelaySetting = Math.floor(encodeDelaySetting * 1000);
          console.log(encodeDelaySetting);
          encoder.setDelay(encodeDelaySetting);
        }

        if (continueCallback) {
          videoObj.requestVideoFrameCallback(step);
        }
      };

      videoObj.addEventListener(
        "play",
        (vEvt) => {
          if (continueCallback && !hasTriggerStart) {
            encoder.start();
            //videoObj.requestVideoFrameCallback(step);
            drawFrame(videoObj.duration);
            hasTriggerStart = true;
          }
        },
        false
      );

      videoObj.addEventListener(
        "ended",
        (vEvt) => {
          if (!hasTriggerStart) return;
          const byteToKBScale = 0.0009765625;
          encoder.finish();
          var fileType = "image/gif";
          var fileName = `gif-output-${new Date()
            .toGMTString()
            .replace(/(\s|,|:)/g, "")}.gif`;
          var readableStream = encoder.stream();
          var binary_gif = readableStream.getData();
          var b64Str = "data:" + fileType + ";base64," + encode64(binary_gif);
          var fileSize = readableStream.bin.length * byteToKBScale;
          fileSize = fileSize.toFixed(2);

          let dwnlnk = document.createElement("a");
          dwnlnk.download = fileName;
          dwnlnk.innerHTML = `💾 <small>Save</small>`;
          dwnlnk.className = "btn btn-outline-dark";
          dwnlnk.href = b64Str;
          continueCallback && dwnlnk.click();
          console.log(frameIndex);

          continueCallback = false;
        },
        false
      );
      document.body.appendChild(videoObj);
      setTimeout(() => videoObj.play(), 200);
    } catch (err) {
      console.log(err);
    }
  }
  function downloadMp4(url, videObj) {
    if (!url) return;
    var xhr = new XMLHttpRequest();
    xhr.open("get", url, true); // 也可以使用POST方式，根据接口
    xhr.responseType = "blob"; // 返回类型blob
    xhr.onload = function () {
      if (this.status === 200) {
        var blob = this.response;
        var reader = new FileReader();
        reader.readAsDataURL(blob); // 转换为base64，可以直接放入a表情href
        reader.onload = function (e) {
          var a = document.createElement("a");
          a.download = `${new Date().getTime()}.mp4`;
          a.href = e.target.result; //下载mp4
          //下载gif
          downloadGif(videObj, blob);
          a.click();
          window.URL.revokeObjectURL(e.target.result);
        };
      }
    };
    xhr.send();
  }
  let exist_video = null;
  let max_age = 0,
    cur_timer = null;
  cur_timer = setInterval(() => {
    max_age += 100;
    exist_video = jQuery("video")?.[0];
    if (cur_timer >= 20000 || exist_video) {
      clearInterval(cur_timer);
      //哥哥姐姐 下载这条视屏
      downloadMp4(exist_video?.src, exist_video);
    }
  }, 100);
})();
