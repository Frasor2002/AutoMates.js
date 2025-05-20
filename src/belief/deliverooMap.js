import { Beliefset } from "@unitn-asa/pddl-client";


/** Class containing all information regarding the state of the map */
class DeliverooMap {
  // Properties

  //Size of the map
  width;
  height;

  /** Matrix that will contain the state of map of the game.
   * The values in the cells will be:
   * -1 -> Occupied by an agent
   * 0 -> Non-Walkable
   * 1 -> Spawn tile
   * 2 -> Delivery tile
   * 3 -> Walkable tile
  */
  map = [];

  /* Reference to map without agents*/
  originalMap = [];

  /** List of delivery tiles locations*/
  deliveryTiles = [];

  /** List of location of tiles where parcels spawns*/
  spawnTiles = [];

  /** Type of map, if a map with lots of green tiles or one with few*/
  spawnType = "";

  /**Map beliefset used for pddl */
  mapBeliefSet = new Beliefset();

  /**Observation distance saved in this class */
  POD = 0;

  /**
   * Initialize this class
   */
  constructor() {
    this.width = 0;
    this.height = 0;
    this.map = [];
    this.originalMap = [];
    this.deliveryTiles = [];
    this.spawnTiles = [];
    this.spawnType = "";
    this.mapBeliefSet = new Beliefset();
    this.POD = 0;
  }

  /**Check a position is within map bounds 
   * @param {Object} pos 
  */
  isInBounds(pos) {
    return pos.x >= 0 && pos.x < this.width && 
           pos.y >= 0 && pos.y < this.height;
  }

  /** Check if a position has an obstacle
   * The check can be done on map without agents or the updated one
   * @param {Object} pos position to be checked
   * @param {Bool} original true if we are checking map without agents
   */
  isWalkable(pos, original=false) {
    let map = this.map;
    if(original){
      map = this.originalMap;
    }

    // First check if position is within bounds
    if(!this.isInBounds(pos)){
      return false;
    }
    return map[pos.x][pos.y] > 0; // If > 0 we exclude both walls and agents
  }

    /**
   * Init map and original map
   * @param {Number} nrow number of rows
   * @param {Number} ncol number of columns
   * @param {Array} tiles cells of the map
   */
  initMatrix(nrow, ncol, tiles) {
    // Map initialization
    this.width = nrow;
    this.height = ncol;
    const matrix = new Array(); 
    matrix.length = this.width;
    for (let i = 0; i < this.height; i++) {
      matrix[i] = new Array(ncol);
    }
    tiles.forEach(tile => {
      const { x, y, type } = tile;
      // Initialize the map matrix
      matrix[x][y] = type;});
    this.map = matrix;
    this.originalMap = JSON.parse(JSON.stringify(matrix)); //Deep copy
  }

  /** Classify type of map either a map with lots of spawns or few of them
   * @param {Object} tiles Sensed tiles
   */
  initSpawnType(tiles){
    // The amount of spawn tiles can make us classify the map as high or low spawning
    const n_spawn = tiles.filter(t => t.type == 1);
    const n_obstacles = tiles.filter(t => t.type == 0);
    const total_tiles = this.width * this.height;

    // To classify the map compute the percentage of spawn tiles
    const percSpawn = n_spawn / (total_tiles - n_obstacles) * 100;
    if(percSpawn > 40){
      this.spawnType = "high";
    } else {
      this.spawnType = "low";
    }
  }


  /** Initialize the tile lists
   * @param {Array} tiles Sensed tiles
   */
  initTileLists(tiles) {
    // Delivery tiles are easily initialized
    this.deliveryTiles = tiles.filter(t => t.type == 2).map(t => ({ x: t.x, y: t.y }));

    // Spawn tiles also need a score to let us know where is best to go during idle
    this.spawnTiles = tiles.filter(t => t.type == 1).map(t => ({ x: t.x, y: t.y, 
      score: this.getSpawnScore(t)}));
  }

