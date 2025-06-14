import fs from "fs";

/**
 * Function to read a file for PDDL
 * @param {*} path 
 * @returns data in file
 */
function readFile ( path ) {
  return new Promise( (res, rej) => {
    fs.readFile( path, 'utf8', (err, data) => {
      if (err) rej(err)
      else res(data)
    })
  })

}

/**Function to generate an Idle target */
function getIdleTarget(bs){
  // Get reachable spawn tiles (reachable not considering agents)
    const spawnTiles = bs.map.filterReachableTileLists(bs.me).spawnTiles;
    //console.log(spawnTiles.length)

    // If no reachable spawn tiles, we move in any direction we can
    if (spawnTiles.length === 0) {
      let possiblePos = {
        up: {x: bs.me.x, y: bs.me.y + 1},
        down: {x: bs.me.x, y: bs.me.y - 1},
        left: {x: bs.me.x - 1, y: bs.me.y},
        right: {x: bs.me.x + 1, y: bs.me.y}
      };
      possiblePos = new Map(Object.entries(possiblePos));
      for(const p of Array.from(possiblePos.values())){
        if(bs.map.isWalkable(p)){
          return p;
        }
      }
      // Else stay put
      return {x: bs.me.x, y: bs.me.y};
    }

    bs.map.updateBonus();

    // Sort by score descending and take top n
    const bestSpawns = spawnTiles
    .filter(spawn => {
      if (spawn.x === bs.me.x && spawn.y === bs.me.y) return false // Not my position
      return true
    })
    .sort((a, b) => b.score + b.bonusScore - a.score - a.bonusScore)
    .slice(0, 10);

    //console.log(bestSpawns);
    // Case where we have less bestSpawns, we just use the spawnTiles
    const candidates = bestSpawns.length > 0 ? bestSpawns : spawnTiles;

    // Random selection of one of the candidates
    const randomIndex = Math.floor(Math.random() * candidates.length);
    const target = candidates[randomIndex];
    return target;
}


export {readFile, getIdleTarget};