const http = require("http");
const grib2class = require("grib2class");
const plot = require("./plot.js");
const JpxImage = require("./jpeg2000/jpx.min.js"); // https://github.com/OHIF/image-JPEG2000/blob/master/dist/jpx.min.js"
const jpeg2000decoder = function (imageBytes) {
    const jpeg2000 = new JpxImage();
    jpeg2000.parse(imageBytes);
    return jpeg2000.tiles[0].items;
};
const myGrid = new grib2class({
    log: false,
    jpeg2000decoder: jpeg2000decoder
});

function getTargetDate() {
    // 9時半を堺に対象の日付が変わる
    // 9時半前なら前々日
    // 9時半後なら前日
    const now = new Date();
    now.setHours(now.getHours() - 9);
    now.setMinutes(now.getMinutes() - 30);
    now.setDate(now.getDate() - 1);

    return now;
}
const targetDate = getTargetDate();

function formatTargetDate(targetDate) {
    const y = targetDate.getFullYear();
    const m = ('00' + (targetDate.getMonth()+1)).slice(-2);
    const d = ('00' + targetDate.getDate()).slice(-2);
    const ret = y + '' + m + '' + d;
    return ret;
}
const targetDateFormatted = formatTargetDate(targetDate);
// console.log(targetDateFormatted);

function getVizDate(targetDate) {
    targetDate.setDate(targetDate.getDate() + 1);
    const y = targetDate.getFullYear();
    const m = ('00' + (targetDate.getMonth()+1)).slice(-2);
    const d = ('00' + targetDate.getDate()).slice(-2);
    const ret = y + '/' + m + '/' + d;
    return ret;
}
const vizDate = getVizDate(targetDate);

const cache = {};
function go(grib2Url) {
    enableLoading();
    const plotting = function(buffer) {
        myGrid.parse(buffer);
        plot(myGrid, document.getElementById("plot"), beforeAfter);
    }
    if (cache[grib2Url]) {
        setTimeout(function() {
            plotting(cache[grib2Url]);
        }, 0.0001);
        return;
    }
    http.get(grib2Url, function(res, err) {
        if (err) {
            disableLoading();
            console.log(err);
        }
        const allChunks = [];
        res.on("data", function (chunk) {
            allChunks.push(chunk);
        });
        res.on("end", function () {
            const buffer = Buffer.concat(allChunks);
            plotting(buffer);
            cache[grib2Url] = buffer;
        });
    }).on("error", function (err) {
        console.log("Error: " + err.message);
        disableLoading();
        window.alert(err);
    });
}

document.getElementById('header-title').innerHTML = '世界可降水量マップ&nbsp;' + vizDate + '&nbsp;3時の予報';

// const mocks = [
//   'https://vt-cm01-stg.mapion.co.jp/lab/noaa/raw/pwat/20220718/18/006.grib2',
//   'https://vt-cm01-stg.mapion.co.jp/lab/noaa/raw/pwat/20220718/18/012.grib2',
//   'https://vt-cm01-stg.mapion.co.jp/lab/noaa/raw/pwat/20220718/18/018.grib2',
// ];
const mocks = [];
for (let i = 6; i <= 168; i += 6) {
    const zerop = ('00' + i).slice(-3);
    const url = 'https://vt-cm01-stg.mapion.co.jp/lab/noaa/raw/pwat/' + targetDateFormatted + '/18/' + zerop + '.grib2';
    mocks.push({
        name: i + '時間後',
        url: url
    });
}

const dropDown = document.getElementById("file-selector");

const createDropDown = function() {
    for (const i in mocks) {
        const opt = document.createElement("option");
        opt.value = mocks[i]['url'];
        opt.text = mocks[i]['name'];

        dropDown.append(opt);
    }

    dropDown.addEventListener("change", function(e) {
        go(e.target.value);
    });
};

createDropDown();

const loading = document.getElementById("loading");

const enableLoading = function() {
    loading.style.display = "block";
};

const disableLoading = function() {
    loading.style.display = "none";
};

const beforeAfter = {
    before: enableLoading,
    after: disableLoading
};

go(mocks[0]['url']);