  /**Get spawn tile by how many spawnable tiles are nearby
   * @param {Object} tile spawn tile of the map
   */ 
  getSpawnScore(tile){
    let score = 0;
    const highSpawningMap = this.spawnType === "high";

    // To compute the score we will use a small BFS search starting from the spawn tile
    const visited = new Set();
    const queue = [{x: tile.x, y: tile.y, distance: 0}];
    // Search other spawn surrounding spawn tile
    while (queue.length > 0) {
      // Get current tile
      const current = queue.shift();
      const key = `${current.x},${current.y}`;
      
      // Skip if already visited or out of bounds
      if (visited.has(key) || !this.isInBounds(current)) {
        continue; // Skipping
      }
      visited.add(key); // Set current tile to visited
      
      if(current.distance > this.POD){ // If we are outside POD we exit
        break;
      }

      // Check if the current tile is a spawn one
      if (this.originalMap[current.x][current.y] === 1) {
        score++; // Bring up score

        if(highSpawningMap){
          // If the map has many spawn tiles, bring up the score of tiles in a radius with
          // delivery ones
          const deliveryRadius = Math.floor(this.POD / 2);
          // Iterate in the radius to find delivery tiles
          for(const dx = -deliveryRadius; dx <= deliveryRadius; dx++){
            for(const dy = -deliveryRadius; dy <= deliveryRadius; dy++){
              // Compute new current position
              const nx = current.x + dx;
              const ny = current.y + dy;
              // If new position is in bounds and a delivery tile
              if (this.isInBounds({x: nx, y: ny}) && this.originalMap[nx][ny] === 2) {
                // Compute distance to this tile
                const distToDelivery = Math.abs(dx) + Math.abs(dy);
                // Add the contribution of the delivery to the score
                score += (deliveryRadius - distToDelivery + 1) * 3;
              }
            }
          }
        }
      }

      // Add neighbors to queue
      const neighbors = [
        {x: current.x + 1, y: current.y},
        {x: current.x - 1, y: current.y},
        {x: current.x, y: current.y + 1},
        {x: current.x, y: current.y - 1}
      ];
          
      // Iterate over neighbours to perform BFS
      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.x},${neighbor.y}`;
        if (!visited.has(neighborKey)) {
          queue.push({
            x: neighbor.x,
            y: neighbor.y,
            distance: current.distance + 1
          });
        }
      }

    }
    
    return score;
}

  
  /**
   * Reset the map state with original map reference
  */
  clearMap() {
    for (let i = 0; i < this.width; i++) {
      for (let j = 0; j < this.height; j++) {
        if (this.map[i][j] == -1) { // If we had an agent here, reset
          this.map[i][j] = this.originalMap[i][j];
        }
      }
    }
  }

  /**
   * Set position of enemy agent on the map given a position
   * @param {Object} pos 
   */
  updateMap(pos) {
    //Check if position is valid (in bounds)
    if(this.isInBounds(pos)){
      this.map[pos.x][pos.y] = -1;
    }
  }
  

  /**
   * Get tilelists with only reachable tiles in original map (agent excluded)
   * We run a bfs and save all reachable tiles from current position
   * @param {Object} me agent position
   * @param {boolean} original choose to use original map or one with agents
   * @returns {Object} reachable spawn and delivery tiles
   */
  filterReachableTileLists(me, original=false){
    let map = this.map;
    if(original){
      map = this.originalMap;
    }
    // Storage for reachable tiles
    const spawnsReachable = new Set();
    const deliveryReachable = new Set();

    // BFS logic

    const visited = new Set();
    const queue = new Array();
    queue.push({x: me.x, y: me.y});
    visited.add(`${me.x},${me.y}`);

    // Define direction for finding neighbors
    const directions = [
        {x: 1, y: 0},
        {x: -1, y: 0},
        {x: 0, y: 1},
        {x: 0, y: -1}
    ];

    while(queue.length > 0){
      // Get current tile
      const current = queue.shift();

      // Check if on a spawn tile
      if (map[current.x][current.y] === 1) {
        // Search for tile in the tilelists
        const spawnTile = this.spawnTiles.find(t => t.x === current.x && t.y === current.y);
        if (spawnTile) {
          spawnsReachable.add(spawnTile);
        }
      }
      // Check if on delivery tile
      else if (map[current.x][current.y] === 2) {
        // Search for tile in tilelists
        const deliveryTile = this.deliveryTiles.find(t => t.x === current.x && t.y === current.y);
        if (deliveryTile) {
          deliveryReachable.add(deliveryTile);
        }
      }

      // Explore after current only if actually walkable
      if(this.isWalkable(current, original)){
        // Go to neighbors
        for (const dir of directions) {
          // Get neighbor
          const neighbor = {
            x: current.x + dir.x,
            y: current.y + dir.y
          };
          const neighborKey = `${neighbor.x},${neighbor.y}`;

          // Skip if already visited, or not walkable
          if (visited.has(neighborKey) || !this.isWalkable(neighbor, original)) {
            continue;
          }
          
          // Set neighbor visisted and push in queue
          visited.add(neighborKey);
          queue.push(neighbor);
        }
      }
    }

    return {
      spawnTiles: Array.from(spawnsReachable),
      deliveryTiles: Array.from(deliveryReachable)
    };

  }

  /**Update map beliefset with obstacles and agent positions*/
  updatePDDL() {
    // Reset BeliefSet
    this.mapBeliefSet = new Beliefset();

    for (let i = 0; i < this.width; i++) {
      for (let j = 0; j < this.height; j++) {
        // If not walkable go on
        if(!this.isWalkable({x:i, y:j})){
          continue;
        }

        // Tile to the right
        if ((i + 1) < this.width && this.map[i + 1][j] > 0) {
          this.mapBeliefSet.declare('right t_' + i + '_' + j + ' t_' + (i + 1) + '_' + j);
        }

        // Tile to the left
        if ((i - 1) >= 0 && this.map[i - 1][j] > 0) {
          this.mapBeliefSet.declare('left t_' + i + '_' + j + ' t_' + (i - 1) + '_' + j);
        }

        // Tile up
        if ((j + 1) < this.height && this.map[i][j + 1] > 0) {
          this.mapBeliefSet.declare('up t_' + i + '_' + j + ' t_' + i + '_' + (j + 1));
        }

        // Tile down
        if ((j - 1) >= 0 && this.map[i][j - 1] > 0) {
          this.mapBeliefSet.declare('down t_' + i + '_' + j + ' t_' + i + '_' + (j - 1));
        }
      }
    }
  }


}


export {DeliverooMap};