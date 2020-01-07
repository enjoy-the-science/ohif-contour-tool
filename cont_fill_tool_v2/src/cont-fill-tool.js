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

        //точка старта
        this.startCoords = currentPoints.image;

        //матрица с метками сегментации, используется для определения границ
        this.labelmap = get2DArray(this.paintEventData.labelmap2D.pixelData, this.rows, this.columns);

        //матрица изображения
        this.imagePixelData2D = get2DArray(eventData.image.getPixelData(), this.rows, this.columns);

        //максимальное значение пикселя в изображении, используется для расчета коеф. для функции толерантности
        this.maxPix = findMaxInArray(eventData.image.getPixelData());

        this._drawing = true;
        super._startListeningForMouseUp(element);
        this._lastImageCoords = currentPoints.image;

        return true;
    }

    mouseDragCallback(evt) {

        const {currentPoints} = evt.detail;

        //текущая точка
        this.finishCoords = currentPoints.image;
        this._lastImageCoords = currentPoints.image;

        this._paint(evt);
        cornerstone.updateImage(evt.detail.element);
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

        let xStart = this.startCoords.x.valueOf();
        let yStart = this.startCoords.y.valueOf();

        let xEnd = this.finishCoords.x.valueOf();
        let yEnd = this.finishCoords.y.valueOf();

        if (xEnd < 0 || xEnd > columns || yEnd < 0 || yEnd > rows) {
            return;
        }

        const imagePixelData2D = this.imagePixelData2D;
        const labelmap = this.labelmap;

        //Получение дельты
        const countDelta = (pointSt, pointFin) => {
            return Math.abs(pointSt - pointFin)
        };

        //Расчет радиуса области
        const radius = rows * 0.25;
        const radius1 = Math.max(countDelta(xStart, xEnd), countDelta(yStart, yEnd));//

        //Расчет коеффициентов a, b для функции толерантности
        const a = count_a(imagePixelData2D, radius1, xStart, yStart);
        const b = count_b(a, this.maxPix);

        //Расчет толерантности
        const tolerance = countTolerance(countDelta(xStart, xEnd), countDelta(yStart, yEnd), a, b);
        console.log(`tolerance ${tolerance}`);

        //Flood fill
        let result = floodFill({
            getter: function (x, y) {
                if ((labelmap[y][x] !== 1) && (Math.sqrt(Math.pow(xStart - x, 2) + Math.pow(yStart - y, 2)) <= radius)) {
                    return imagePixelData2D[y][x];
                }
            },
            seed: [Math.round(xStart), Math.round(yStart)],
            equals: function (a, b) {
                return Math.abs(a - b) <= tolerance;
            },
            diagonals: true
        });

        let pointerArray = result.flooded;

        //Отрисовка
        const {labelmap2D, labelmap3D} = this.paintEventData;

        drawBrushPixels(
            pointerArray,
            labelmap2D.pixelData,
            labelmap3D.activeSegmentIndex,
            columns,
            false
        );

        cornerstone.updateImage(evt.detail.element);
    }

    //Cursor
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

            const context = this.context;
            const element = eventData.element;

            context.setTransform(1, 0, 0, 1, 0, 0);

            const {labelmap2D} = getters.labelmap2D(element);

            const getPixelIndex = (x, y) => y * columns + x;
            const spIndex = getPixelIndex(Math.floor(x), Math.floor(y));
            const isInside = labelmap2D.pixelData[spIndex] === 1;
            this.shouldErase = !isInside;
            context.beginPath();
            context.strokeStyle = "rgba(255,255,255,0.1)";
            context.fillStyle = "rgba(255,255,255,0.1)";

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

            const radius = 2;
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

function get2DArray(imagePixelData, imageHeight, imageWidth) {

    let Array2d = [];
    for (let i = 0; i < imageHeight; i++) {
        Array2d.push(
            Array.from(imagePixelData.slice(i * imageWidth, (i + 1) * imageWidth))
        );
    }
    return Array2d;
}

function countTolerance(deltaX, deltaY, a, b) {

    if (deltaY === 0) {
        return a * Math.tanh(b * deltaX);
    } else if (deltaX === 0) {
        return a * Math.tanh(b * deltaY);
    } else {
        return a * Math.tanh(b * (deltaY + deltaX));
    }
}

function findMaxInArray(data) {
    let max_val = 0;
    for (let i = 0; i < data.length; i++) {
        if (data[i] > max_val) {
            max_val = data[i];
        }
    }
    return max_val;
}

function count_a(imagePixelData2D, radius, xStart, yStart) {

    let max = 0;//
    let min = 10000;//

    for (let i = 0; i < imagePixelData2D.length; i++) {
        for (let j = 0; j < imagePixelData2D[i].length; j++) {
            if (Math.sqrt(Math.pow(xStart - j, 2) + Math.pow(yStart - i, 2)) <= radius) {
                max = Math.max(max, imagePixelData2D[i][j]);
                min = Math.min(min, imagePixelData2D[i][j]);
            }
        }
    }

    return max - min;
}

function count_b(a, max) {
    return Math.tanh(0.1 * (a / max));
}


