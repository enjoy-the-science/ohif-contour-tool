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
        this._startPainting(evt);
        this.startCoords = currentPoints.image;
        this._drawing = true;
        super._startListeningForMouseUp(element);
        this._paint(evt);
        
        return true;

    }

    _paint(evt) {

        const {configuration} = segmentationModule;
        const eventData = evt.detail;
        const element = eventData.element;
        const {rows, columns} = eventData.image;

        //get start points
        let xS = this.startCoords.x.valueOf();
        let yS = this.startCoords.y.valueOf();
        
        //get current points
        const {x, y} = eventData.currentPoints.image;

        if (x < 0 || x > columns || y < 0 || y > rows) {
            return;
        }

        //get ImagePixelData
        const image = eventData.image;
        const imagePixelData = image.getPixelData();
        
        //get 2D-array
        const imagePixelData2D = get_2DArray(imagePixelData, image.height, image.width);

        //count tolerance (need change function) deltaY and deltaX begin with 1 value
        const tolerance = count_tolerance(Math.abs(yS - y), get_max(imagePixelData));
        console.log(`tolerance ${tolerance}`);

        //Flood fill (TODO borders)
        let result = floodFill({
            getter: function (x, y) {
                return imagePixelData2D[y][x];
            },
            seed: [Math.round(xS), Math.round(yS)],
            equals: function (a, b) {
                return Math.abs(a - b) <= tolerance;
            },
            diagonals: true
        });

        let pointerArray = result.flooded; // TODO fill spaces abd round contours

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

    //TODO renderBrush
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

function get_2DArray(imagePixelData, imageHeight, imageWidth){
   
    let Array2d = [];

    for (let i = 0; i < imageHeight; i++) {
        Array2d.push(
            Array.from(imagePixelData.slice(i * imageWidth, (i + 1) * imageWidth))
        );
    }

    return Array2d;
}

//get max in array (need change) max different
function get_max(data) {
    
    let max_val = 0;
    
    for (let i = 0; i < data.length; i++) {
        if (data[i] > max_val) {
            max_val = data[i];
        }
    }
    
    return max_val;
}



//count tolerance (in progress) deltaX 2dpixelarray, max_val will be count 
function count_tolerance(deltaY, max_val) {
    
    return max_val * Math.tanh(0.15 * (deltaY / 10));
}