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

        // Start point
        this.startCoords = currentPoints.image;

        // Segmentation label matrix
        // used to define boundaries
        this.labelmap = get2DArray(this.paintEventData.labelmap2D.pixelData, this.rows, this.columns);

        const generalSeriesModuleMeta = cornerstone.metaData.get(
            'generalSeriesModule',
            eventData.image.imageId
        );

        const pixelArray = eventData.image.getPixelData();
        let grayScale;

        // This conversion avoids errors in finding the maximum difference between pixels
        // (consider other cases or work with negative values correctly)
        switch (generalSeriesModuleMeta.modality) {
            case 'CT':
                grayScale = pixelArray.map(value =>
                    Math.round(((value + 2048) / 4096) * 256)
                );
                break;

            default:
                grayScale = pixelArray;
        }

        // Image matrix
        this.imagePixelData2D = get2DArray(grayScale, this.rows, this.columns);

        // Maximum pixel value in the image
        // used to calculate coefficient for tolerance function
        this.maxPix = findMaxInArray(eventData.image.getPixelData());

        this._drawing = true;
        super._startListeningForMouseUp(element);
        this._lastImageCoords = currentPoints.image;

        return true;
    }

    mouseDragCallback(evt) {

        const {currentPoints} = evt.detail;

        // Current point
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

        // Calculation of distance changes by x or by y
        // Used as parameters for tolerance function and to calculate radius of the selected area
        const countDelta = (pointSt, pointFin) => {
            return Math.abs(pointSt - pointFin)
        };

        // Radius of bounding area
        // border - circle
        const circleRadius = rows * 0.25;

        // Radius of selected area
        // area - ellipse
        const radius_x = countDelta(xStart, xEnd);
        const radius_y = countDelta(yStart, yEnd);

        // Calculation of coefficients a, b for tolerance function
        // where a - maximum difference between two pixel values on the selected area,
        // b - tanh(a/maxPix)
        const a = count_a(imagePixelData2D, radius_x, radius_y, xStart, yStart);
        const b = count_b(a, this.maxPix);

        // Calculation of tolerance
        // tolerance = a*tanh(b*x), where x - delta of distance
        const tolerance = countTolerance(countDelta(xStart, xEnd), countDelta(yStart, yEnd), a, b);
        console.log(`tolerance ${tolerance}`);

        // Flood fill algorithm with tolerance
        // https://github.com/tuzz/n-dimensional-flood-fill
        let result = floodFill({
            getter: function (x, y) {
                if ((labelmap[y][x] !== 1) && (Math.sqrt(Math.pow(xStart - x, 2) + Math.pow(yStart - y, 2)) <= circleRadius)) {
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

        // Drawing
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

    // Cursor
    renderBrush(evt) {

        const {getters} = segmentationModule;
        const eventData = evt.detail;
        const viewport = eventData.viewport;
        const context = eventData.canvasContext;
        const element = eventData.element;
        let mousePosition;
        let width, height;

        if (this._drawing) {

            let mouseEndPosition = this._lastImageCoords; //end ellipse point
            mousePosition = this.startCoords; //start ellipse point

            context.strokeStyle = "rgba(255,255,255,0.1)";
            context.fillStyle = "rgba(255,255,255,0.1)";

            width = Math.abs(mousePosition.x - mouseEndPosition.x) * viewport.scale;
            height = Math.abs(mousePosition.y - mouseEndPosition.y) * viewport.scale;

        } else {

            mousePosition = csTools.store.state.mousePositionImage;
            const radius = 3 * (1 / viewport.scale);
            width = radius * viewport.scale;
            height = width;
            context.strokeStyle = "rgb(0,255,0)";
            context.fillStyle = "rgb(0,255,0)";

        }

        if (!mousePosition) {
            return;
        }

        const {rows, columns} = eventData.image;
        const {x, y} = mousePosition;

        if (x < 0 || x > columns || y < 0 || y > rows) {
            return;
        }

        context.setTransform(1, 0, 0, 1, 0, 0);

        const {labelmap2D} = getters.labelmap2D(element);

        const getPixelIndex = (x, y) => y * columns + x;
        const spIndex = getPixelIndex(Math.floor(x), Math.floor(y));
        const isInside = labelmap2D.pixelData[spIndex] === 1;
        this.shouldErase = !isInside;

        context.beginPath();

        const startCoordsCanvas = window.cornerstone.pixelToCanvas(
            element,
            mousePosition,
        );

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
    }

}

function get2DArray(imagePixelData, height, width) {

    let Array2d = [];
    for (let i = 0; i < height; i++) {
        Array2d.push(
            Array.from(imagePixelData.slice(i * width, (i + 1) * width))
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
    let max_val = data[0];
    for (let i = 0; i < data.length; i++) {
        if (data[i] > max_val) {
            max_val = data[i];
        }
    }
    return max_val;
}

function count_a(imagePixelData2D, radius_x, radius_y, xStart, yStart) {

    let max = imagePixelData2D[0][0];
    let min = imagePixelData2D[0][0];

    for (let i = 0; i < imagePixelData2D.length; i++) {
        for (let j = 0; j < imagePixelData2D[i].length; j++) {
            if ((Math.pow(j - xStart, 2) / radius_x ** 2) + (Math.pow(i - yStart, 2) / radius_y ** 2) <= 1) {
                max = Math.max(max, imagePixelData2D[i][j]);
                min = Math.min(min, imagePixelData2D[i][j]);
            }
        }
    }

    return max - min;
}

function count_b(a, max) {
    return (Math.tanh(0.008 * (a / max)) < 0.001) ? 0.001 : Math.tanh(0.008 * (a / max));
}

//TODO блокировать снимки
//TODO документирование функций и класса

//TODO flood fill результат

//отрицательные значения - временно решено
//при маленькой разнице, слишком маленький коэфициент b -> медленный рост - есть временное решение
//временное решение для толерантности сделано, все равно есть скачки