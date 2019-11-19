let canvElem = document.getElementById("canvas");
let context = canvElem.getContext("2d");

let image = new Image();
let imageData = [];


function prepareData(imageData, n, m) {
    const values = new Float64Array(n * m);
    StackBlur.R(imageData, 3);
    for (let j = 0, k = 0; j < m; ++j) {
        for (let i = 0; i < n; ++i, ++k) {
            values[k] = imageData.data[(k << 2)];
        }
    }
    return values;
}



image.onload = function () {
    context.drawImage(image, 0, 0);
    let n = image.width;
    let m = image.height;
    imageData = context.getImageData(0, 0, n, m);
    let contours = d3.contours().size([n, m]);
    let projection = d3.geoIdentity().scale(n / n);
    const path = d3.geoPath(projection, context);
    context.strokeStyle = "aqua";
    context.lineWidth="2";
    context.beginPath();
    path(contours.contour(prepareData(imageData, n, m), 90));
    context.stroke();
};
image.src = "./2.jpg";

