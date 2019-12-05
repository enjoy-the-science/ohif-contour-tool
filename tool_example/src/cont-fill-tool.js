
import csTools from "cornerstone-tools";
const BaseBrushTool = csTools.importInternal("base/BaseBrushTool");
const external = csTools.importInternal("externalModules");
//const getModule = csTools.importInternal("store/index");
//const drawBrushPixels = csTools.importInternal("util/segmentation/drawBrush");
//const getCircle = csTools.importInternal("util/segmentation/getCircle");
//import { getModule } from "cornerstone-tools";
//import { drawBrushPixels, getCircle } from 'cornerstone-tools';


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

const segmentationModule = csTools.getModule('segmentation');

export default class CountourFillTool extends BaseBrushTool {
  constructor(props = {}) {
    const defaultProps = {
      name: 'CountourFill',
      supportedInteractionTypes: ['Mouse', 'Touch'],
      configuration: {},
      mixins: ['renderBrushMixin'],
    };

    super(props, defaultProps);

    this.touchDragCallback = this._paint.bind(this);
  }

  _paint(evt) {
    console.log(evt);

    const { configuration } = segmentationModule;
    const eventData = evt.detail;
    const element = eventData.element;
    const { rows, columns } = eventData.image;
    const { x, y } = eventData.currentPoints.image;

    if (x < 0 || x > columns || y < 0 || y > rows) {
      return;
    }

    const radius = configuration.radius;
    const pointerArray = getCircle(radius, rows, columns, x, y);

    const { labelmap2D, labelmap3D, shouldErase } = this.paintEventData;

    drawBrushPixels(
      pointerArray,
      labelmap2D.pixelData,
      labelmap3D.activeSegmentIndex,
      columns,
      shouldErase
    );

    external.cornerstone.updateImage(evt.detail.element);
  }
}
/*
import csTools from "cornerstone-tools";
import * as d3 from "d3";
const getNewContext = csTools.importInternal("drawing/getNewContext");
const BaseBrushTool = csTools.importInternal("base/BaseBrushTool");

//TODO Otsu threshold
//TODO search contours function
//TODO draw cont
//TODO fragment по точке + все на фрагмент перенести
//TODO выделение
//тест на разных снимках, исправить все неточности(цвет,размерность)

function mean_thresh(data) {
  let threshold = 0;
  let sum = 0;
  for(let i = 0; i < data.length; i++){
    sum = sum + data[i];
  }
  threshold = sum/data.length;
  return threshold;
}

function prepareDataForSearch(imageData, imageWidth, imageHeight) {
  const values = new Float64Array(imageWidth * imageHeight);
  //StackBlur.R(imageData, 3); TODO import filtr
  for (let j = 0, k = 0; j < imageHeight; ++j) {
      for (let i = 0; i < imageWidth; ++i, ++k) {
          values[k] = imageData[(k << 2)];
      }
  }
  return values;
}

export default class CountourFillTool extends BaseBrushTool {
  constructor(name = "CountourFill") {
    super({
      name,
      supportedInteractionTypes: ["Mouse"]
    });
  }
  
  preMouseDownCallback(evt) {

    console.log("Threshold:");
    const eventData = evt.detail;
    const { image, element } = eventData;

    

    const imageWidth = image.width;
    const imageHeight = image.height;
    const PixelData = image.getPixelData();

    console.log(mean_thresh(PixelData));
    
    const threshold_mean = mean_thresh(PixelData);
    let contoursArray = d3.contours().size([imageWidth, imageHeight]);
    let contours = contours.contour(prepareDataForSearch(PixelData,imageWidth,imageHeight), threshold_mean);
    //console.log(element.cornestone-canvas);
    //const context = getNewContext(element.cornestone-canvas);
    //let projection = d3.geoIdentity().scale(imageWidth / imageWidth);
    //const path = d3.geoPath(projection, context);
    //context.strokeStyle = "aqua";
    //context.lineWidth = "2";
    //context.beginPath();
    //path(contours.contour(prepareDataForSearch(PixelData,imageWidth,imageHeight), threshold_mean));
    //context.stroke();
  

  }

  activeCallback(element) {
    console.log(`plugin activated`);
  }

  disabledCallback(element) {
    console.log(`plugin deactivated`);
  }

}
*/