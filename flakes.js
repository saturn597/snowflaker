var Flake = Flake || {};

Flake.makeSegment = function(point1, point2) {
    // return an object representing the line segment from point 1 to point 2
    // "points' are objects containing an x and y coordinate

    // store the line as coefficients of the equation ax + by = c
    // knowing those coefficients helps us calculate intersections

    var a = point2.y - point1.y,
        b = point1.x - point2.x,
        c = a * point1.x + b * point1.y,

        minX = Math.min(point1.x, point2.x),
        maxX = Math.max(point1.x, point2.x),
        minY = Math.min(point1.y, point2.y),
        maxY = Math.max(point1.y, point2.y);

    return {

        getCoefficients: function() {
                             return { a: a, b: b, c: c };
                         },

        getPoints: function() {
                       // return the points used to make this line (the "ends" of the line)
                       // construct new point objects so callers won't be able to modify ours
                       
                       return [ { x: point1.x, y: point1.y }, { x: point2.x, y: point2.y } ];
                   },

        inRange: function(pt) {
                     // test whether an { x, y } pair has x and y values in between our two points
                     // the "0.01" is to allow tolerance for floating point issues

                     return minX <= pt.x + 0.01 && pt.x - 0.01 <= maxX && minY <= pt.y + 0.01 && pt.y - 0.01 <= maxY;
        },

        intersection: function(line) {
                          // find the intersection of this line segment with the segment passed as "line"
                          // returns null if they don't intersect 
                        
                          var coeffs = line.getCoefficients(), 
                            det = a * coeffs.b - coeffs.a * b,
                            result = null;

                          if (det !== 0) {
                              // if determinant is 0, lines are parallel, otherwise can calculate an intersection
                              result = {
                                  x: (coeffs.b * c - b * coeffs.c) / det,
                                  y: (a * coeffs.c - coeffs.a * c) / det
                              };
                              if (!this.inRange(result) || !line.inRange(result)) {
                                  // even if we were able to calculate an intersection, the line segments may not 
                                  // "reach" each other
                                  result = null;
                              }
                          }

                          return result;
                      }
    };
};

