import csTools from 'cornerstone-tools';
import csCore from 'cornerstone-core';
import debounce from 'lodash/debounce';

import { ACM, ChamferDistance } from './acm';

const BaseBrushTool = csTools.importInternal('base/BaseBrushTool');
const segmentationModule = csTools.getModule('segmentation');
const external = csTools.importInternal('externalModules');
const getCircle = csTools.importInternal('util/segmentationUtils').getCircle;
const drawBrushPixels = csTools.importInternal('util/segmentationUtils').drawBrushPixels;

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
      mixins: ['renderBrushMixin'],
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
          maxIteration,
          minlen: Math.pow( .1,2 ),
          maxlen: Math.pow( 6,2 ),
          threshold: .40,

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
            canvasContext.strokeStyle = "#fff";
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
