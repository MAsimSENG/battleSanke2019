const bodyParser = require('body-parser')
const express = require('express')
const logger = require('morgan')
const app = express()
const {
  fallbackHandler,
  notFoundHandler,
  genericErrorHandler,
  poweredByHandler
} = require('./handlers.js')
let openSet = [];
let closedSet = [];
let start;
let end;
let path = [];
let mainCount = 0;

function heuristic(a, b) {
  let d = Math.abs(a.i - b.i) + Math.abs(a.j - b.j);
  return d;
}

function removeFromArray(arr, el) {
  for (var i = arr.length - 1; i >= 0; i--) {
    if (arr[i] == el) {
      arr.splice(i, 1);
    }
  }
}



function initalize(rows, cols, grid) {
  // making a 2d array
  let i = 0;
  let j = 0;
  for (i = 0; i < cols; i++) {
    grid[i] = new Array(rows);
  }
  for (i = 0; i < cols; i++) {
    for (j = 0; j < rows; j++) {
      grid[i][j] = new spot(i, j);
    }
  }

  j = 0;
  i = 0;

  for (i = 0; i < cols; i++) {
    for (j = 0; j < rows; j++) {
      grid[i][j].addNeighbors(grid, cols, rows);
    }
  }
}

function spot(i, j) {

  this.i = i;
  this.j = j;
  this.f = 0;
  this.g = 0;
  this.h = 0;
  this.neighbors = [];
  this.previous = undefined;
  this.addNeighbors = function(grid, cols, rows) {
    var i = this.i;
    var j = this.j;
    if (i < cols - 1) {
      this.neighbors.push(grid[i + 1][j]);
    }
    if (i > 0) {
      this.neighbors.push(grid[i - 1][j]);
    }

    if (j < rows - 1) {
      this.neighbors.push(grid[i][j + 1]);
    }
    if (j > 0) {
      this.neighbors.push(grid[i][j - 1]);
    }

  }
}


// For deployment to Heroku, the port needs to be set using ENV, so
// we check for the port number in process.env
app.set('port', (process.env.PORT || 9001))

app.enable('verbose errors')

app.use(logger('dev'))
app.use(bodyParser.json())
app.use(poweredByHandler)

// --- SNAKE LOGIC GOES BELOW THIS LINE ---

// Handle POST request to '/start'
app.post('/start', (request, response) => {
  // NOTE: Do something here to start the game
  let rows = request.body.board.height;
  let cols = request.body.board.width;
  let grid = new Array(cols);

  initalize(rows, cols, grid);
  let s_x = request.body.you.body[0].x;

  let s_y = request.body.you.body[0].y;

  let f_x = request.body.board.food[0].x;

  let f_y = request.body.board.food[0].y;

  start = grid[s_x][s_y];

  end = grid[f_x][f_y];

  // Response data
  const data = {
    color: '#DFFF00',
    headType: 'silly',
    tailType: 'curled'
  }
  return response.json(data)
})

function distToFood(a, b) {
  let d = Math.sqrt(Math.abs(a.x - b.x) + Math.abs(a.y - b.y));
  return d;
}

function bestFood(head, foods) {

	let min_food_index = 0;
	let min_dist = 100;

	for(f in foods){
		let dist = distToFood(head,foods[f])
		if (dist < min_dist) {
			min_food_index = f
			min_dist = dist
		}
	}
	// console.log(foods[min_food_index]);
	return foods[min_food_index]


}
// Handle POST request to '/move'
app.post('/move', (request, response) => {
  // NOTE: Do something here to generate your move


  var food = bestFood(request.body.you.body[0], request.body.board.food)

  openSet.push(start);
  while (openSet.length > 0) {
    var lowestIndex = 0;
    for (i = 0; i < openSet.length; i++) {
      if (openSet[i].f < openSet[lowestIndex].f) {
        // recall that the next working node is chosen to be the one that has lowest cost
        lowestIndex = i;
      }
    }
    // our new working node
    var current = openSet[lowestIndex];
    // if this is the food node print path and end;
    if (current === end) {
      path = [];
      var temp = current;
      while (temp.previous) {
        path.push(temp);
        temp = temp.previous;
      }
    }
    //  a working node from the openset
    removeFromArray(openSet, current);
    // add working node to the working node list
    closedSet.push(current);
    // get the neighbors of the working node
    var neighbors = current.neighbors;
    for (i = 0; i < neighbors.length; i++) {
      let neighbor = neighbors[i];
      // if not previously a working node
      if (!closedSet.includes(neighbor)) {
        var tempG = current.g + 1;
        // if this was previously a neighbor of another working node
        if (openSet.includes(neighbor)) {
          if (tempG < neighbor.g) {
            neighbor.g = tempG;
          }
        } else {
          // if it has not been a neighbor to working node yet
          neighbor.g = tempG;
          openSet.push(neighbor);
        }
        neighbor.h = heuristic(neighbor, end);
        neighbor.f = neighbor.g + neighbor.h;
        neighbor.previous = current;
      }
    }
  }
  //  console.log("the end",end.i,end.j);

  let turn = [];

  for (var i = path.length-1; i>0; i--) {
    let x_dif = path[i].i - start.i ;
    let y_dif = path[i].j - start.j ;
    console.log(x_dif,y_dif);

    if (x_dif === -1 && y_dif === 0) {
      start.i +=1;
      turn.push("left")
    }

      else if (x_dif === 0 && y_dif === -1) {
      turn.push("up")
      start.y+=1;
    }
    else if (x_dif === 1 && y_dif === 0) {
      turn.push("right")
      start.i -=1;

    }
  else if (x_dif === 0 && y_dif === 1) {
      start.y +=1;
      turn.push("down")

    }

  }
  console.log(turn);
/*
  while(mainCout>0) {
    //console.log(path[i].i, path[i].j);
    console.log("food",end);
    let x_dif = start.i - path[path.length-1].i;
    let y_dif = start.j - path[path.length-1].j;
    console.log(start.i,path[path.length-1].i);
    console.log( x_dif,y_dif)
    if (x_dif === 1 && y_dif === 0) {
      start.i -=1;
      turn = "left";
    }
    if (x_dif === 0 && y_dif === 1) {
      turn = "up";
      start.y+=1;
    }
    if (x_dif === -1 && y_dif === 0) {
      turn = "right";
      start.i +=1;

    }
    if (x_dif === 0 && y_dif === -1) {
      start.y -=1;
      turn = "down";
    }

    console.log(turn);
    const data = {
      move: turn, // one of: ['up','down','left','right']
    }
    return response.json(data)
  }
  */
  /*
    let turn = " ";

    if (request.body.you.body[0].x > 13) {
      turn = "down";
    }
    if (request.body.you.body[0].x < 2) {
      turn = "up";
    }
    if (request.body.you.body[0].y > 13) {
      turn = "left";
    }
    if (request.body.you.body[0].y < 2) {
      turn = "right";
    }
  */

  const data = {
    move: "right", // one of: ['up','down','left','right']
  }

  return response.json(data)
})

app.post('/end', (request, response) => {
  // NOTE: Any cleanup when a game is complete.
  return response.json({})
})

app.post('/ping', (request, response) => {
  // Used for checking if this snake is still alive.
  return response.json({});
})

// --- SNAKE LOGIC GOES ABOVE THIS LINE ---

app.use('*', fallbackHandler)
app.use(notFoundHandler)
app.use(genericErrorHandler)

app.listen(app.get('port'), () => {
  console.log('Server listening on port %s', app.get('port'))
})
