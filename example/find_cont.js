let canvElem = document.getElementById("canvas");
let context = canvElem.getContext("2d");

let image = new Image();
let imageData = [];


function prepareData(imageData, n, m) {
    const values = new Float64Array(n * m);
    StackBlur.R(imageData, 3);
    for (let j = 0, k = 0; j < m; ++j) {
        for (let i = 0; i < n; ++i, ++k) {
            values[k] = imageData.data[(k << 2)]/255;
        }
    }
    return values;
}



function mean_threshold(imgData) {
    let pixelsNumber = imgData.data.length / 3;
    let sum = 0;
    for (let i = 0; i < imgData.data.length; i += 3) {
        sum = imgData.data[i] + sum;
    }
    return (sum / pixelsNumber)/255;
}


image.onload = function () {
    context.drawImage(image, 0, 0);
    let n = image.width;
    let m = image.height;
    imageData = context.getImageData(0, 0, n, m);
    let threshold_mean = mean_threshold(imageData);
    console.log(threshold_mean);
    let contours = d3.contours().size([n, m]);
    let projection = d3.geoIdentity().scale(n / n);
    const path = d3.geoPath(projection, context);
    context.strokeStyle = "aqua";
    context.lineWidth = "2";
    context.beginPath();
    path(contours.contour(prepareData(imageData, n, m), threshold_mean));
    context.stroke();
};
image.src = "./2.jpg";

