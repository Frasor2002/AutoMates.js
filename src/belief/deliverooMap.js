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
   * @param {Object} pos 
   */
  isWalkable(pos) {
    // First check if position is within bounds
    if(!this.isInBounds(pos)){
      return false;
    }
    return this.map[pos.x][pos.y] > 0; // If > 0 we exclude both walls and agents
  }

    /**
   * Init map and original map
   * @param {Number} nrow 
   * @param {Number} ncol 
   * @param {Array} cells 
   * @returns 
   */
  initMatrix(nrow, ncol, cells) {
    this.width = nrow;
    this.height = ncol;
    const matrix = new Array(); 
    matrix.length = this.width;
      for (let i = 0; i < this.height; i++) {
        matrix[i] = new Array(ncol);
      }
      cells.forEach(tile => {
        const { x, y, type } = tile;
        // Initialize the map matrix
        matrix[x][y] = type;});
      this.map = matrix;
      this.originalMap = JSON.parse(JSON.stringify(matrix)); //Deep copy
  }


  /** Initialize the tile lists
   * @param {Array} tiles sensed tiles
   */
  initTileLists(tiles) {
    this.deliveryTiles = tiles.filter(t => t.type == 2).map(t => ({ x: t.x, y: t.y }));
    this.spawnTiles = tiles.filter(t => t.type == 1).map(t => ({ x: t.x, y: t.y, score: this.getSpawnScore(t)}));
  }

  /**Get spawn tile by how many spawnable tiles are nearby
   * @param {Object} tile
   */ 
  getSpawnScore(tile){
    let score = 0;
    // Check all tiles within POD distance (Manhattan distance)
    for (let dx = -this.POD; dx <= this.POD; dx++) {
      for (let dy = -this.POD; dy <= this.POD; dy++) {        
        // Calculate Manhattan distance
        const distance = Math.abs(dx) + Math.abs(dy);
        // Only count if within POD
        if (distance <= this.POD) {
          const x = tile.x + dx;
          const y = tile.y + dy;
            
          // Check bounds and if it's a spawn tile in original map
          if (this.isInBounds({x, y}) && this.originalMap[x][y] === 1) {
            score++;
          }
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