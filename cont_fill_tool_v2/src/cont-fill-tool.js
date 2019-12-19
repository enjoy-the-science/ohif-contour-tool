
import csTools from "cornerstone-tools"
import cornerstone from "cornerstone-core";

import floodFill from "n-dimensional-flood-fill";

const BaseBrushTool = csTools.importInternal("base/BaseBrushTool");
const segmentationModule = csTools.getModule('segmentation');
//const { drawBrushPixels } = cornerstoneTools.importInternal(
  //'util/segmentationUtils'
//);

export default class CountourFillTool extends BaseBrushTool {
constructor(props = {}) {
const defaultProps = {
name: 'CountourFill',
supportedInteractionTypes: ['Mouse', 'Touch'],
configuration: {},
//hideDefaultCursor: false,"renderBrushMixin"
mixins: ["renderBrushMixin"],
};

super(props, defaultProps);

this.preMouseDownCallback = this.preMouseDownCallback.bind(this);
this._drawingMouseUpCallback = this._drawingMouseUpCallback.bind(this);
this.proceedCalculations = this.proceedCalculations.bind(this);
this.draw = this.draw.bind(this);
this.init = this.init.bind(this);
}

init(evt){
const eventData = evt.detail;
const element = eventData.element;

this.rows = eventData.image.rows;
this.columns = eventData.image.columns;

const { configuration, getters } = segmentationModule;

const {
labelmap2D,
labelmap3D,
currentImageIdIndex,
activeLabelmapIndex,
} = getters.labelmap2D(element);

const shouldErase =
super._isCtrlDown(eventData) || this.configuration.alwaysEraseOnClick;

this.paintEventData = {
labelmap2D,
labelmap3D,
currentImageIdIndex,
activeLabelmapIndex,
shouldErase,
};
}

preMouseDownCallback(evt) {
const eventData = evt.detail;

this.init(evt);

const {element, currentPoints } = eventData;

this.startCoords = currentPoints.image;

this._drawing = true;
super._startListeningForMouseUp(element);
return true;
}

_drawingMouseUpCallback(evt) {
const eventData = evt.detail;
const { element, currentPoints } = eventData;

this.finishCoords = currentPoints.image;

this._drawing = false;
super._stopListeningForMouseUp(element);
this.proceedCalculations(evt);
}


proceedCalculations(evt){

//get Image
const image = evt.detail.image;
const imagePixelData = image.getPixelData();
const imageWidth = image.width;
const imageHeight = image.height;

//get start point
let xS = this.startCoords.x.valueOf();
let yS = this.startCoords.y.valueOf();
let xStart = Math.round(xS);
let yStart = Math.round(yS);



//get 2D-array
let Array2d = [];

for (let i = 0; i < image.height; i++) {
  Array2d.push(
    Array.from(imagePixelData.slice(i * imageWidth, (i + 1) * imageWidth))
  );
}

function get_max(data){
  let max_val = 0
  for(let i = 0; i < data.length; i++){
    if (data[i]>max_val){
      max_val=data[i];
    }
  }
  return max_val;
}

function count_tolerance(deltaY,max_val){
    return max_val * Math.tanh(0.15*(deltaY/10));
}

//Math.abs(startY-endY)
const deltaY = 10;
//get tolerance, function count_tolerance(deltaY...) in progress
const tolerance = count_tolerance(deltaY, get_max(imagePixelData));
console.log(tolerance);

//Flood fill, get array of points
let result = floodFill({
getter: function(x,y){return Array2d[y][x];},
seed: [xStart, yStart],
equals:function (a, b) {
  return Math.abs(a-b)<=tolerance;
},
diagonals: true
})

const arrayPoints = result.flooded;

this.draw(evt, arrayPoints);

};

draw(evt, points){
const { labelmap2D, labelmap3D, shouldErase } = this.paintEventData;
const columns = this.columns;

drawBrushPixels(
points,
labelmap2D.pixelData,
labelmap3D.activeSegmentIndex,
columns,
shouldErase
);


cornerstone.updateImage(evt.detail.element); 
}

//_paint() {
//return null;
//}

//renderBrush(){
//return null;
//}
}

///*
function eraseIfSegmentIndex(
pixelIndex,
pixelData,
segmentIndex
) {
if (pixelData[pixelIndex] === segmentIndex) {
pixelData[pixelIndex] = 0;
}
}

function drawBrushPixels(
pointerArray,
pixelData,
segmentIndex,
columns,
shouldErase = false
) {
const getPixelIndex = (x, y) => y * columns + x;

pointerArray.forEach(point => {
const spIndex = getPixelIndex(...point);

if (shouldErase) {
eraseIfSegmentIndex(spIndex, pixelData, segmentIndex);
} else {
pixelData[spIndex] = segmentIndex;
}
});
}
//*/