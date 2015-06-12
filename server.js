/*

  Tanks

  by Stephen Lavelle and Felix Niklas at the CCCB in 2015

  Ideas:
      - Make the tank slower when you shoot (Denis)

*/
var tileSize = 8
var gutter = 4
var players = []
var map = "\
############################################\
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
############################################\
";

var mapWidth=44;
var mapHeight=map.length/mapWidth;
var tileWidth=8;
var bulletSpeed = 8;
var tankSpeed = 1.5;
var turnSpeed = 0.5;

var width = tileSize * mapWidth
var height = tileSize * mapHeight
var pixels = new Uint8Array(width * height)
 
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
 
function addPlayer(id, name, connection){
  var emptyPos = findEmptyPos();
  var player = {
    id:id,
    x:emptyPos[0]*tileWidth,
    y:emptyPos[1]*tileWidth,
    dir:randInt(0,16),
    score:0,
    input:{},
    name: name,
    connection: connection
  }
  console.log("adding " + player.name +" at "+ player.x+","+player.y+","+player.id);
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
    player.dir = (player.dir+16-turnSpeed)%16
  if(player.input.right)
    player.dir = (player.dir+turnSpeed)%16

  // move tank
  if(player.input.up || player.input.down){
    var direction = player.input.up ? 1 : -1
    var angle = player.dir/16 * 2 * Math.PI
    var newX = player.x + Math.sin(angle) * direction * tankSpeed
    var newY = player.y - Math.cos(angle) * direction * tankSpeed
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
  player.connection.send(JSON.stringify({
    type: 'shot'
  }))
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
  var newX = player.x + tileSize/2 + Math.sin(angle) * bulletSpeed
  var newY = player.y + tileSize/2 - Math.cos(angle) * bulletSpeed

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
      killPlayer(other)
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
  for(var dy = 0, i = 0; dy < tileSize; dy++){
    for(var dx = i % 2; dx < tileSize; dx+=2, i++){
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
  dir = Math.round(dir) % 16

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
  drawScoreboard()
}

var maxLength = 10
var maxRows = 20

function drawScoreboard(){
  var text = "";
  var playerCopy = state.players.slice()
  playerCopy.sort(function(a, b){
    return a.score < b.score
  })

  for(var i=0; i<Math.min(playerCopy.length, maxRows); i++){
    var name = playerCopy[i].name
    var score = playerCopy[i].score

    var textLength = maxLength - score.toString().length - 1
    var spaces = textLength - name.length + 1

    if(name.length > textLength)
      name = name.slice(0, textLength) + " "
    else
      name += (new Array(spaces+1).join(" "))

    text += name + score
  }

  if(playerCopy.length < maxRows){
    var missingRows = maxRows - playerCopy.length + 1
    text += (new Array(missingRows*maxLength).join(" "))
  }

  placeText(text, mapWidth + 1, 1, maxLength, maxRows-2)
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
  var player

  client.on('message', function incoming(message) {
    console.log('received: %s', message)

    message = JSON.parse(message)
    var value = message.value

    switch(message.type){
      case 'input-on':
        if(value === 'space')
          shootBullet(player)
        else
          player.input[value] = true
        break
      case 'input-off':
        player.input[value] = false
        break
      case 'name':
        player = addPlayer(uniqueID(), value, client)
        break
    }
  })

  client.on('close', function leaving(client) {
    console.log("user left")
    if(player)
      removePlayer(player.id)
  })
})



/*

  Server to Display

*/

var dgram = require('dgram');
var client = dgram.createSocket('udp4');
clearScreen()

function sendPixelsToDisplay(){
  var packedBytes = new Buffer(10 + pixels.length/8);

  packedBytes[0] = 0
  packedBytes[1] = 19
  packedBytes[2] = 0
  packedBytes[3] = 0
  packedBytes[4] = 0
  packedBytes[5] = 0
  packedBytes[6] = mapWidth / 256
  packedBytes[7] = mapWidth % 256
  packedBytes[8] = height / 256
  packedBytes[9] = height % 256

  for(var i = 0, n = 10, l = pixels.length; i < l; n++){
    var sum = 0;

    for(var j=128; j > 0; j = (j>>1)){
      sum += pixels[i++] ? j : 0;
    }
    packedBytes[n] = sum;
  }

  client.send(packedBytes, 0, packedBytes.length, 2342, '172.23.42.29');
}

function placeText(text, x, y, width, height){
  var packedBytes = new Buffer(10 + text.length);

  packedBytes[0] = 0
  packedBytes[1] = 3
  packedBytes[2] = x/256
  packedBytes[3] = x % 256
  packedBytes[4] = y/256
  packedBytes[5] = y % 256
  packedBytes[6] = width/256
  packedBytes[7] = width % 256
  packedBytes[8] = height/256
  packedBytes[9] = height % 256

  for(var i = 0, n = 10; i < text.length; n++){
    packedBytes[n] = text.charCodeAt(i++);
  }


  client.send(packedBytes, 0, packedBytes.length, 2342, '172.23.42.29');
}

function clearScreen(){
  var buffer = new Buffer(2)
  buffer[0] = 0
  buffer[1] = 2
  client.send(buffer, 0, 2, 2342, '172.23.42.29');
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

  setInterval(tick, 1000/25);
}