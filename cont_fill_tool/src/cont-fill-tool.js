import csTools from "cornerstone-tools"
import csCore from "cornerstone-core";
import * as d3 from "d3";

const BaseBrushTool = csTools.importInternal("base/BaseBrushTool");
const external = csTools.importInternal("externalModules");
const segmentationModule = csTools.getModule('segmentation');

function getCircle(
  radius,
  rows,
  columns,
  xCoord = 0,
  yCoord = 0
) {
  const x0 = Math.floor(xCoord);
  const y0 = Math.floor(yCoord);

  if (radius === 1) {
    return [[x0, y0]];
  }

  const circleArray = [];
  let index = 0;

  for (let y = -radius; y <= radius; y++) {
    const yCoord = y0 + y;

    if (yCoord > rows || yCoord < 0) {
      continue;
    }

    for (let x = -radius; x <= radius; x++) {
      const xCoord = x0 + x;

      if (xCoord >= columns || xCoord < 0) {
        continue;
      }

      if (x * x + y * y < radius * radius) {
        circleArray[index++] = [x0 + x, y0 + y];
      }
    }
  }

  return circleArray;
}

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
 
//TODO try Otsu threshold

function mean_thresh(highlData) {
  let threshold = 0;
  let sum = 0;
  for(let i = 0; i < highlData.length; i++){
    sum = sum + highlData[i];
  }
  threshold = sum/highlData.length;
  return 1-threshold; //check
}

function cutHilghFragm(xS, yS, xE, yE, imagePixelData) {
    let xStart = Math.round(xS);
    let yStart = Math.round(yS);
    let xEnd = Math.round(xE);
    let yEnd = Math.round(yE);
    let widthHighl = Math.abs(xStart-xEnd);
    let heightHighl = Math.abs(yStart-yEnd);
    let distance = widthHighl * heightHighl;
    let xCut = Math.min(xStart,xEnd);
    let yCut = Math.min(yStart,yEnd);
    let beginCut = xCut * yCut;
    let endCut = beginCut + distance;
    return imagePixelData.slice(beginCut, endCut);
}

function prepareDataForSearch(fragmData, fragmWidth, fragmHeight) {
  const values = new Float64Array(fragmWidth * fragmHeight);
  //StackBlur.R(imageData, 3); TODO import function
  for (let j = 0, k = 0; j < fragmHeight; ++j) {
      for (let i = 0; i < fragmWidth; ++i, ++k) {
          values[k] = fragmData[(k << 2)]/255; //check
      }
  }
  return values;
}

function searchCont(preparedData, mean_thresh, fragmWidth, fragmHeight){
  let contoursArray = d3.contours().size([fragmWidth, fragmHeight]);
  let contours = contoursArray.contour(preparedData, mean_thresh);
  return contours.coordinates;

}

export default class CountourFillTool extends BaseBrushTool {
  constructor(props = {}) {
    const defaultProps = {
      name: 'CountourFill',
      supportedInteractionTypes: ['Mouse', 'Touch'],
      configuration: {},
      hideDefaultCursor: false,
      mixins: [],
    };

    super(props, defaultProps);

    this._drawing = false;
    this.preMouseDownCallback = this.preMouseDownCallback.bind(this);
    this._drawingMouseUpCallback = this._drawingMouseUpCallback.bind(this);
    this.proceedCalculations = this.proceedCalculations.bind(this);
    this.draw = this.draw.bind(this);
    this.touchDragCallback = this._paint.bind(this);
     }
     preMouseDownCallback(evt) {
    const eventData = evt.detail;

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
    console.log("calculations. Dots start:" + JSON.stringify(this.startCoords) + "Dots finish: " + JSON.stringify(this.finishCoords));
    
    //logic of getting coordinates to brush

    //get Image
    const image = evt.detail.image;
    const imagePixelData = image.getPixelData();
    const imageWidth = image.width;
    const imageHeight = image.height;
    
    //cut fragment for count threshold
    let xS = this.startCoords.x.valueOf();
    let yS = this.startCoords.y.valueOf();
    let xE = this.finishCoords.x.valueOf();
    let yE = this.finishCoords.y.valueOf();
    const highlFragment = cutHilghFragm(xS, yS, xE, yE, imagePixelData);

    //count threshold
    const mean_threshold = mean_thresh(highlFragment);
    console.log(mean_threshold);

    //TODO get fragment

    //prepare data for search 
    const preparedData = prepareDataForSearch(imagePixelData, imageWidth, imageHeight);

    //search contours
    const arrayPolig = searchCont(preparedData, mean_threshold, imageWidth, imageHeight);
    console.log(arrayPolig.length);

    this.draw(evt);
  }

  draw(evt){
    console.log("we are drawing something");

    /*
    const { rows, columns } = eventData.image;
    const { x1, y1 } = this.startCoords;
    const pointerArray1 = getCircle(10, rows, columns, x1, y1);
   const { labelmap2D, labelmap3D, shouldErase } = this.paintEventData;
    drawBrushPixels(
      pointerArray1,
      labelmap2D.pixelData,
      labelmap3D.activeSegmentIndex,
      columns,
      shouldErase
    );
    external.cornerstone.updateImage(evt.detail.element);*/
  }

  _paint(evt) {
    return null;
  }

  renderBrush(){
    return null;
  }
}
