import { client } from "../connection/connection.js";
import { generateOptions, filterOptions } from "../intent/utils.js";
import { aStar, fromPathToPositions } from "../intent/astar.js";
import { getIdleTarget } from "../plan/utils.js";

const templates = {
  // Handshake message templates
  HANDSHAKE_START_TEMPLATE: "HANDSHAKE start",
  HANDSHAKE_ACK_TEMPLATE: "HANDSHAKE acknowledge",
  // Inform message templates
  INFORM_STATE_TEMPLATE: "INFORM state",
  INFORM_INTENT_TEMPLATE: "INFORM intent",
  INFORM_INTENT_OK_TEMPLATE: "INFORM ok",
  INFORM_INTENT_CHANGE_TEMPLATE: "INFORM change"
};


/**Given a path from the other agent we want to create one that does not collide 
 * @param {Object} myStart my starting position
 * @param {Object} otherStart other agent starting position
 * @param {array} path path of the other agent
 * @param {Object} target target of my next intention
 * @param {Object} bs beliefset containing map
*/
function createAgreedPath(myStart, otherStart, path, target, bs){
  // Get coordinates to set to occupied using the other agent path
  const positions = fromPathToPositions(otherStart, path);
  //console.log(path, positions)
  // Set the path position of the other agent as occupied
  bs.setAgentsPositions();
  for(const p of positions){
    bs.map.updateMap(p, -2); // Use -2 to identify occupied tiles
  }

  // Compute a path that avoids going on the other path
  const agreedPath = aStar(myStart, target, bs.map);
  if(!agreedPath){
    return [];
  }
  return agreedPath;
}


/**
 * Handle option generation and intentions in multi agent case
 * @param {Object} bs belief set
 * @param {Object} fi friend info
 */
async function multiOptionHandling(agent, bs, fi){
  // Reach an agreement if our best option is ok or to change
  // Let's assign a temporary role based on score or if equal the name of the agent
  let role = "Proposer";
  if(fi.score == bs.me.score){ // If same score choose on id
    // We assume always different ids to avoid conflicts
    if(bs.me.id > fi.id){
      role = "Evaluator";
    }
  }else if(bs.me.score < fi.score){
    role = "Evaluator";
  }


  // First we generate our options from the belief set
  agent.options = generateOptions(bs); // This are only options of solo case we may have different in multi
  //console.log(agent.options);

  // Since an agreement between paths must be reached, decide before the target of our idle
  for(let o of agent.options){
    if(o.type == "idle"){
      o.target = getIdleTarget(bs);
    }
  }


  // Option filtering
  agent.bestOption = filterOptions(agent.options);
  //console.log(role)

  // Now the proposer asks if the best intention found is ok
  // The evaluator will replying saying if proposer needs to change intention or not
  if(role == "Proposer"){
    const myBestOption = {msg: templates.INFORM_INTENT_TEMPLATE, intent: agent.bestOption};
    const reply = await client.emitAsk(fi.id, myBestOption);
    
    // Depending on reply we decide to change intent or not
    //console.log(reply)
    if(reply.msg == templates.INFORM_INTENT_CHANGE_TEMPLATE){
      //console.log("I will change my intent")
      // We will take the second best intent
      agent.options.splice(agent.options.indexOf(agent.bestOption), 1);
      agent.bestOption = filterOptions(agent.options);
    }

    // We have to create a path in agreement with the one that we are given
    if(!reply.path){
      reply.path = [];
    }
    const agreedPath = createAgreedPath(bs.me, reply.start, reply.path, 
      agent.bestOption.target, bs);
    
    agent.bestOption.path = agreedPath;
    // Push best option
    //console.log("Proposer best:", agent.bestOption.path)
    //console.log(agent.bestOption)
    agent.intentionRevision.push(agent.bestOption);
  }
}

/**Given two best options from the agents we need to compare them to check if something must be changed.
 * @param {Object} bo1 best option of agent 1
 * @param {Object} bo2 best option of agent 2
 */
function compareBestOptions(bo1, bo2){
  const result = {change1: false, change2: false};

  if(bo1.target.y == bo2.target.x && bo1.target.y == bo2.target.y){
      // Decide who must change intention
      if (bo1.priority > bo2.priority) {
        result.change2 = true;
      } else if (bo2.priority > bo1.priority) {
        result.change1 = true;
      } else {
        // Equal priority -> random choice
        const random = Math.random() > 0.5;
        result.change1 = random;
        result.change2 = !random;
      }
      return result;
    }

  return result;
}


/**
 * In alleway map we try to deliver parcel with a different strategy
 */
function solveAlleyway(agent, bs, fi){
  // Compute the handover tile in the alleyway
  let handoverTile = {x: 0, y: 0};

  const allTiles = bs.map.filterReachableTileLists(bs.me, true);
  console.log(allTiles)
  // Assume alleway can be only vertical or horizontal
  // Case of vertical alleyway
  if(allTiles.spawnTiles.x == allTiles.deliveryTiles.x){
    handoverTile.x = allTiles.spawnTiles[0].x;
    handoverTile.y = Math.round(Math.abs(allTiles.spawnTiles[0].y - allTiles.deliveryTiles[0].y) / 2);
  } else if(allTiles.spawnTiles.y == allTiles.deliveryTiles.y){ // Horizontal
    handoverTile.y = allTiles.spawnTiles[0].y;
    handoverTile.x = Math.round(Math.abs(allTiles.spawnTiles[0].x - allTiles.deliveryTiles[0].x) / 2);
  }

  console.log(handoverTile)
  // Understand what is our role
  // Gatherer or Deliverer?
  const tiles = bs.map.filterReachableTileLists(bs.me);
  if(tiles.spawnTiles.length === 0){
    // Deliverer
    console.log("deliver")
  }else{
    // Gatherer
    console.log("gatherer")
  }
}


export {templates, multiOptionHandling, compareBestOptions, solveAlleyway};