var http = require("http");
const grib2class = require("grib2class");
var interactivePlot = require("./interactive_plot.js");
var JpxImage = require("./jpeg2000/jpx.min.js"); // https://github.com/OHIF/image-JPEG2000/blob/master/dist/jpx.min.js"
var jpeg2000decoder = function (imageBytes) {
    var jpeg2000 = new JpxImage();
    jpeg2000.parse(imageBytes);
    return jpeg2000.tiles[0].items;
};

var myGrid = new grib2class({
  log: false,
  jpeg2000decoder: jpeg2000decoder
});

function getTargetDate() {
  // 9時半を堺に対象の日付が変わる
  // 9時半前なら前々日
  // 9時半後なら前日
  var now = new Date();
  now.setHours(now.getHours() - 9);
  now.setMinutes(now.getMinutes() - 30);
  now.setDate(now.getDate() - 1);

  return now;
}
var targetDate = getTargetDate();

function formatTargetDate(targetDate) {
  var y = targetDate.getFullYear();
  var m = ('00' + (targetDate.getMonth()+1)).slice(-2);
  var d = ('00' + targetDate.getDate()).slice(-2);
  var ret = y + '' + m + '' + d;
  return ret;
}
var targetDateFormatted = formatTargetDate(targetDate);
// console.log(targetDateFormatted);

function getVizDate(targetDate) {
  targetDate.setDate(targetDate.getDate() + 1);
  var y = targetDate.getFullYear();
  var m = ('00' + (targetDate.getMonth()+1)).slice(-2);
  var d = ('00' + targetDate.getDate()).slice(-2);
  var ret = y + '/' + m + '/' + d;
  return ret;
}
var vizDate = getVizDate(targetDate);

function go(grib2Url) {
  enableLoading();
  http.get(grib2Url, function (res, err) {
    if (err) {
      disableLoading();
      console.log(err);
    }
    var allChunks = [];
    res.on("data", function (chunk) {
      allChunks.push(chunk);
    });
    res.on("end", function () {
      const buffer = Buffer.concat(allChunks);
      myGrid.parse(buffer);

      interactivePlot(myGrid, document.getElementById("interactivePlot"), beforeAfter);
    });
  }).on("error", function (err) {
    console.log("Error: " + err.message);
    disableLoading();
    window.alert(err);
  });
}

document.getElementById('header-title').innerHTML = vizDate + '&nbsp;3時の予報';

// var mocks = [
//   'https://vt-cm01-stg.mapion.co.jp/lab/noaa/raw/pwat/20220718/18/006.grib2',
//   'https://vt-cm01-stg.mapion.co.jp/lab/noaa/raw/pwat/20220718/18/012.grib2',
//   'https://vt-cm01-stg.mapion.co.jp/lab/noaa/raw/pwat/20220718/18/018.grib2',
// ];
var mocks = [];
for (var i = 6; i <= 168; i += 6) {
  var zerop = ('00' + i).slice(-3);
  var url = 'https://vt-cm01-stg.mapion.co.jp/lab/noaa/raw/pwat/' + targetDateFormatted + '/18/' + zerop + '.grib2';
  mocks.push({
    name: i + '時間後',
    url: url,
  });
}


var dropDown = document.getElementById("file-selector");

var createDropDown = function () {
    for (var i in mocks) {
        var opt = document.createElement("option");
        opt.value = mocks[i]['url'];
        opt.text = mocks[i]['name'];

        dropDown.append(opt);
    }

    dropDown.addEventListener("change", function (e) {
        go(e.target.value);
    });
};

createDropDown();

var loading = document.getElementById("loading");

var enableLoading = function () {
    loading.style.display = "block";
};

var disableLoading = function () {
    loading.style.display = "none";
};

var beforeAfter = {
    before: enableLoading,
    after: disableLoading
};

go(mocks[0]['url']);
