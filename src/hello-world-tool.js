import csTools from "cornerstone-tools";
const drawEllipse = csTools.importInternal("drawing/drawEllipse");
const getNewContext = csTools.importInternal("drawing/getNewContext");
const BaseTool = csTools.importInternal("base/BaseTool");

function mean_thresh(data) {
  let threshold = 0;
  let sum = 0;
  for(let i = 0; i<data.length; i++){
    sum = sum + data[i];
  }
  threshold = sum/data.length;
  return threshold;
}

export default class HelloWorldMouseTool extends BaseTool {
  constructor(name = "HelloWorldMouse") {
    super({
      name,
      supportedInteractionTypes: ["Mouse"]
    });
  }

 
  preMouseDownCallback(evt) {
    console.log("Threshold:");
    const eventData = evt.detail;
    const { image, element } = eventData;
    //const context = getNewContext(eventData.canvasContext.canvas);
    const PixelData = image.getPixelData();
    console.log(mean_thresh(PixelData));
  }


  activeCallback(element) {
    console.log(`plugin activated`);
  }

  disabledCallback(element) {
    console.log(`plugin deactivated`);
  }
}
