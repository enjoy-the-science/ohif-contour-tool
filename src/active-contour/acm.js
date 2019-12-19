let ACM = (function() {
  function ACM(params) {
    this.img = params.img;
    console.log(this.img);
    this.margin = params.margin || 4;
    this.maxIteration = params.maxIteration || 250;
    this.minlen = params.minlen || Math.pow(0.1, 2);
    this.maxlen = params.maxlen || Math.pow(5, 2);
    // this.this = params.globalScope || this;
    var threshold = params.threshold || 0.1;

    this.startX = params.startX || 0;
    this.startY = params.startY || 0;
    this.imageData = params.imageData || null;
    // this.canvas = document.createElement("canvas");
    // this.canvas = document.getElementsByName("cornerstone-canvas");
    // document.body.appendChild(this.canvas);
    let sourceCanv = document.getElementsByClassName('cornerstone-canvas')[0];
    this.canvas = sourceCanv;

    // console.log(this.canvas);

    this.w = this.canvas.width = this.img.width;
    this.h = this.canvas.height = this.img.height;

    this.ctx = this.canvas.getContext('2d');
    // this.ctx.drawImage(this.img, this.startX, 0);

    // Draws a black square
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = this.margin;
    this.ctx.strokeRect(this.startX, 0, this.w, this.h);

    this.adaptGrayScale();

    // console.log(sourceCanv.getContext('2d'));

    // var gradientFlow = this.img.data.byteArray;
    // var gradientFlow = sourceCanv.getContext("2d").getImageData(this.startX, 0, this.w, this.h).data;
    // var gradientFlow = this.img.data.byteArray;

    // cornerstone.enable(this.canvas);
    // console.log(cornerstone.getPixels(this.canvas, true));

    var gradientFlow = this.imageData;
    // var gradientFlow =  this.img.data.byteArray;

    var result = ChamferDistance.compute(
      ChamferDistance.chamfer13,
      gradientFlow,
      threshold,
      this.img.width,
      this.img.height,
      this.ctx
    );
    // console.log(gradientFlow);
    // console.log(result);

    /*
            To put Gradient Flow on this particular img's canvas instance
        */
    // let imageData = this.ctx.createImageData(gradientFlow);
    // this.ctx.putImageData( imageData,0,0 );

    this.flowX = result[0];
    this.flowY = result[1];

    //binding the scope for animationFrameRequests
    this.update = this.update.bind(this);
    // this.update = this.update.
    this.setSnakeDots = this.setSnakeDots.bind(this);
  }

  function adaptGrayScale() {
    var scope = this;
    this.imageData = Array.from(Object.values(this.imageData));
    for (let i = 0; i < this.imageData.length; i++) {
      this.imageData[i] = ((this.imageData[i] + 2048) / 4096) * 256;
    }
    // this.imageData.forEach(function (p) {
    //
    //     p = (p + 2048) /4096 * 256;
    //
    // });
    return this.imageData;
  }

  function setSnakeDots(data) {
    this.snake = [];
    for (var i = 0; i < data.length; i++) {
      var p = [data[i][0], data[i][1]];
      this.snake.push(p);
    }
    console.log('this.snake in setSnakeDots', this.snake);
    // this.it = 0;
    // this.length = 0;
    // this.last = this.getsnakelength();
    // cancelAnimationFrame(this.interval);
    // this.update();
    // this.renderAlgo();
  }

  function compute(_onComplete) {
    this.onComplete = _onComplete;
    // this.snake = [];
    // // set starting dots number for a snake
    // //def = 20
    // var count = 100;
    // var r = Math.max(this.w, this.h);
    // for (var i = 0; i < count; i++) {
    //     var a = Math.PI * 2 / count * i;
    //     var p = [
    //         Math.max(this.margin, Math.min(this.w - this.margin, ~~(this.w / 2 + Math.cos(a) * r))),
    //         Math.max(this.margin, Math.min(this.h - this.margin, ~~(this.h / 2 + Math.sin(a) * r)))
    //     ];
    //     // console.log("P ", i, ": ", p);
    //     this.snake.push(p);
    // }
    this.it = 0;
    this.length = 0;
    this.last = this.getsnakelength();
    cancelAnimationFrame(this.interval);
    this.update();
    this.renderAlgo();
  }

  function update() {
    this.loop();
    this.renderAlgo();
    this.length = this.getsnakelength();
    if (++this.it >= this.maxIteration) {
      // console.log("points:", this.snake.length, 'iteration:', this.it);
      cancelAnimationFrame(this.interval);
      this.renderAlgo(true);
      if (this.onComplete) {
        this.onComplete(this.snake);
      }
    } else {
      this.interval = requestAnimationFrame(this.update);
      this.last = this.length;
    }
  }

  function loop() {
    var scope = this;

    // console.log('this.snake in loop 1', [...this.snake]);
    for (let i = 0; i < this.snake.length; i++) {
      // console.log(this.snake.length);
      let p = [this.snake[i][0], this.snake[i][1]];
      if (p[0] <= 0 || p[0] >= this.w - 1 || p[1] <= 0 || p[1] >= this.h - 1)
        return;
      var vx = (0.5 - this.flowX[~~p[0]][~~p[1]]) * 2;
      var vy = (0.5 - this.flowY[~~p[0]][~~p[1]]) * 2;
      p[0] += vx * 100;
      p[1] += vy * 100;
      this.snake[i] = p;
      // console.log("loop ", p);
    }
    // console.log('this.snake in loop2', [...this.snake]);

    // this.snake.forEach(function (p) {
    //     if (p[0] <= 0 || p[0] >= scope.w - 1 || p[1] <= 0 || p[1] >= scope.h - 1) return;
    //     var vx = (.5 - scope.flowX[~~(p[0])][~~(p[1])]) * 2;
    //     var vy = (.5 - scope.flowY[~~(p[0])][~~(p[1])]) * 2;
    //     p[0] += vx * 100;
    //     p[1] += vy * 100;
    //     console.log("loop ", p);
    // });

    //add / remove
    // this.snake.forEach(function (cur, i, snake) {
    var tmp = [];
    for (var i = 0; i < this.snake.length; i++) {
      var prev = this.snake[i - 1 < 0 ? this.snake.length - 1 : i - 1];
      var cur = this.snake[i];
      var next = this.snake[(i + 1) % this.snake.length];
      // console.log(next);
      var dist = distance(prev, cur) + distance(cur, next);

      // console.log(dist, dist > this.minlen);
      //if the length is too short, don't use this point anymore
      if (dist > this.minlen) {
        //if it is below the max length
        if (dist < this.maxlen) {
          //store the point
          tmp.push(cur);
        } else {
          //otherwise split the previous and the next edges
          var pp = [lerp(0.5, prev[0], cur[0]), lerp(0.5, prev[1], cur[1])];
          var np = [lerp(0.5, cur[0], next[0]), lerp(0.5, cur[1], next[1])];

          // and add the midpoints to the snake
          tmp.push(pp, np);
        }
      } else {
        console.log('nu mi tak i znali!');
      }
    }
    // console.log('tmp', tmp);
    this.snake = tmp;
    return this.snake;
  }

  function renderAlgo(finished) {
    // this.ctx.clearRect(this.startX, 0, this.w, this.h);

    // console.log(this.img);
    // this.ctx.drawImage(this.img, this.startX, 0, this.w, this.h);

    // const canvas = document.getElementsByClassName('cornerstone-canvas')[0];
    // try {
    //
    //     cornerstone.enable(canvas);
    //     cornerstone.updateImage(canvas, true);
    //
    // } catch (error){
    //     cornerstone.updateImage(canvas, true);
    // }
    // console.log(',dnbgkmdsbgfdngkdfnbgkdfbjgkdfbkgbdfgkjf', this.ctx);
    this.ctx.lineWidth = 1;
    this.ctx.strokeStyle = '#85e2ff';
    // this.ctx.fillStyle = Boolean(finished) ? "rgba( 255,0,0, .5 )" : "rgba(255,255,255,.5 )";
    // if (finished){
    this.ctx.fillStyle = Boolean(finished)
      ? 'rgba( 255,0,0, .5 )'
      : 'rgba(133,226,255,0.5)';
    this.ctx.beginPath();
    var scope = this;
    // console.log('this.snake');
    // console.log(this.snake);
    this.snake.forEach(function(p) {
      // console.log(p[0], ' ', p[1]);

      scope.ctx.lineTo(p[0], p[1]);
    });
    // throw new Error('')
    this.ctx.closePath();
    this.ctx.stroke();
    this.ctx.fill();

    this.ctx.fillStyle = '#FFF';
    this.ctx.font = '10px Verdana';
    // }

    // this.ctx.fillText("iteration: " + this.it + " / " + this.maxIteration + ' length: ' + this.last.toFixed(2), 10, 10);

    //TODO: return final snakePoints this.snake
  }

  // total length of snake
  function getsnakelength() {
    var length = 0;
    for (var i = 0; i < this.snake.length; i++) {
      var cur = this.snake[i];
      var next = this.snake[(i + 1) % this.snake.length];
      length += distance(cur, next);
    }
    return length;
  }

  function distance(a, b) {
    var dx = a[0] - b[0];
    var dy = a[1] - b[1];
    // console.log('a, b, dx, dy', a, b, dx, dy);
    return dx * dx + dy * dy;
    // return Math.sqrt(dx * dx + dy * dy);
  }

  function lerp(t, a, b) {
    return a + t * (b - a);
  }

  var p = ACM.prototype;
  p.constructor = ACM;
  p.compute = compute;
  p.update = update;
  p.loop = loop;
  p.renderAlgo = renderAlgo;
  p.getsnakelength = getsnakelength;
  p.setSnakeDots = setSnakeDots;
  p.adaptGrayScale = adaptGrayScale;
  return ACM;
  // }
})({});