Flake.makeTriangle = function(x, y, height, angle) {
    // a "triangle" is an object containing an array of points that describe some shape.
    // the shape will initially be a trinagle. 
    // the initial triangle will be isosceles, with a height of "height" and the angle at the vertex
    // given by "angle", and with the vertex centered at (x, y).
    // this triangle can be "cut" to yield a new shape.

    var base = 2 * (Math.tan(angle / 2) * height),
        points = [{ x: x, y: y }, { x: height + x, y: base * 0.5 + y }, { x: height + x, y: -base * 0.5 + y}],

        pivot = { x: x, y: y },  // when "flipped" the triangle will be flipped around this point

        currentState = { points: points.slice(), next: null, prev: null };

    function linesFromPoints(pts) {
        // our shape is represented by a series of points. this function converts it into a series of line segments
        // that have a handy intersection method

        var i, lines = [];

        for (i = 0; i < pts.length - 1; i++) {
            lines.push(Flake.makeSegment(pts[i], pts[i + 1]));
        }
        lines.push(Flake.makeSegment(pts[pts.length - 1], pts[0]));

        return lines;
    }

    function pointsFromLines(lines) {
        // this converts a series of line segments into a series of points.
        
        return lines.map(function(line) { return line.getPoints()[0] });
    }

    function getIntersection(line) {
        // given a line segment created by Flake.makeSegment, figure out where on the outside of our shape
        // the segment intersects.
    
        var i, intersection, lines = linesFromPoints(points);
        for (i = 0; i < lines.length; i++) {
            intersection = line.intersection(lines[i]);
            if (intersection) {
                return { lineNumber: i, intersection: intersection };
            }
        }
    }

    return {
        cut: function(cuts) {
                 var i, next, distance1, distance2, newPoints, newState,
                 end1 = Flake.makeSegment(cuts[0], cuts[1]),
                 end2 = Flake.makeSegment(cuts[cuts.length - 2], cuts[cuts.length - 1]),
                 
                 int1 = getIntersection(end1),
                 int2 = getIntersection(end2),
                 spliceStart = Math.min(int1.lineNumber, int2.lineNumber) + 1,
                 spliceLength = Math.abs(int1.lineNumber - int2.lineNumber);

                 console.log('int1 = ' + int1.lineNumber);
                 console.log('int2 = ' + int2.lineNumber);
                 cuts[0] = int1.intersection;
                 cuts[cuts.length - 1] = int2.intersection;

                 if (int2.lineNumber < int1.lineNumber) {
                     cuts.reverse();
                 }

                 if (int1.lineNumber === int2.lineNumber) {
                     next = int1.lineNumber + 1;
                     if (next >= points.length) {
                         next = 0;
                     }

                     distance1 = Math.pow(cuts[0].x - points[int1.lineNumber].x, 2) + Math.pow(cuts[0].y - points[int1.lineNumber].y, 2);
                     distance2 = Math.pow(cuts[cuts.length - 1].x - points[int1.lineNumber].x, 2) + Math.pow(cuts[cuts.length - 1].y - points[int1.lineNumber].y, 2);
                     
                     if (distance1 > distance2) {
                         cuts.reverse();
                     }
                 }
                 Array.prototype.splice.apply(points, [spliceStart, spliceLength].concat(cuts));
                 
                 newState = { prev: currentState, next: null, points: points.slice() };
                 currentState.next = newState;
                 currentState = newState;
             },

        display: function(ctx) {
                     ctx.fillStyle = 'rgb(' + Math.floor(Math.random() * 255) + ',' + Math.floor(Math.random() * 255) + ',' + Math.floor(Math.random() * 255) + ')';
                     this.prepareStroke(ctx);
                     ctx.fillStyle = '#ffffff';
                     ctx.fill();
                 },

        flip: function() {
                  var i;
                  this.showPoints();
                  for (i = 0; i < points.length; i++) {
                      points[i].y = 2 * pivot.y - points[i].y;
                  }
                  console.log(this.showPoints());
              },

        getDimensions: function() {
                                  return { x: height, y: base };
                              },

        prepareStroke: function(ctx) {
                    var i;
                    ctx.beginPath(); 
                    ctx.moveTo(points[0].x + x, points[0].y + y);
                    for (i = 1; i < points.length; i++) {
                        ctx.lineTo(points[i].x + x, points[i].y + y);
                    }
                    ctx.closePath();
                },

        redo: function() {
                  if (currentState.next) {
                      currentState = currentState.next;
                      points = currentState.points.slice();
                  }
              },

        showPoints: function() {
                        return JSON.stringify(points);
                    },

        translate: function(xMove, yMove) {
                       var i;
                       pivot.x += xMove;
                       pivot.y += yMove;
                       for (i = 0; i < points.length; i++) {
                           points[i].x += xMove;
                           points[i].y += yMove;
                       }
                   },
        
        undo: function() {
                  if (currentState.prev) {
                      currentState = currentState.prev;
                      points = currentState.points.slice();
                  }
              }
    };
};

Flake.newCut = function() {
    var snips = [];
    return {
        canFinish: function() {
                       return snips.length > 1;
                   },
        getSnips: function() {
                      return snips.slice(); 
                  },
        add: function(cut) {
                      console.log(cut);
                      snips.push(cut);
                  },
        isStarted: function() {
                        return snips.length > 0;
                   },
        updateMark: function(ctx) {
                        var topSnip = snips[snips.length - 1], prevSnip;
                        ctx.fillStyle = '#ff0000';
                        ctx.fillRect(topSnip.x - 1, topSnip.y - 1, 2, 2);

                        if (snips.length > 1) {
                           prevSnip = snips[snips.length - 2]; 
                           ctx.beginPath();
                           ctx.moveTo(prevSnip.x, prevSnip.y);
                           ctx.lineTo(topSnip.x, topSnip.y);
                           ctx.stroke();
                        }
                    }
    };
};

