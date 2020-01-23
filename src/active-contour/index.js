import csTools from 'cornerstone-tools';
import csCore from 'cornerstone-core';
import debounce from 'lodash/debounce';

import { ACM, ChamferDistance } from './acm';

const BaseBrushTool = csTools.importInternal('base/BaseBrushTool');
const segmentationModule = csTools.getModule('segmentation');
const external = csTools.importInternal('externalModules');
const MouseCursor = csTools.importInternal('tools/cursors/MouseCursor');
const getCircle = csTools.importInternal('util/segmentationUtils').getCircle;
const drawBrushPixels = csTools.importInternal('util/segmentationUtils').drawBrushPixels;


let scale = null
let displayedArea = null

const freehandRoiCursor = new MouseCursor(
  `
  <g fill="ACTIVE_COLOR" stroke="ACTIVE_COLOR" stroke-width="2">
    <ellipse ry="1" rx="1" id="svg_3" cy="4.240343" cx="14.306499"/>
    <line id="svg_4" y2="3.58462" x2="12.242186" y1="3.997482" x1="13.432202"/>
    <line id="svg_5" y2="3.268901" x2="10.857882" y1="3.608906" x1="12.387902"/>
    <line id="svg_6" y2="3.147471" x2="9.740724" y1="3.293187" x1="10.955026"/>
    <line id="svg_7" y2="3.147471" x2="8.089274" y1="3.196043" x1="9.983585"/>
    <line id="svg_8" y2="3.268901" x2="6.874972" y1="3.123185" x1="8.307848"/>
    <line id="svg_9" y2="3.657478" x2="5.587812" y1="3.220329" x1="7.020688"/>
    <line id="svg_10" y2="4.046054" x2="4.737801" y1="3.560334" x1="5.854959"/>
    <line id="svg_11" y2="4.337487" x2="4.300652" y1="3.997482" x1="4.834945"/>
    <line id="svg_12" y2="4.726063" x2="3.88779" y1="4.191771" x1="4.470655"/>
    <line id="svg_15" y2="5.3575" x2="3.377783" y1="4.604633" x1="3.960648"/>
    <line id="svg_16" y2="6.183226" x2="2.916348" y1="5.138926" x1="3.547785"/>
    <line id="svg_17" y2="6.960379" x2="2.770632" y1="5.867507" x1="3.037779"/>
    <line id="svg_18" y2="7.713246" x2="2.673488" y1="6.741804" x1="2.819204"/>
    <line id="svg_19" y2="8.684687" x2="2.697774" y1="7.616102" x1="2.673488"/>
    <line id="svg_20" y2="9.753273" x2="2.892062" y1="8.611829" x1="2.697774"/>
    <line id="svg_21" y2="10.724714" x2="3.134923" y1="9.534698" x1="2.84349"/>
    <line id="svg_23" y2="11.647583" x2="3.596357" y1="10.578998" x1="3.086351"/>
    <line id="svg_25" y2="12.521881" x2="4.276366" y1="11.501867" x1="3.499213"/>
    <line id="svg_26" y2="13.930471" x2="5.830673" y1="12.376165" x1="4.13065"/>
    <line id="svg_28" y2="14.707624" x2="7.263549" y1="13.881899" x1="5.733528"/>
    <line id="svg_29" y2="15.339061" x2="8.963571" y1="14.61048" x1="7.06926"/>
    <line id="svg_30" y2="15.581921" x2="10.882168" y1="15.314775" x1="8.817855"/>
    <line id="svg_31" y2="15.460491" x2="12.023612" y1="15.581921" x1="10.785024"/>
    <line id="svg_33" y2="15.120487" x2="13.092197" y1="15.484777" x1="11.877895"/>
    <line id="svg_34" y2="14.586194" x2="13.86935" y1="15.217631" x1="12.897909"/>
    <line id="svg_35" y2="13.833327" x2="14.597931" y1="14.756196" x1="13.699348"/>
    <line id="svg_37" y2="12.716169" x2="15.180796" y1="13.881899" x1="14.549359"/>
    <line id="svg_39" y2="11.429009" x2="15.520801" y1="12.813313" x1="15.15651"/>
    <ellipse ry="1" rx="1" id="svg_40" cy="10.967574" cx="15.520801"/>
  </g>`,
  {
    viewBox: {
      x: 18,
      y: 18,
    },
  }
);

