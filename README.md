# EARLY WIP

## Goal
The goal of the project is to provide handy cornerstone tools for images segmentations.


## Current tools:
### [Contour brush tool](https://github.com/enjoy-the-science/ohif-contour-tool/blob/master/src/contour-brush.js)
Provides a simple brush tool which works in two conditions:
1. Creates segmentation if segmentation procedure started *outside* of segmentation region
2. Ereases segmentation if segmentation procedure started *inside* of segmentation region

### [Contour flood fill tool](https://github.com/enjoy-the-science/ohif-contour-tool/blob/master/src/contour-fill-tool.js)
Provides a flood fill algorithm for segmentation with threshold selection.

### [PencilML tool](https://github.com/enjoy-the-science/ohif-contour-tool/blob/master/src/pencil-ml-tool.js)
Uses [dextr](https://github.com/scaelles/DEXTR-PyTorch) algorithm to perform segmentation.
The backend with running ML is in the [separate repository](https://github.com/enjoy-the-science/PencilMLBackend)
