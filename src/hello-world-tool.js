import csTools from "cornerstone-tools";
const drawEllipse = csTools.importInternal("drawing/drawEllipse");
const getNewContext = csTools.importInternal("drawing/getNewContext");
const getPixelSpacing= csTools.importInternal("util/getPixelSpacing");
const BaseTool = csTools.importInternal("base/BaseTool");

export default class HelloWorldMouseTool extends BaseTool {
  constructor(name = "HelloWorldMouse") {
    super({
      name,
      supportedInteractionTypes: ["Mouse"]
    });
  }

  preMouseDownCallback(evt) {
    console.log("Hello");
    const eventData = evt.detail;
    const { image, element } = eventData;
    //const context = getNewContext(eventData.canvasContext.canvas);
    const { rowPixelSpacing, colPixelSpacing } = getPixelSpacing(image);
    console.log(rowPixelSpacing);
  }

  activeCallback(element) {
    console.log(`Hello world plugin activated`);
  }

  disabledCallback(element) {
    console.log(`Hello world plugin deactivated`);
  }
}
