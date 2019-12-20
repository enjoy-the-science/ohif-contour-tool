import csTools from 'cornerstone-tools';
import csCore from 'cornerstone-core';
import debounce from 'lodash/debounce';

import { ACM, ChamferDistance } from './acm';

const BaseBrushTool = csTools.importInternal('base/BaseBrushTool');
const segmentationModule = csTools.getModule('segmentation');
const external = csTools.importInternal('externalModules');
const getCircle = csTools.importInternal('util/segmentationUtils').getCircle;
const drawBrushPixels = csTools.importInternal('util/segmentationUtils').drawBrushPixels;

let cache = {};
let nextRemove = null;

console.log({csTools, csCore})

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


    this.sendToServer = debounce(evt => {
      const eventData = evt.detail;
      const { image, element } = eventData;
      console.log('eventData', eventData);
      const image2 = csCore.getImage(element);
      console.log({image2})
      // console.log(cornerstone.getImage(element).getPixelData());
      // console.log('Sending points array to server', this.pixelsArray);
      if (this.pixelsArray.length === 0) return;
      const copy = this.pixelsArray;
      this.pixelsArray = [];

      // Do some cleaning
      // drawBrushPixels(
      //   copy.map(a => [a[0][0], a[0][1]]),
      //   cache.pixelData,
      //   cache.activeSegmentIndex,
      //   cache.columns,
      //   true
      // );

      // if (nextRemove) {
      //   drawBrushPixels(
      //     nextRemove,
      //     cache.pixelData,
      //     cache.activeSegmentIndex,
      //     cache.columns,
      //     true
      //   );
      // }

      // nextRemove = copy.map(a => [a[0][0] + 10, a[0][1] - 20]);
      const pixelsToDraw = copy.map(a => [a[0][0], a[0][1]]);
      const canvas = document.getElementsByClassName(
        'cornerstone-canvas'
      )[0];


      const canvasContext = canvas.getContext('2d')
      const maxIteration = 1000

      console.log('pixelstodraw', pixelsToDraw)

      const originalPicture = new Image()
      originalPicture.src = canvas.toDataURL()

      let prev = null
      var acm = new ACM({
          maxIteration,
          minlen: Math.pow( .1,2 ),
          maxlen: Math.pow( 6,2 ),
          threshold: .40,

          // {data: [], width, height}
          imageData: canvasContext.getImageData(0, 0, canvas.width, canvas.height),
          // Но width и height так же прокидываются в imageData
          width: canvas.width,
          height: canvas.height,
          dots: [...pixelsToDraw],
          
          render(snake, i, iLength, finished) {
            const USE_SNAKE_FROM_OUT_CONTOUR = false

            if (USE_SNAKE_FROM_OUT_CONTOUR) {
              if (prev) {
                // console.log('cleaning...', prev.map(p => [parseInt(p[0]), parseInt(p[1])]))
                drawBrushPixels(
                  prev,
                  cache.pixelData,
                  cache.activeSegmentIndex,
                  cache.columns, true
                );
              }
              prev = snake.map(p => [parseInt(p[0]), parseInt(p[1])])


              
              drawBrushPixels(
                prev,
                cache.pixelData,
                cache.activeSegmentIndex,
                cache.columns
              );
              csCore.updateImage(cache.evt.detail.element)
            } else {
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
          }
      });

      // acm.setSnakeDots(copy.map(a => [a[0][0], a[0][1]]));
      acm.compute();
      // console.log(pixelsToDraw)
    
      // drawBrushPixels(
      //   pixelsToDraw,//.map(a=>[a[0][0] + 10,a[0][1] + 20]),
      //   cache.pixelData,
      //   cache.activeSegmentIndex,
      //   cache.columns
      // );
      //         csCore.updateImage(cache.evt.detail.element)
              // throw new Error()

      // drawBrushPixels(
      //   pixelsToDraw,
      //   cache.pixelData,
      //   cache.activeSegmentIndex,
      //   cache.columns
      // );

      // cornerstone.updateImage(cache.evt.detail.element);
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

    /** sendToServer */
    this.sendToServer(evt);

    if (x < 0 || x > columns || y < 0 || y > rows) {
      return;
    }

    const radius = 1;
    const pointerArray = getCircle(radius, rows, columns, x, y);
    // console.log(pointerArray)
    this.pixelsArray.push(pointerArray);

    const { labelmap2D, labelmap3D, shouldErase } = this.paintEventData;

    cache.pixelData = labelmap2D.pixelData;
    cache.activeSegmentIndex = labelmap3D.activeSegmentIndex;
    cache.columns = columns;

    // Draw / Erase the active color.
    drawBrushPixels(
      pointerArray,
      labelmap2D.pixelData,
      labelmap3D.activeSegmentIndex,
      columns,
      shouldErase
    );

    cache.evt = evt;

    csCore.updateImage(evt.detail.element);
  }
}
