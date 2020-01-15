import csTools from 'cornerstone-tools';

const BaseBrushTool = csTools.importInternal('base/BaseBrushTool');
const segmentationModule = csTools.getModule('segmentation');
const getCircle = csTools.importInternal('util/segmentationUtils').getCircle;
const drawBrushPixels = csTools.importInternal('util/segmentationUtils').drawBrushPixels;

export default class HelloWorldMouseTool extends BaseBrushTool {
  constructor(name = 'HelloWorldMouse') {
    super({
      name,
      supportedInteractionTypes: ['Mouse', 'Touch'],
      configuration: {},
    });
    this.touchDragCallback = this._paint.bind(this);
    window.addEventListener('mousewheel', this.handleWheel.bind(this), false);
    this.shouldErase = false;
    this.hasContour = false;
    this.preMouseDownCallback = this._checkContourPresence.bind(this);
    this.radiusOffset = 0;
    this.renderBrush = this.renderBrush.bind(this);
    csTools.setToolDisabled('StackScrollMouseWheel', {});
  }

  _paint(evt) {
    const { configuration } = segmentationModule;
    const eventData = evt.detail;
    const { rows, columns } = eventData.image;
    const { x, y } = eventData.currentPoints.image;

    if (x < 0 || x > columns || y < 0 || y > rows) {
      return;
    }

    const radius = configuration.radius;
    const pointerArray = getCircle(radius, rows, columns, x, y);

    const {
      labelmap2D,
      labelmap3D,
    } = this.paintEventData;

    drawBrushPixels(
        pointerArray,
        labelmap2D.pixelData,
        labelmap3D.activeSegmentIndex,
        columns,
        this.shouldErase && this.hasContour
    );
    window.cornerstone.updateImage(evt.detail.element);
  }

  handleWheel(event) {
    csTools.setToolDisabled('StackScrollMouseWheel', {});
    if (!event.shiftKey) {
      csTools.setToolActive('StackScrollMouseWheel', {});
    } else {
      let { configuration, setters } = segmentationModule;
      this.radiusOffset += event.deltaY / 10;
      configuration.radius += Math.abs(this.radiusOffset) > 1
          ? this.radiusOffset > 0
              ? Math.floor(this.radiusOffset-- % 2)
              : Math.ceil(this.radiusOffset++ % 2)
          : 0;
      configuration.radius = configuration.radius < 4 ? 4 : configuration.radius;
      setters.radius(configuration.radius);
    }
  }

  renderBrush(evt) {
    const { getters, configuration } = segmentationModule;
    const eventData = evt.detail;
    const viewport = eventData.viewport;

    let mousePosition;

    if (this._drawing) {
      mousePosition = this._lastImageCoords;
    } else if (this._mouseUpRender) {
      mousePosition = this._lastImageCoords;
      this._mouseUpRender = false;
    } else {
      mousePosition = csTools.store.state.mousePositionImage;
    }

    if (!mousePosition) {
      return;
    }

    const { rows, columns } = eventData.image;
    const { x, y } = mousePosition;

    if (x < 0 || x > columns || y < 0 || y > rows) {
      return;
    }

    const radius = configuration.radius;
    const context = eventData.canvasContext;
    const element = eventData.element;
    const color = getters.brushColor(element, this._drawing);

    context.setTransform(1, 0, 0, 1, 0, 0);

    let circleRadius = radius * viewport.scale;
    const mouseCoordsCanvas = window.cornerstone.pixelToCanvas(
        element,
        mousePosition,
    );

    const { labelmap2D } = getters.labelmap2D(element);

    const getPixelIndex = (x, y) => y * columns + x;
    const spIndex = getPixelIndex(Math.floor(x), Math.floor(y));
    const isInside = labelmap2D.pixelData[spIndex] === 1;
    this.shouldErase = !isInside;
    context.beginPath();
    context.strokeStyle = color;
    context.ellipse(
        mouseCoordsCanvas.x,
        mouseCoordsCanvas.y,
        circleRadius,
        circleRadius,
        0,
        0,
        2 * Math.PI,
    );
    context.stroke();

    this._lastImageCoords = eventData.image;
  }

  _checkContourPresence(evt) {
    super.preMouseDownCallback(evt);
    const element = evt.detail.element;
    const { getters } = segmentationModule;
    const { labelmap2D } = getters.labelmap2D(element);
    for (let i = 0; i < labelmap2D.pixelData.length; i++) {
      if (labelmap2D.pixelData[i] === 1) {
        this.hasContour = true;
        break;
      } else {
        this.hasContour = false;
      }
    }
  }
}
