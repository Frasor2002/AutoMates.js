import { aStar, fromPathToPositions } from "../intent/astar.js";

const templates = {
  // Handshake message templates
  HANDSHAKE_START_TEMPLATE: "HANDSHAKE start",
  HANDSHAKE_ACK_TEMPLATE: "HANDSHAKE acknowledge",
  // Inform message templates
  INFORM_STATE_TEMPLATE: "INFORM state",
  INFORM_INTENT_TEMPLATE: "INFORM intent",
  INFORM_INTENT_OK_TEMPLATE: "INFORM ok",
  INFORM_INTENT_CHANGE_TEMPLATE: "INFORM change",
  STOP_INTENTION_TEMPLATE: "STOP intention",
  // Alleway message templates
  ALLEWAY_ACTION_TEMPLATE: "ALLEYWAY act",
  ALLEWAY_RESPONSE_TEMPLATE: "ALLEWAY ok"
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
        // Equal priority -> evaluator change to handle idle cases
        result.change2 = true;
      }
      return result;
    }

  return result;
}



export {templates, createAgreedPath, compareBestOptions};