window.onload = function() {
    
    var canvas = document.getElementsByTagName('canvas')[0],
        undoButton = document.getElementById('undo'),
        redoButton = document.getElementById('redo'),
        unfoldCanvas = document.createElement('canvas'),
        ctx = canvas.getContext('2d'),
        width = canvas.width,
        height = canvas.height,
        
        triangle = Flake.makeTriangle(0, 0, width * 0.9, 2 * Math.PI / 12),
        foldedX = (width - triangle.getDimensions().x) / 2,
        foldedY = height / 2,
        
        cutHistory = [],
        cut = Flake.newCut();

    triangle.translate(foldedX, foldedY);

    function undo() {
        triangle.undo();
        resetDisplay();
    }
    undoButton.onclick = undo;

    function redo() {
        triangle.redo();
        resetDisplay();
    }
    redoButton.onclick = redo;

    // temp unfold stuff
    var unfoldCanvas = document.createElement('canvas'),
        unfoldContext = unfoldCanvas.getContext('2d');
    unfoldCanvas.setAttribute('width', width);
    unfoldCanvas.setAttribute('height', width);
    document.body.appendChild(unfoldCanvas);
    unfoldContext.scale(1/2, 1/2);
    unfoldContext.translate(width, width);
    
    // end temp unfold stuff
   
    function updateUnfold() {
        var i;

        unfoldContext.fillStyle = '#000000';
        unfoldContext.fillRect(-width * 2, -height * 2, width * 4, height * 4);
        triangle.translate(-foldedX, -foldedY);
        for (i = 0; i < 12; i++) {
            triangle.display(unfoldContext);

            // Adding a stroke ensures there is no blank space between sections
            unfoldContext.lineWidth = 2;
            unfoldContext.strokeStyle = '#ffffff';
            unfoldContext.stroke();  

            triangle.flip();
            unfoldContext.rotate(2 * Math.PI / 12);
        }
        triangle.translate(foldedX, foldedY);
    } 

    function markCut(x, y) {
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(x - 1, y - 1, 2, 2);
    }

    function resetDisplay() {
        ctx.fillStyle = '#061d2b'; 
        ctx.fillRect(0, 0, width, height);
        triangle.display(ctx);
        updateUnfold();
    }

    function triangleContains(x, y) {
        triangle.prepareStroke(ctx);
        return ctx.isPointInPath(x, y);
    }

    resetDisplay();

    canvas.addEventListener('mousedown', function(e) {
        var x = 0, y = 0;
        do {
            x += e.offsetX;
            y += e.offsetY;
        } while (e = e.offsetParent);
        console.log(triangle.showPoints());
    
        console.log(triangleContains(x, y));
        if (triangleContains(x, y)) {
            if (cut.isStarted()) {
                cut.add({ x: x, y: y });
                markCut(x, y);
            }
        } else {
            if (cut.canFinish()) {
                cut.add({ x: x, y: y });
                cutHistory.push(cut.getSnips());
                console.log(JSON.stringify(cutHistory));
                triangle.cut(cut.getSnips());
                cut = Flake.newCut();
                resetDisplay();
            } else { 
                cut = Flake.newCut();
                resetDisplay();
                cut.add({ x: x, y: y });
                markCut(x, y);
            }
        }

    });


    // For testing
    return;
    cuts = [[{"x":644,"y":47},{"x":474,"y":59},{"x":641,"y":142}],[{"x":639,"y":29},{"x":401,"y":-50},{"x":639,"y":-100}]];
    for (var i = 0; i < cuts.length; i++) {
        triangle.cut(cuts[i]);
        console.log('cut made');
        triangle.showPoints();
    }
    resetDisplay();
    // end testing
};

