//Implementation of the AStar search algorithm


/**
 * Compute Manhattan distance between positions
 * @param {Object} p1 - First position
 * @param {Object} p2 - Second position
 * @returns {number} Manhattan distance 
 */
function manhDistance(p1, p2){ return Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y); }


/**
 * Function to create a path when goal is reached
 * @param {Object} cameFrom 
 * @param {String} currentKey 
 * @param {String} startKey 
 * @returns recunstructed path
 */
function reconstructPath(cameFrom, currentKey, startKey) {
  const path = [];
  let current = currentKey;

  while (current !== startKey) {
      const node = cameFrom.get(current);
      if (!node) return []; // if we hit a missing node, return empty
      path.unshift(node.action);
      current = node.key;
  }

  return path;
}



/**
 * Function to compute A* Search and return the path
 * @param {Object} start starting position (agent position)
 * @param {Object} goal goal position
 * @param {DeliverooMap} deliverooMap belief of the map
 * @param {Boolean} original bool to decide if we use map without agents or with agents
 * @returns false if path blocked or an array of moves to do
 */
function aStar(start, goal, deliverooMap, original=false){
  // If already at goal return an empty path
  if(start.x === goal.x && start.y === goal.y){
    return [];
  }

  // If goal not reachable return false
  if(!deliverooMap.isWalkable(goal, original)){
    return false;
  }

  // Define function to get heuristic
  const heuristic = manhDistance;

  // Declare directions the agent can potentially move to
  const directions = [
    { dx: 0, dy: -1, action: "down" },
    { dx: 0, dy: 1, action: "up" },
    { dx: -1, dy: 0, action: "left" },
    { dx: 1, dy: 0, action: "right" }
  ];

  // Initiliaze necessary Set
  const openSet = new Set();
  const startKey = `${start.x},${start.y}`;
  openSet.add(startKey);

  // A mapping that gives the previos node on the shortest path from start
  const cameFrom = new Map();

  // A mapping that gives the actual minimal cost to reach that node from the start
  const gScore = new Map();
  gScore.set(startKey, 0);

  // Given a node the sum of gScore and heuristic
  const fScore = new Map();
  fScore.set(startKey, gScore.get(startKey));

  // While set of nodes to expand not empty
  while (openSet.size > 0) {
    // Choose node in set with lowest score
    let currentKey = null;
    let lowestFScore = Infinity;
    for (const key of openSet) {
      const score = fScore.get(key);
      if (score < lowestFScore) {
        lowestFScore = score;
        currentKey = key;
      }
    }

    // Get current node position
    const [currentX, currentY] = currentKey.split(',').map(Number);
    const currentPos = { x: currentX, y: currentY };

    // When goal is reached reconstruct the path
    if (currentPos.x === goal.x && currentPos.y === goal.y) {
      return reconstructPath(cameFrom, currentKey, startKey);
    }

    // Remove current node from set
    openSet.delete(currentKey);

    // Expand the node checking neighbors
    for (const dir of directions) {
      const neighborX = currentX + dir.dx;
      const neighborY = currentY + dir.dy;
      const neighborKey = `${neighborX},${neighborY}`;


      // Skip if not walkable
      if (!deliverooMap.isWalkable({x:neighborX, y:neighborY}, original)) {
        continue;
      }

      // Compute gScore for neighbor
      const tentativeGScore = gScore.get(currentKey) + 1;

      // If path is better than last neighbor we expand
      if (tentativeGScore < (gScore.get(neighborKey) || Infinity)) {
        cameFrom.set(neighborKey, { key: currentKey, action: dir.action });
        gScore.set(neighborKey, tentativeGScore);
        fScore.set(neighborKey, tentativeGScore + heuristic({ x: neighborX, y: neighborY }, goal));

        if (!openSet.has(neighborKey)) {
          openSet.add(neighborKey);
        }
      }
    }
  }

  // If we explored everything but did not reach the goal return false
  return false;
}


/**Convert from path with directions to positions
 * @param {Object} start start position
 * @param {Array} path path array
 */
function fromPathToPositions(start, path){
  const positions = [];
  let current = start;

  for(const move of path){
    // First get next position
    let nextPos = {x:current.x, y:current.y};
    switch(move){
      case "left":{
        nextPos.x--;
        break;
      }
      case "right":{
        nextPos.x++;
        break;
      }
      case "up":{
        nextPos.y++;
        break;
      }
      case "down":{
        nextPos.y--;
        break;
      }
    };
    positions.push(nextPos);
    current = nextPos;
  }
  return positions;
}


export {aStar, fromPathToPositions};