import cornerstoneTools from 'cornerstone-tools';
import cornerstone from 'cornerstone-core';

const BaseAnnotationTool = cornerstoneTools.importInternal(
  'base/BaseAnnotationTool'
);

const getNewContext = cornerstoneTools.importInternal('drawing/getNewContext');
const draw = cornerstoneTools.importInternal('drawing/draw');
const drawHandles = cornerstoneTools.importInternal('drawing/drawHandles');
const { drawBrushPixels } = cornerstoneTools.importInternal(
  'util/segmentationUtils'
);
const segmentationModule = cornerstoneTools.getModule('segmentation');

export default class PencilMLTool extends BaseAnnotationTool {
  constructor(props = {}) {
    const defaultProps = {
      name: 'PencilML',
      supportedInteractionTypes: ['Mouse', 'Touch'],
    };

    super(props, defaultProps);

    if (!this.configuration.backendHost) {
      this.configuration.backendHost = '';
    }

    if (!this.configuration.notificationService) {
      this.configuration.notificationService = {
        show: () => {},
      };
    }

    this.preventNewMeasurement = false;
  }

  createNewMeasurement(eventData) {
    return {
      visible: true,
      active: true,
      color: undefined,
      invalidated: true,
      handles: {
        first: {
          x: eventData.currentPoints.image.x,
          y: eventData.currentPoints.image.y,
          highlight: true,
          active: true,
        },
        second: {
          x: eventData.currentPoints.image.x,
          y: eventData.currentPoints.image.y,
          highlight: true,
          active: true,
        },
        third: {
          x: eventData.currentPoints.image.x,
          y: eventData.currentPoints.image.y,
          highlight: true,
          active: true,
        },
        fourth: {
          x: eventData.currentPoints.image.x,
          y: eventData.currentPoints.image.y,
          highlight: true,
          active: true,
        },
      },
    };
  }

  pointNearTool(element, data, coords) {
    const lineSegDistance = cornerstoneTools.importInternal(
      'util/lineSegDistance'
    );

    const handles = Object.values(data.handles);

    return handles.some((handle, i) => {
      return (
        lineSegDistance(element, handle, handles[(i + 1) % 4], coords) < 25
      );
    });
  }

  updateCachedStats(image, element, data) {
    data.cachedStats = Object.values(data.handles).map(handle => ({
      x: handle.x,
      y: handle.y,
    }));
    data.invalidated = false;
  }

  renderToolData(evt) {
    const eventData = evt.detail;
    const { handleRadius } = this.configuration;

    const toolData = cornerstoneTools.getToolState(
      evt.currentTarget,
      this.name
    );

    if (!toolData) {
      return;
    }

    const context = getNewContext(eventData.canvasContext.canvas);
    const { image, element } = eventData;

    for (let i = 0; i < toolData.data.length; i++) {
      const data = toolData.data[i];

      if (data.visible === false) {
        continue;
      }

      draw(context, context => {
        const color = cornerstoneTools.toolColors.getColorIfActive(data);

        drawHandles(context, eventData, data.handles, {
          handleRadius,
          color,
        });

        if (data.invalidated === true) {
          this.updateCachedStats(image, element, data);
        }
      });
    }
  }

  addNewMeasurement(evt, interactionType) {
    if (this.preventNewMeasurement) {
      return;
    }

    this.preventNewMeasurement = true;

    evt.preventDefault();
    evt.stopPropagation();

    const eventData = evt.detail;
    const measurementData = this.createNewMeasurement(eventData);

    const element = evt.detail.element;

    cornerstoneTools.addToolState(element, this.name, measurementData);

    cornerstone.updateImage(element);

    const moveNewHandle = cornerstoneTools.importInternal(
      'manipulators/moveNewHandle'
    );

    moveNewHandle(
      eventData,
      this.name,
      measurementData,
      measurementData.handles.second,
      this.options,
      interactionType,
      () => {
        measurementData.active = false;
        measurementData.handles.third.active = true;

        cornerstone.updateImage(element);

        moveNewHandle(
          eventData,
          this.name,
          measurementData,
          measurementData.handles.third,
          this.options,
          interactionType,
          () => {
            measurementData.active = false;
            measurementData.handles.fourth.active = true;

            cornerstone.updateImage(element);

            moveNewHandle(
              eventData,
              this.name,
              measurementData,
              measurementData.handles.fourth,
              this.options,
              interactionType,
              async () => {
                this.preventNewMeasurement = false;

                cornerstone.updateImage(element);

                const currentCursor = element.style.cursor;

                element.style.cursor = 'wait';

                cornerstoneTools.setToolDisabled('StackScrollMouseWheel', {});

                try {
                  await this.drawMask(element, measurementData.handles);
                } catch (_) {
                  this.configuration.notificationService.show({
                    title: 'PencilML Tool',
                    message: 'Error during pixel mask fetching',
                    type: 'error',
                  });
                }

                element.style.cursor = currentCursor;

                cornerstoneTools.setToolActive('StackScrollMouseWheel', {});
                measurementData.active = false;
                measurementData.visible = false;
              }
            );
          }
        );
      }
    );
  }

  async drawMask(element, handles) {
    const image = cornerstone.getImage(element);

    const generalSeriesModuleMeta = cornerstone.metaData.get(
      'generalSeriesModule',
      image.imageId
    );

    const pixelArray = image.getPixelData();
    let grayScale;

    /**
     * To add another image modality just add new case
     */
    switch (generalSeriesModuleMeta.modality) {
      case 'CT':
        grayScale = pixelArray.map(value =>
          Math.round(((value + 2048) / 4096) * 256)
        );
        break;

      default:
        grayScale = pixelArray;
    }

    let grayScale2d = [];

    /**
     * pixelArray is 1d, backend accepts only 2d arrays
     */
    for (let i = 0; i < image.height; i++) {
      grayScale2d.push(
        Array.from(grayScale.slice(i * image.width, (i + 1) * image.width))
      );
    }

    const extremePoints = Object.values(handles).map(({ x, y }) => [
      Math.round(x),
      Math.round(y),
    ]);

    const data = {
      grayscale: grayScale2d,
      extremePoints,
    };

    const response = await fetch(`${this.configuration.backendHost}/dextr-grayscale`, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const mask = await response.json();

    const maskPixelArray = [];

    /**
     * Backend returns height x width 2d array with boolean values. drawBrushMethod accepts array of points to draw
     */
    mask.forEach((row, i) => {
      row.forEach((value, j) => {
        if (value) {
          maskPixelArray.push([j, i]);
        }
      });
    });

    const {
      labelmap2D,
      labelmap3D,
    } = segmentationModule.getters.labelmap2D(element);

    drawBrushPixels(
      maskPixelArray,
      labelmap2D.pixelData,
      labelmap3D.activeSegmentIndex,
      image.width
    );

    const segmentSet = new Set(labelmap2D.pixelData);
    const iterator = segmentSet.values();

    const segmentsOnLabelmap = [];
    let done = false;

    while (!done) {
      const next = iterator.next();

      done = next.done;

      if (!done) {
        segmentsOnLabelmap.push(next.value);
      }
    }

    labelmap2D.segmentsOnLabelmap = segmentsOnLabelmap;

    cornerstone.updateImage(element);
  }
}
