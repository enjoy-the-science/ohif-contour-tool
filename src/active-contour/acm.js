/**
* Created by nico on 16/12/2015.
*/
export const ACM = function(){

  function ACM( params ){

      this.margin = 4;
      this.maxIteration = params.maxIteration || 250;
      this.minlen = params.minlen || Math.pow( .1, 2 );
      this.maxlen = params.maxlen || Math.pow( 5, 2 );
      var threshold = params.threshold || .1;

      this.w = params.width;
      this.h = params.height;

      // {data: [], height, width}
      const imageData = params.imageData

      console.log(imageData)

      var result = ChamferDistance.compute(ChamferDistance.chamfer13, imageData.data, threshold, imageData.width, imageData.height);

      this.flowX = result[0];
      this.flowY = result[1];

      //binding the scope for animationFrameRequests
      this.update = this.update.bind(this);
      this.render = params.render;
  }

  // compute -> update -> loop, _render ->
  function compute( _onComplete ) {
      this.onComplete = _onComplete;
      this.snake = [];
      var count = 20;
      var r = Math.max(this.w, this.h);
      for (var i = 0; i < count; i++) {
          var a = Math.PI * 2 / count * i;
          var p = [
              Math.max(this.margin, Math.min(this.w - this.margin, ~~( this.w / 2 + Math.cos(a) * r ))),
              Math.max(this.margin, Math.min(this.h - this.margin, ~~( this.h / 2 + Math.sin(a) * r )))
          ];
          this.snake.push(p);
      }
      this.it = 0;
      this.length = 0;
      this.last = this.getsnakelength();
      cancelAnimationFrame(this.interval);

      // update вызывается рекурсивно
      this.update();
      // _render и так вызывается в update
      // this._render();
  }

  function update() {

      this.loop();
      this._render();
      this.length = this.getsnakelength();
      if (++this.it >= this.maxIteration) {
          console.log("points:", this.snake.length, 'iteration:', this.it);
          cancelAnimationFrame(this.interval);
          this._render(true);
          // if( this.onComplete ){
          //     this.onComplete( this.snake );
          // }
      } else {
          this.interval = requestAnimationFrame(this.update);
          this.last = this.length;
      }
  }

  function loop() {

      var scope = this;
      this.snake.forEach(function (p) {
          if (p[0] <= 0 || p[0] >= scope.w - 1 || p[1] <= 0 || p[1] >= scope.h - 1)return;
          var vx = (.5 - scope.flowX[~~( p[0])][~~( p[1] )] ) * 2;
          var vy = (.5 - scope.flowY[~~( p[0])][~~( p[1] )] ) * 2;
          p[0] += vx * 100;
          p[1] += vy * 100;
      });

      //add / remove
      // this.snake.forEach(function (cur, i, snake) {
      var tmp = [];
      for( var i = 0; i < this.snake.length; i++ ){

          var prev = this.snake[(i - 1 < 0 ? this.snake.length - 1 : (i - 1))];
          var cur = this.snake[i];
          var next = this.snake[(i + 1) % this.snake.length];

          var dist = distance(prev, cur) + distance(cur, next);

          //if the length is too short, don't use this point anymore
          if (dist > this.minlen){

              //if it is below the max length
              if (dist < this.maxlen) {
                  //store the point
                  tmp.push(cur);

              }else{
                  //otherwise split the previous and the next edges
                  var pp = [lerp(.5, prev[0], cur[0]), lerp(.5, prev[1], cur[1])];
                  var np = [lerp(.5, cur[0], next[0]), lerp(.5, cur[1], next[1])];

                  // and add the midpoints to the snake
                  tmp.push(pp, np);
              }
          }
      }
      this.snake = tmp;
      return this.snake;
  }

  function _render(finished) {
      this.render(this.snake, this.it, this.last, finished);
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

  function distance( a, b) {
      var dx = a[0] - b[0];
      var dy = a[1] - b[1];
      return dx * dx + dy * dy;
  }
  function lerp(t, a, b) {
      return a + t * ( b - a );
  }

  var p = ACM.prototype;
  p.constructor = ACM;
  p.compute = compute;
  p.update = update;
  p.loop = loop;
  p._render = _render;
  p.getsnakelength = getsnakelength;
  return ACM;
}();


/**
* Chamfer distance
* @author Code by Xavier Philippeau
* Kernels by Verwer, Borgefors and Thiel
*/
export const ChamferDistance = function (chamfer) {

  chamfer.cheessboard = [[1, 0, 1], [1, 1, 1]];
  chamfer.chamfer3 = [[1, 0, 3], [1, 1, 4]];
  chamfer.chamfer5 = [[1, 0, 5], [1, 1, 7], [2, 1, 1]];
  chamfer.chamfer7 = [[1, 0, 14], [1, 1, 20], [2, 1, 31], [3, 1, 44]];
  chamfer.chamfer13 = [[1, 0, 68], [1, 1, 96], [2, 1, 152], [3, 1, 215], [3, 2, 245], [4, 1, 280], [4, 3, 340], [5, 1, 346], [6, 1, 413]];
  chamfer.chamfer = null;

  chamfer.init2DArray = function(w, h) {
      var arr = [];
      for (var x = 0; x < w; x++) {
          arr.push(new Float32Array(h));
      }
      return arr;
  };

  function testAndSet(output, x, y,w,h, newvalue) {
      if (x < 0 || x >= w) return;
      if (y < 0 || y >= h) return;
      var v = output[x][y];
      if (v >= 0 && v < newvalue) return;
      output[x][y] = newvalue;
  }

  chamfer.compute = function (chamfermask, data, threshold, w, h) {

      chamfer.chamfer = chamfermask || chamfer.chamfer13;

      var gradient = chamfer.init2DArray(w, h);
      var flowX = chamfer.init2DArray(w, h);
      var flowY = chamfer.init2DArray(w, h);
      // initialize distance
      for (var y = 0; y < h; y++) {
          for (var x = 0; x < w; x++) {
              var id = ( y * w + x ) * 4;
              var luma = 0.212 * ( data[id] / 0xFF ) + 0.7152 * ( data[id + 1] / 0xFF ) + 0.0722 * ( data[id + 2] / 0xFF );
              if (luma <= threshold ) {
                  gradient[x][y] = -1;
              }

          }
      }

      //normalization value
      var max = 0;
      var min = 1e10;
      //forward pass
      for (y = 0; y < h; y++) {
          for (x = 0; x < w; x++) {
              var v = gradient[x][y];
              if (v < 0) continue;
              for (var k = 0; k < chamfer.chamfer.length; k++) {

                  var dx = chamfer.chamfer[k][0];
                  var dy = chamfer.chamfer[k][1];
                  var dt = chamfer.chamfer[k][2];

                  testAndSet(gradient, x + dx, y + dy,w,h, v + dt);
                  if (dy != 0) {
                      testAndSet(gradient, x - dx, y + dy,w,h,v + dt);
                  }
                  if (dx != dy) {
                      testAndSet(gradient, x + dy, y + dx,w,h, v + dt);
                      if (dy != 0) {
                          testAndSet(gradient, x - dy, y + dx,w,h, v + dt);
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
                  testAndSet(gradient, x - dx, y - dy,w,h, v + dt);
                  if (dy != 0) {
                      testAndSet(gradient, x + dx, y - dy,w,h, v + dt);
                  }
                  if (dx != dy) {
                      testAndSet(gradient, x - dy, y - dx,w,h, v + dt);
                      if (dy != 0) {
                          testAndSet(gradient, x + dy, y - dx,w,h, v + dt);
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
              dx = ( gradient[x + 1][y] - gradient[x - 1][y] ) * .5 + max * .5;
              dy = ( gradient[x][y + 1] - gradient[x][y - 1] ) * .5 + max * .5;
              flowX[x][y] = dx / max;
              flowY[x][y] = dy / max;

              //_render values to imageData
              id = ( y * w + x ) * 4;
              data[id] = data[id+1] = data[id+2] = 0xFF - map( gradient[x][y],min,max/2, 0,0xFF );
              data[id+3] = 0xFF;
          }
      }

      return [flowX, flowY];
  };

  function lerp(t, a, b) {
      return a + t * ( b - a );
  }
  function norm(t, a, b) {
      return ( t - a ) / ( b - a );
  }
  function map(t, a0, b0, a1, b1) {
      return lerp(norm(t, a0, b0), a1, b1);
  }
  return chamfer;
}({});