/**
* Chamfer distance, helper functions to compute edges data and move among gradient
* @author Code by Xavier Philippeau
* Kernels by Verwer, Borgefors and Thiel
*/
let ChamferDistance = (function(chamfer) {
  chamfer.cheessboard = [[1, 0, 1], [1, 1, 1]];
  // chamfer.cheessboard = [[1, 0, 1], [1, 0, 1]];
  chamfer.chamfer3 = [[1, 0, 3], [1, 1, 4]];
  chamfer.chamfer5 = [[1, 0, 5], [1, 1, 7], [2, 1, 1]];
  chamfer.chamfer7 = [[1, 0, 14], [1, 1, 20], [2, 1, 31], [3, 1, 44]];
  chamfer.chamfer13 = [
    [1, 0, 68],
    [1, 1, 96],
    [2, 1, 152],
    [3, 1, 215],
    [3, 2, 245],
    [4, 1, 280],
    [4, 3, 340],
    [5, 1, 346],
    [6, 1, 413],
  ];
  chamfer.chamfer = null;

  chamfer.init2DArray = function(w, h) {
    const arr = [];
    for (let x = 0; x < w; x++) {
      arr.push(new Float32Array(h));
    }
    return arr;
  };

  function testAndSet(output, x, y, w, h, newvalue) {
    if (x < 0 || x >= w) return;
    if (y < 0 || y >= h) return;
    const v = output[x][y];
    if (v >= 0 && v < newvalue) return;
    output[x][y] = newvalue;
  }

  chamfer.compute = function(chamfermask, imageData, threshold, w, h, ctx) {
    chamfer.chamfer = chamfermask || chamfer.chamfer13;
    w = w - 1;
    h = h - 1;
    const gradient = chamfer.init2DArray(w, h);
    const flowX = chamfer.init2DArray(w, h);
    const flowY = chamfer.init2DArray(w, h);
    // const data = imageData.data;
    const data = imageData;
    // debugger;
    // initialize distance
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var id = y * w + x;
        var dataid = data[id];
        if (id == data.length) continue;
        // const luma = 0.212 * (data[id] / 0xFF) + 0.7152 * (data[id + 1] / 0xFF) + 0.0722 * (data[id + 2] / 0xFF);
        const luma = dataid / 0xff;

        // if (isNaN(luma)){
        //
        //     console.log(luma, ' y:', y, ' x:', x, ' id:', id, ' data[id], ',data[id]);
        // }

        if (luma <= threshold) {
          gradient[x][y] = -1;
          // data[id] = data[id + 1] = data[id + 2] = 0;
          data[id] = 0;
        } else {
          // data[id] = data[id + 1] = data[id + 2] = 0xFF;
          data[id] = 0xff;
        }
      }
    }

    //normalization value
    let max = 0;
    let min = 1e10;
    //forward pass
    for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
        var v = gradient[x][y];
        if (v < 0) continue;
        for (var k = 0; k < chamfer.chamfer.length; k++) {
          var dx = chamfer.chamfer[k][0];
          var dy = chamfer.chamfer[k][1];
          var dt = chamfer.chamfer[k][2];

          testAndSet(gradient, x + dx, y + dy, w, h, v + dt);
          if (dy != 0) {
            testAndSet(gradient, x - dx, y + dy, w, h, v + dt);
          }
          if (dx != dy) {
            testAndSet(gradient, x + dy, y + dx, w, h, v + dt);
            if (dy != 0) {
              testAndSet(gradient, x - dy, y + dx, w, h, v + dt);
            }
          }
          min = Math.min(min, gradient[x][y]);
          max = Math.max(max, gradient[x][y]);
        }
      }
    }

    // backward
    for (y = h - 1; y > 0; y--) {
      for (x = w - 1; x > 0; x--) {
        v = gradient[x][y];
        if (v < 0) continue;
        for (k = 0; k < chamfer.chamfer.length; k++) {
          dx = chamfer.chamfer[k][0];
          dy = chamfer.chamfer[k][1];
          dt = chamfer.chamfer[k][2];
          testAndSet(gradient, x - dx, y - dy, w, h, v + dt);
          if (dy != 0) {
            testAndSet(gradient, x + dx, y - dy, w, h, v + dt);
          }
          if (dx != dy) {
            testAndSet(gradient, x - dy, y - dx, w, h, v + dt);
            if (dy != 0) {
              testAndSet(gradient, x + dy, y - dx, w, h, v + dt);
            }
          }
        }
        min = Math.min(min, gradient[x][y]);
        max = Math.max(max, gradient[x][y]);
      }
    }

    // normalize
    for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
        if (x == 0 || x == w - 1 || y == 0 || y == h - 1) {
          flowX[x][y] = flowY[x][y] = 0;
          continue;
        }
        dx = (gradient[x + 1][y] - gradient[x - 1][y]) * 0.5 + max * 0.5;
        dy = (gradient[x][y + 1] - gradient[x][y - 1]) * 0.5 + max * 0.5;
        flowX[x][y] = dx / max;
        flowY[x][y] = dy / max;

        if (dx !== 0 || dy !== 0 || max !== 0 || min !== 0) {
          // console.log(dx, dy, max, min);
        }

        // if (flowX[x][y] == NaN) {
        //   console.log(flowX[x][y], ' ', max);
        // }
        // console.log(flowX[x][y], ' ', max);

        //render values to imageData
        // id = (y * w + x)  *4;
        id = y * w + x;
        // data[id] = data[id + 1] = data[id + 2] = 0xFF - map(gradient[x][y], min, max / 2, 0, 0xFF);
        data[id] = 0xff - map(gradient[x][y], min, max / 2, 0, 0xff);
        // data[id + 3] = 0xFF;
      }
    }
    // debugger;

    // console.log(data);
    // var newImgData=ctx.createImageData(data, 0, 0, w, h);
    // ctx.putImageData(data,0,0);

    //We dont want to draw Gradient, so comment
    imageData.data = data;

    return [flowX, flowY];
  };

  function lerp(t, a, b) {
    return a + t * (b - a);
  }

  function norm(t, a, b) {
    return (t - a) / (b - a);
  }

  function map(t, a0, b0, a1, b1) {
    return lerp(norm(t, a0, b0), a1, b1);
  }

  return chamfer;
})({});

export { ACM, ChamferDistance };