/**
* @public
* @class BrushTool
* @memberof Tools.Brush
* @classdesc Tool for drawing segmentations on an image.
* @extends Tools.Base.BaseBrushTool
*/
export default class ActiveContourTool extends BaseBrushTool {
  constructor(props = {}) {
    const defaultProps = {
      name: 'ActiveContour',
      supportedInteractionTypes: ['Mouse', 'Touch'],
      configuration: {},
      svgCursor: freehandRoiCursor,
    };

    super(props, defaultProps);

    this.pixelsArray = [];
    this.touchDragCallback = this._paint.bind(this);

    this.doActiveContour = debounce(evt => {
      if (this.pixelsArray.length === 0) return;

      const pixelsToDraw = this.pixelsArray.map(a => [a[0][0], a[0][1]]);
      this.pixelsArray = [];
      const canvas = document.getElementsByClassName(
        'cornerstone-canvas'
      )[0];

      const canvasContext = canvas.getContext('2d')
      const maxIteration = 500

      const originalPicture = new Image()
      originalPicture.src = canvas.toDataURL()

      var acm = new ACM({
          scale,
          displayedArea,
          maxIteration,
          minlen: Math.pow( .1,2 ),
          maxlen: Math.pow( 6,2 ),
          threshold: .60,

          imageData: canvasContext.getImageData(0, 0, canvas.width, canvas.height),
          width: canvas.width,
          height: canvas.height,
          dots: [...pixelsToDraw],

          render(snake, i, iLength, finished) {
            if (finished) {
              snake.forEach(([x,y])=>{console.log(`${x} - ${y}`)})
              console.log(snake.length, 'points in selection')
            }


            canvasContext.clearRect(0, 0, canvas.width, canvas.height);
            canvasContext.drawImage(originalPicture, 0, 0);
            canvasContext.lineWidth = 1;
            canvasContext.strokeStyle = "#f00";
            canvasContext.fillStyle = Boolean(finished) ? "rgba( 255,0,0, .5 )" : "rgba(255,255,255,.5 )";
            canvasContext.beginPath();

            snake.forEach(function (p) {
                canvasContext.lineTo(p[0], p[1]);
            });

            canvasContext.closePath();
            canvasContext.stroke();
            canvasContext.fill();

            canvasContext.fillStyle = "#FFF";
            canvasContext.font = "10px Verdana";
            canvasContext.fillText("iteration: " + i + " / " + maxIteration + ' length: ' + iLength.toFixed(2), 10, 10)
          }
      });

      acm.compute();
    }, 1000);
  }

  /**
  * Paints the data to the labelmap.
  *
  * @protected
  * @param  {Object} evt The data object associated with the event.
  * @returns {void}
  */
  _paint(evt) {
    // console.log(evt)
    scale = evt.detail.viewport.scale
    displayedArea = evt.detail.viewport.displayedArea.brhc

    const eventData = evt.detail;
    const { rows, columns } = eventData.image;
    const { x, y } = eventData.currentPoints.image;

    this.doActiveContour(evt);

    if (x < 0 || x > columns || y < 0 || y > rows) {
      return;
    }

    const radius = 1;
    const pointerArray = getCircle(radius, rows, columns, x, y);
    this.pixelsArray.push(pointerArray);


    const { labelmap2D, labelmap3D, shouldErase } = this.paintEventData;

    // Draw / Erase the active color.
    drawBrushPixels(
      pointerArray,
      labelmap2D.pixelData,
      labelmap3D.activeSegmentIndex,
      columns,
      shouldErase
    );

    csCore.updateImage(evt.detail.element);
  }
}
