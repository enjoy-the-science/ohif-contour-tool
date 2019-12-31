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

        //get ImagePixelData хранить только один вариант
        this.imagePixelData = eventData.image.getPixelData();
        this.imagePixelData2D = get_2DArray(this.imagePixelData, rows, columns);

        //get area
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

        //ImagePixelData (убрать лишнее)
        const imagePixelData = this.imagePixelData;
        //2D-array
        const imagePixelData2D = this.imagePixelData2D;

        //Area
        const area = this.area;

        function inArea(x, y) {
            for (let i = 0; i < area.length; i++) {
                if ((area[i][0] === x) && (area[i][1] === y)) {
                    return true;
                }
            }
            return false;
        }

        //count tolerance (изменить функцию)
        const tolerance = count_tolerance(Math.abs(yS - y), get_max(imagePixelData));
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

    //TODO renderBrush
    //TODO fix bag
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


function get_max(data) {

    let max_val = 0;

    for (let i = 0; i < data.length; i++) {
        if (data[i] > max_val) {
            max_val = data[i];
        }
    }

    return max_val;
}


function count_tolerance(deltaY, max_val) {

    return max_val * Math.tanh(0.15 * (deltaY / 10));
}