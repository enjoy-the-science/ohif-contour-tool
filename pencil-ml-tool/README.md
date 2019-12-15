# PencilML Tool for OHIF

### Usage

At `/extensions/cornerstone/src/init.js` add following code:

```js
import { PencilMLTool } from 'ohif-contour-tool';


/**
 * At the end of the file
 */
csTools.addTool(PencilMLTool, {
    configuration: { backendHost: '' },
}); 
csTools.setToolActive('PencilML', {mouseButtonMask: 1});
```

### Configuration paramteres

| Parameter | Type | Description | Default |
| --------- | ---- | ----------- | ------- |
| `backendHost` | `string` | host of the dextr algorithm implementation | `http://localhost:8080` |