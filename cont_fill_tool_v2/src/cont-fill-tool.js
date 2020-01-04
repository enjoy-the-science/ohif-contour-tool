import csTools from "cornerstone-tools";
import cornerstone from "cornerstone-core";

const BaseBrushTool = csTools.importInternal("base/BaseBrushTool");
import floodFill from "n-dimensional-flood-fill";

const {drawBrushPixels} = csTools.importInternal(
    'util/segmentationUtils'
);
const segmentationModule = csTools.getModule('segmentation');

export default class CountourFillTool extends BaseBrushTool {
    constructor(props = {}) {
        const defaultProps = {
            name: 'CountourFill',
            supportedInteractionTypes: ['Mouse', 'Touch'],
            configuration: {},
        };

        super(props, defaultProps);

        this.preMouseDownCallback = this.preMouseDownCallback.bind(this);
        this._drawingMouseUpCallback = this._drawingMouseUpCallback.bind(this);
        this.init = this.init.bind(this);
        this.renderBrush = this.renderBrush.bind(this);
        this.mouseDragCallback = this.mouseDragCallback.bind(this);
        this._paint = this._paint.bind(this);
    }

    init(evt) {
        
        const eventData = evt.detail;
        const element = eventData.element;

        this.rows = eventData.image.rows;
        this.columns = eventData.image.columns;

        const {getters} = segmentationModule;

        const {
            labelmap2D,
            labelmap3D,
            currentImageIdIndex,
            activeLabelmapIndex,
        } = getters.labelmap2D(element);

        const shouldErase =
            super._isCtrlDown(eventData) || this.configuration.alwaysEraseOnClick;

        this.paintEventData = {
            labelmap2D,
            labelmap3D,
            currentImageIdIndex,
            activeLabelmapIndex,
            shouldErase,
        };
    }

    preMouseDownCallback(evt) {

        const eventData = evt.detail;
        this.init(evt);
        const {element, currentPoints} = eventData;
        this.startCoords = currentPoints.image;

        const PixelData2D = get_2DArray(this.paintEventData.labelmap2D.pixelData, this.rows, this.columns);

        const imagePixelData = eventData.image.getPixelData();
        this.imagePixelData2D = get_2DArray(imagePixelData, this.rows, this.columns);

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

        let areaPixelData = [];
        for (let i = 0; i < this.area.length; i++) {
            areaPixelData.push(this.imagePixelData2D[this.area[i][0]][this.area[i][1]]);
        }
        this.max_diff = get_max_diff(areaPixelData);

        this._drawing = true;
        super._startListeningForMouseUp(element);
        this._lastImageCoords = currentPoints.image;

        return true;
    }

    mouseDragCallback(evt) {

        const {currentPoints} = evt.detail;

        this.finishCoords = currentPoints.image;
        this._lastImageCoords = currentPoints.image;

        this.renderBrush(evt);
        this._paint(evt);
    }

    _drawingMouseUpCallback(evt) {
        const eventData = evt.detail;
        const {element, currentPoints} = eventData;

        this.finishCoords = currentPoints.image;

        this._drawing = false;
        super._stopListeningForMouseUp(element);
    }

    _paint(evt) {


        const rows = this.rows;
        const columns = this.columns;

        let xS = this.startCoords.x.valueOf();
        let yS = this.startCoords.y.valueOf();

        let x = this.finishCoords.x.valueOf();
        let y = this.finishCoords.y.valueOf();


        if (x < 0 || x > columns || y < 0 || y > rows) {
            return;
        }

        const imagePixelData2D = this.imagePixelData2D;

        const area = this.area;

        //? too slow, when get big area
        const inArea = (x, y) => {
            for (let i = 0; i < area.length; i++) {
                if ((area[i][0] === x) && (area[i][1] === y)) {
                    return true;
                }
            }
            return false;
        };

        const k = this.max_diff;

        const get_delta = (pointSt, pointFin) => {
            return Math.abs(pointSt - pointFin)
        };

        const tolerance = count_tolerance(get_delta(xS, x), get_delta(yS, y), k);
        console.log(`tolerance ${tolerance}`);

        const {labelmap2D, labelmap3D} = this.paintEventData;

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

        //?добавить сглаживание контура + заполнить пробелы
        drawBrushPixels(
            pointerArray,
            labelmap2D.pixelData,
            labelmap3D.activeSegmentIndex,
            columns,
            false
        );

        cornerstone.updateImage(evt.detail.element);
    }


