import csTools from "cornerstone-tools";
import cornerstone from "cornerstone-core";

const BaseBrushTool = csTools.importInternal("base/BaseBrushTool");
import floodFill from "n-dimensional-flood-fill";


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
        this.preMouseDownCallback = this.preMouseDownCallback.bind(this);
        this.mouseDragCallback = this._paint.bind(this);

    }


    preMouseDownCallback(evt) {

        const eventData = evt.detail;
        const {element, currentPoints} = eventData;
        const {rows, columns} = eventData.image;
        this._startPainting(evt);

        //get start coordinate
        this.startCoords = currentPoints.image;

        //get labelmap
        const {getters} = segmentationModule;
        const {labelmap2D} = getters.labelmap2D(eventData.element);
        const PixelData2D = get_2DArray(labelmap2D.pixelData, rows, columns);

        //get ImagePixelData
        const imagePixelData = eventData.image.getPixelData();
        this.imagePixelData2D = get_2DArray(imagePixelData, rows, columns);

        //get contour area
        let result = floodFill({
            getter: function (x, y) {
                return PixelData2D[y][x];
            },
            seed: [Math.round(this.startCoords.x), Math.round(this.startCoords.y)],
            equals: function (a, b) {
                return a === b;
            },
            diagonals: true
        });

        this.area = result.flooded;

        //get coeff for count tolerance
        let areaPixelData = [];
        for (let i = 0; i < this.area.length; i++) {
            areaPixelData.push(this.imagePixelData2D[this.area[i][0]][this.area[i][1]]);
        }
        this.max_diff = get_max_diff(areaPixelData);

        this._drawing = true;
        super._startListeningForMouseUp(element);
        this._paint(evt);

        return true;

    }

    _paint(evt) {

        const eventData = evt.detail;
        const {rows, columns} = eventData.image;


        //start points
        let xS = this.startCoords.x.valueOf();
        let yS = this.startCoords.y.valueOf();

        //get current points
        const {x, y} = eventData.currentPoints.image;

        if (x < 0 || x > columns || y < 0 || y > rows) {
            return;
        }

        //ImagePixelData
        const imagePixelData2D = this.imagePixelData2D;

        //Area
        const area = this.area;

        //?
        function inArea(x, y) {
            for (let i = 0; i < area.length; i++) {
                if ((area[i][0] === x) && (area[i][1] === y)) {
                    return true;
                }
            }
            return false;
        }

        //count tolerance
        const coeff = this.max_diff;

        const get_delta = (pointSt, pointFin) => {
            return Math.abs(pointSt - pointFin)
        };

        const tolerance = count_tolerance(get_delta(xS, x), get_delta(yS, y), coeff);
        console.log(`tolerance ${tolerance}`);

        const {labelmap2D, labelmap3D} = this.paintEventData;

        //Flood fill
        let result = floodFill({
            getter: function (x, y) {
                if (inArea(x, y)) {
                    return imagePixelData2D[y][x];
                }

            },
            seed: [Math.round(xS), Math.round(yS)],
            equals: function (a, b) {
                return Math.abs(a - b) <= tolerance;
            },
            diagonals: true
        });

        let pointerArray = result.flooded;

        // добавить сглаживание контура + заполнить пробелы
        drawBrushPixels(
            pointerArray,
            labelmap2D.pixelData,
            labelmap3D.activeSegmentIndex,
            columns,
            false
        );

        cornerstone.updateImage(evt.detail.element);
    }

    //TODO renderBrush cursor
    //TODO fix bag
    //TODO clean and document code
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

function get_2DArray(imagePixelData, imageHeight, imageWidth) {

    let Array2d = [];

    for (let i = 0; i < imageHeight; i++) {
        Array2d.push(
            Array.from(imagePixelData.slice(i * imageWidth, (i + 1) * imageWidth))
        );
    }

    return Array2d;
}

function get_max_diff(data) {

    let max_diff = 1;
    for (let i = 0; i < data.length; i++) {
        let buf = data[i];
        for (let j = 0; j < data.length; j++) {
            if (Math.abs(buf - data[j]) > max_diff) {
                max_diff = Math.abs(buf - data[j]);
            }
        }
    }

    return max_diff;
}

function count_tolerance(deltaX, deltaY, coeff) {

    if (deltaY === 0) {
        return coeff * Math.tanh(0.1 * deltaX);
    } else if (deltaX === 0) {
        return coeff * Math.tanh(0.1 * deltaY);
    } else {
        return coeff * Math.tanh(0.1 * (deltaY + deltaX));
    }
}

