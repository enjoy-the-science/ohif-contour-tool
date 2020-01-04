import csTools from "cornerstone-tools";

const BaseBrushTool = csTools.importInternal("base/BaseBrushTool");

import cornerstone from "cornerstone-core";
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

export default class PencilTool extends BaseBrushTool {
    constructor(props = {}) {
        const defaultProps = {
            name: 'Pencil',
            supportedInteractionTypes: ['Mouse', 'Touch'],
            configuration: {},
            mixins: ['renderBrushMixin'],
        };

        super(props, defaultProps);

        this.touchDragCallback = this._paint.bind(this);
    }

    _paint(evt) {
        console.log(evt);

        const {configuration} = segmentationModule;
        const eventData = evt.detail;
        const element = eventData.element;
        const {rows, columns} = eventData.image;
        const {x, y} = eventData.currentPoints.image;

        if (x < 0 || x > columns || y < 0 || y > rows) {
            return;
        }

        const radius = 1;
        const pointerArray = getCircle(radius, rows, columns, x, y);

        const {labelmap2D, labelmap3D, shouldErase} = this.paintEventData;

        drawBrushPixels(
            pointerArray,
            labelmap2D.pixelData,
            labelmap3D.activeSegmentIndex,
            columns,
            shouldErase
        );

        cornerstone.updateImage(evt.detail.element);
    }
}