    renderBrush(evt) {
        const {getters} = segmentationModule;
        const eventData = evt.detail;
        const viewport = eventData.viewport;

        let mousePosition;

        if (this._drawing) {
            mousePosition = this._lastImageCoords; //end ellipse point
            let startPointForDrawing = this.startCoords; //start ellipse point

            if (!mousePosition) {
                return;
            }

            const {rows, columns} = eventData.image;
            const {x, y} = mousePosition;

            if (x < 0 || x > columns || y < 0 || y > rows) {
                return;
            }

            const radius = 1;
            const context = this.context;
            const element = eventData.element;
            const color = getters.brushColor(element, this._drawing);

            context.setTransform(1, 0, 0, 1, 0, 0);

            const {labelmap2D} = getters.labelmap2D(element);

            const getPixelIndex = (x, y) => y * columns + x;
            const spIndex = getPixelIndex(Math.floor(x), Math.floor(y));
            const isInside = labelmap2D.pixelData[spIndex] === 1;
            this.shouldErase = !isInside;
            context.beginPath();
            context.strokeStyle = color;
            context.fillStyle = "rgba(128,128,128,0.5)";

            const startCoordsCanvas = window.cornerstone.pixelToCanvas(
                element,
                startPointForDrawing,
            );

            let width = Math.abs(startPointForDrawing.x - mousePosition.x) * viewport.scale;
            let height = Math.abs(startPointForDrawing.y - mousePosition.y) * viewport.scale;

            context.ellipse(
                startCoordsCanvas.x,
                startCoordsCanvas.y,
                width,
                height,
                0,
                0,
                2 * Math.PI,
            );
            context.stroke();
            context.fill();

            this._lastImageCoords = eventData.image;
        } else {
            mousePosition = csTools.store.state.mousePositionImage;

            if (!mousePosition) {
                return;
            }

            const {rows, columns} = eventData.image;
            const {x, y} = mousePosition;

            if (x < 0 || x > columns || y < 0 || y > rows) {
                return;
            }

            const radius = 1;
            const context = eventData.canvasContext;
            this.context = eventData.canvasContext;
            const element = eventData.element;
            const color = getters.brushColor(element, this._drawing);

            context.setTransform(1, 0, 0, 1, 0, 0);

            let circleRadius = radius * viewport.scale;
            const mouseCoordsCanvas = window.cornerstone.pixelToCanvas(
                element,
                mousePosition,
            );

            const {labelmap2D} = getters.labelmap2D(element);

            const getPixelIndex = (x, y) => y * columns + x;
            const spIndex = getPixelIndex(Math.floor(x), Math.floor(y));
            const isInside = labelmap2D.pixelData[spIndex] === 1;
            this.shouldErase = !isInside;
            context.beginPath();
            context.strokeStyle = color;
            context.fillStyle = "rgba(128,128,128,0.5)";
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
            context.fill();

            this._lastImageCoords = eventData.image;
        }
    }

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
        let buff = data[i];
        for (let j = 0; j < data.length; j++) {
            if (Math.abs(buff - data[j]) > max_diff) {
                max_diff = Math.abs(buff - data[j]);
            }
        }
    }

    return max_diff + max_diff * 0.1;
}

//?(максимальная граница + более медленный рост + гибкое изменение)
function count_tolerance(deltaX, deltaY, k) {

    if (deltaY === 0) {
        return k * Math.tanh(0.02 * deltaX);
    } else if (deltaX === 0) {
        return k * Math.tanh(0.02 * deltaY);
    } else {
        return k * Math.tanh(0.02 * (deltaY + deltaX));
    }
}




