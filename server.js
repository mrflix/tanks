var width = 448
var height = 240
var tileSize = 8
var gutter = 4
var pixels = new Uint8Array(width * height)
var players = []
var map = "\
############################################\
#...................##.....................#\
#...................##.....................#\
#...................##.....................#\
#.....####......................####.......#\
#..........................................#\
#............###...........###.............#\
#............#...............#.............#\
#...##.......#...............#......##.....#\
#....#..............................#......#\
#....#..##......................##..#......#\
#....#..##......................##..#......#\
#....#..............................#......#\
#...##.......#...............#......##.....#\
#............#...............#.............#\
#............###...........###.............#\
#..........................................#\
#.....####......................####.......#\
#...................##.....................#\
#...................##.....................#\
#...................##.....................#\
############################################\
";

var mapWidth=44;
var mapHeight=map.length/mapWidth;
var tileWidth=8;
 
var state = {
  players:[],
  bullets:[]
};
 
function randomElem(ar){
  return ar[Math.floor(Math.random()*ar.length)];
}
 
function randInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}
 
//in tile coordinates
function squareContents(x,y){
  var result=[];
  if (map[x+mapWidth*y]==='#'){
    result.push("#");
  }
  for (var i=0;i<state.players.length;i++){
    var p=state.players[i];
    var x0=Math.floor(p.x/tileWidth);
    var x1=Math.ceil(p.x/tileWidth);
    var y0=Math.floor(p.y/tileWidth);
    var y1=Math.ceil(p.y/tileWidth);
    if ((x0===x&&y0===y)||(x1===x&&y0===y)||(x1===x&&y1===y)||(x0===x&&y1===y)){
      result.push(p);
    } 
  }
  return result;
}
 
function findEmptyPos(){
  var candidatePositions=[];
  for (var i=0;i<mapWidth;i++){
    for (var j=0;j<mapHeight;j++){
      var contents = squareContents(i,j);
      if (contents.length==0){
        candidatePositions.push([i,j]);
      }
    }
  }
  return randomElem(candidatePositions);
}
 
function addPlayer(id){
  var emptyPos = findEmptyPos();
  var player = {
    id:id,
    x:emptyPos[0]*tileWidth,
    y:emptyPos[1]*tileWidth,
    dir:randInt(0,16),
    score:0,
    input:{}
  }
  console.log("adding " + player.x+","+player.y+","+player.id);
  state.players.push(player);
  return player;
}


function canMove(player,x,y){
  x = Math.round(x)
  y = Math.round(y)
  var x0=Math.floor(x/tileWidth)
  var x1=Math.ceil(x/tileWidth)
  var y0=Math.floor(y/tileWidth)
  var y1=Math.ceil(y/tileWidth)
  var points=[[x0,y0],[x0,y1],[x1,y0],[x1,y1]]
  //check against tilemap
  for(var i=0;i<points.length;i++){
    var px=points[i][0];
    var py=points[i][1];
    if (map[px+mapWidth*py]==='#'){
      return false;
    }
  }

  //check against other players
  var p1x=x
  var p1y=y
  for(var i=0;i<state.players.length;i++){ 
    var other = state.players[i];
    if (other===player) continue

    var p2x=other.x
    var p2y=other.y

    var dx=p2x-p1x
    var dy=p2y-p1y

    dx=Math.abs(dx)
    dy=Math.abs(dy)
    if(dx<tileWidth&&dy<tileWidth){
      return false
    }
  }

  return true
}
function movePlayer(player){
  // move turret
  if(player.input.left)
    player.dir = (player.dir+15)%16
  if(player.input.right)
    player.dir = (player.dir+1)%16

  // move tank
  if(player.input.up || player.input.down){
    var speed = player.input.up ? 1 : -1
    var angle = player.dir/16 * 2 * Math.PI
    var newX = player.x + Math.sin(angle) * speed
    var newY = player.y - Math.cos(angle) * speed
    if (canMove(player,newX,newY)){
      player.x=newX
      player.y=newY
    } else if (canMove(player,newX,player.y)){
      player.x=newX
    } else if (canMove(player,player.x,newY)){
      player.y=newY
    } 
  }
}

function playerScore(player){
  player.score++
}

function killPlayer(player){
  var emptyPos = findEmptyPos()
  player.x = emptyPos[0] * tileWidth
  player.y = emptyPos[1] * tileWidth;
}

function removePlayer(id){
  state.players.splice(findPlayerIndex(id), 1)
}

function findPlayerIndex(id){
  for(var i=0; i < state.players.length; i++){
    if(state.players[i].id == id)
      return i
  }
}

function shootBullet(player){
  var angle = player.dir/16 * 2 * Math.PI
  var newX = player.x + tileSize/2 + Math.sin(angle) * 4
  var newY = player.y + tileSize/2 - Math.cos(angle) * 4

  state.bullets.push({
    x: newX,
    y: newY,
    dir: player.dir,
    owner: player
  })
}

function moveBullet(bullet){
  var angle = bullet.dir/16 * 2 * Math.PI
  bullet.x += Math.sin(angle) * 3
  bullet.y -= Math.cos(angle) * 3

  if(bulletHits(bullet)){
    return true
  }

  return false
}

