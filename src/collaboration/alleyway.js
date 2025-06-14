import { getIdleTarget } from "../plan/utils.js";
import { aStar } from "../intent/astar.js";

/**Check if the agents are in the alleyway sitation 
 * @param {Object} me my position
 * @param {Object} friend friend position
 * @param {Object} bs belief set  
*/
function checkAlleyway(me, friend, bs){
  // Take all tiles on map
  const allTiles = bs.map.filterReachableTileLists(me, true);
  
  // Take all my reachable tiles
  const myTiles = bs.map.filterReachableTileLists(me);

  // Take all my friend reachable tiles
  const friendTiles = bs.map.filterReachableTileLists(friend);

  // Check that there is only one spawn and delivery or we are in another map and just blocked
  // by an agent
  if(allTiles.spawnTiles.length > 1 || allTiles.deliveryTiles.length > 1){
    return false;
  }


  // If we both have access to the same type of tile we are not in an alleyway
  if(myTiles.spawnTiles.length == friendTiles.spawnTiles.lenght || 
    myTiles.deliveryTiles.length == friendTiles.deliveryTiles.lenght
  ){
    return false;
  }

  return true
}



/**
 * In alleway map we try to deliver parcel with a different strategy
 * @param {Object} agent agent class
 * @param {Object} bs belief set
 */
function solveAlleyway(agent, bs, friend){
   const allTiles = bs.map.filterReachableTileLists(bs.me, true);
  // Understand what is our role
  // Collector or Deliverer?
  const tiles = bs.map.filterReachableTileLists(bs.me);

  // Clear bestOption
  agent.bestOption = null;
  if(tiles.deliveryTiles.length === 0){
    // Collector
    // If a new parcel spawns
    const parcels = bs.getParcels().filter(p => (!p.carriedBy) && p.x != null && p.y != null); // && p.x == allTiles.spawnTiles.x && p.x == allTiles.spawnTiles.y

    if(parcels.length > 0){
      // Create an option to plan to solve the alleyway
      agent.bestOption = {type: "planAlleyway", role: "collector",
        friendPos: friend,
        parcelPos: parcels[0],
        target: allTiles.deliveryTiles[0],
        priority: 1};
    } else { // Move to spawning
      let target = getIdleTarget(bs)
      agent.bestOption = {type: "idle",
        path: aStar(bs.me, target, bs.map),
        target: target,
      priority: -Infinity};
    }
    //console.log(agent.bestOption)

    if(agent.bestOption != null){
      agent.intentionRevision.push(agent.bestOption);
    }
  }
}

/**
 * Deliverer acts as the collector has planned out
 * @param {Object} agent agent object of the deliverer
 * @param {Object} msg msg containing action
 * @param {Object} reply object to reply to deliverer
 */
function delivererActs(agent, msg, reply){
  // Deliverer receives an order
  agent.bestOption = {type: "planAlleyway", role: "deliverer",
    move:msg.move,
    reply: reply,
    priority: 1};
  

  agent.intentionRevision.push(agent.bestOption);
}



export {checkAlleyway, solveAlleyway, delivererActs};