function bulletHits(bullet){
  var x = Math.round(bullet.x)
  var y = Math.round(bullet.y)
  var x0 = Math.floor(x/tileWidth)
  var y0 = Math.floor(y/tileWidth)
  if (map[x0+mapWidth*y0]==='#'){
    return true;
  }

  // check against players
  for(var i=0;i<state.players.length;i++){ 
    var other = state.players[i];
    if (other===bullet.owner) continue

    var dx = x - other.x
    var dy = y - other.y

    if(dx >= 0 && dx < tileWidth &&
       dy >= 0 && dy < tileWidth){
      killPlayer(player)
      playerScore(bullet.owner)
      return true
    }
  }

  return false
}
 
function printToConsole(){
  var display="";
  for (var j=0;j<mapHeight;j++){          
    for (var i=0;i<mapWidth;i++){
      var ch = map[i+mapWidth*j];
      var contents = squareContents(i,j);
      if (contents.length===0){
        ch='.';
      } else if (contents[0]==="#"){
        ch='#';
      } else {
        if (contents[0]==="#"){
          console.log(contents[1]);
          ch=contents[1].id;          
        } else {
          console.log(contents[0]);
          ch=contents[0].id;
        }
      }
      display+=ch;
    }
    display+="\n";
  }
  console.log(display);
}

function clearCanvas() {
  pixels = new Uint8Array(width * height)
}

function drawWall(tile_x, tile_y) {
  for(var dy = 0; dy < tileSize; dy++){
    for(var dx = 0; dx < tileSize; dx+=2){
      // y
      var i = (tile_y*tileSize + dy) * width

      // x
      i += tile_x * tileSize + dx

      // draw
      pixels[i] = 1
    }
  }
}

function drawPlayer(pixel_x, pixel_y, dir) {
  pixel_x = Math.round(pixel_x)
  pixel_y = Math.round(pixel_y)

  for(var dy = 0; dy < tileSize; dy++){
    for(var dx = 0; dx < tileSize; dx++){
      // y
      var i = (pixel_y + dy) * width

      // x
      i += pixel_x + dx

      // draw
      pixels[i] = tankSpriteAt(dx, dy, dir) | pixels[i]
    }
  }
}

function drawBullet(pixel_x, pixel_y) {
  pixels[Math.round(pixel_y) * width + Math.round(pixel_x)] = 1
}

function tankSpriteAt(dx, dy, dir) {
  // 0 1 2 3 4 5
  // up ...... right
  var x = (dir % 4) * (tileSize+1)
  var y = Math.floor(dir / 4) * (tileSize+1)

  return tankSprite[(y+dy) * tankSpriteWidth +x+dx]
}

function drawToCanvas(){
  clearCanvas();
  for (var i=0;i<mapWidth;i++){
    for (var j=0;j<mapHeight;j++){
      if (map[i+mapWidth*j]==='#'){
        drawWall(i,j);
      }
    }
  }
  for (var i=0;i<state.players.length;i++){
    var p = state.players[i];
    drawPlayer(p.x,p.y,p.dir);
  }
  for (var i=0;i<state.bullets.length;i++){
    var b = state.bullets[i];
    drawBullet(b.x,b.y);
  }
  sendPixelsToDisplay()
}

/*

  read assets

*/

var fs = require('fs')
var PNG = require('pngjs').PNG
var tankSprite = []

fs.createReadStream('images/tank.png')
  .pipe(new PNG({
      filterType: 4
  }))
  .on('parsed', function() {
    for (var y = 0, i=0; y < this.height; y++) {
      for (var x = 0; x < this.width; x++, i++) {
        var idx = (this.width * y + x) << 2
        tankSprite[i] = this.data[idx+2] > 128 ? 1 : 0
      }
    }
    tankSpriteWidth = this.width

    console.log("tank loaded")

    // when websocket connection is ready
    if(display.readyState == 1)
      startGame()
});


/*

  Server for clients

*/

var WebSocketServer = require('ws').Server
var server = new WebSocketServer({ port: 8001 })
var _uid = 0

function uniqueID(){
  return _uid++
}

server.on('connection', function connection(client) {
  console.log("user connected")
  var player = addPlayer(uniqueID())

  client.on('message', function incoming(message) {
    console.log('received: %s', message)

    var key = message.split(" ")[0]
    var onOff = message.split(" ")[1]

    if(key === 'space' && onOff === 'on'){
      shootBullet(player)
    } else {
      player.input[key] = onOff === 'on'
    }
  })

  client.on('close', function leaving(client) {
    console.log("user left")
    removePlayer(player.id)
  })
})



/*

  Server to Display

*/

var WebSocket = require('ws')
var display = new WebSocket('ws://172.23.42.29:7681/apd')

display.on('open', function open() {
  // server.send('Connected to display')

  // if sprite got loaded
  if(tankSprite.length)
    startGame()
})

function sendPixelsToDisplay(){
  var packedBytes = new Uint8Array(pixels.length/8);

  for(var i = 0, n = 0, l = pixels.length; i < l; n++){
    var sum = 0;

    // if(i > 0 && i % (width*8) == 0)
    //   n += gutter * width/8

    for(var j=128; j > 0; j = (j>>1)){
      sum += pixels[i++] ? j : 0;
    }
    packedBytes[n] = sum;
  }

  display.send(packedBytes)
}


function tick(){
  for(var i=0; i<state.players.length; i++){
    movePlayer(state.players[i])
  }
  for(var i=0; i<state.bullets.length; i++){
    if(moveBullet(state.bullets[i])){
      state.bullets.splice(i, 1)
      i--
    }
  }

  drawToCanvas()
}

function startGame(){
  drawToCanvas();

  setInterval(tick,200);
}