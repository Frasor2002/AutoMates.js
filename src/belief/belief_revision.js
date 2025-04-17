/*File containing all code regarding belief of the agent*/
import { manhDistance } from "./astar.js";


// Declare constants used to store the belief of the agent on the game state
/** a matrix that will contain the map of the game*/
const map = new Array();
/** a list of delivery tiles */
const deliveryTiles = [];


/** @type {Map<string,[{id,x,y,carriedBy,reward}]} Map agentId to array of agents states*/
const agentBelief = new Map();

/** @type {Map<string,[{id,x,y,carriedBy,reward}]} Map parcelId to array of parcel states*/
const parcelBelief = new Map();

// Parcels Observation Distance
let POD = 0;
// Reference to this agent
const me = {};


/**
 * Initialize agent beliefs
 * @param {Object} client API client object
 */
async function initAgentBelief(client) {
  const configPromise = new Promise(resolve => {
    client.onConfig(config => {
      POD = config.PARCELS_OBSERVATION_DISTANCE;
      resolve();
    });
  });

  const mapPromise = new Promise(resolve => {
    client.onMap((nrow, ncol, cells) => {
      map.length = nrow;
      for (let i = 0; i < map.length; i++) {
        map[i] = new Array(ncol);
      }
      cells.forEach(tile => {
        const { x, y, type } = tile;
        // Initialize the map matrix
        map[x][y] = type;

        // Save delivery tiles separately
        if (type == 2) {
          deliveryTiles.push({ x: x, y: y });
        }
      });
      resolve();
    });
  });

  const mePromise = new Promise(resolve => {
    client.onYou(({ id, name, teamId, teamName, x, y, score , penalty}) => {
      me.id = id;
      me.name = name;
      me.teamId;
      me.teamName;
      me.x = x;
      me.y = y;
      me.score = score;
      me.penalty = penalty;
      resolve();
    });
  });

  // Wait until everything is initialized
  await Promise.all([configPromise, mapPromise, mePromise]);
}


/**
 * Process agent sensing data and update beliefs
 * @param {Array} agents - Array of sensed agents
 */
function handleAgentSensing(agents) {
  const visibleAgentIds = new Set();
    
  for (const a of agents) {
    // Skip intermediate movement values
    //if (a.x % 1 != 0 || a.y % 1 != 0) continue;
    
    visibleAgentIds.add(a.id);
    
    if (!agentBelief.has(a.id)) {
      // New agent encountered
      agentBelief.set(a.id, [a]);
    } else {
      const history = agentBelief.get(a.id);
      const last = history[history.length - 1];

      if (last === 'lost' || (last.x !== a.x || last.y !== a.y)) {
        // Entity reappeared after being lost or moved
        history.push(a);
      }
    }
  }

  // Check lost agents
  for (const [id, history] of agentBelief.entries()) {
    // If we don't see something in memory
    if (!visibleAgentIds.has(id)) {
      const last = history[history.length - 1];
      
      if (last !== 'lost') {
        // Entity just disappeared
        history.push('lost');
      }
    }
  }
}


/**
 * Process parcel sensing data and update beliefs
 * @param {Array} parcels - Array of sensed parcels
 */
function handleParcelSensing(parcels) {
  for (const p of parcels) {
    parcelBelief.set( p.id, p);
  }
  for ( const p of parcelBelief.values() ) {
      if ( parcels.map( p => p.id ).find( id => id == p.id ) == undefined ) {
          parcelBelief.delete( p.id );
      }
  }
  
}



/**
* Get the current state of all tracked agents
* @returns {Array} Array of current agent states
*/
function getCurrentAgents() {
  return Array.from(agentBelief.values())
    .map(history => history[history.length - 1])
    .filter(state => state !== 'lost');
}

/**
* Get the current state of all tracked parcels
* @returns {Array} Array of current parcel states
*/
function getCurrentParcels() {
  return Array.from(parcelBelief.values());
}

/**
 * Given an the beliefstate of parcel weight them based on:
 * - Distance
 * - Reward
 * - If its lost or not
 * @param {*} parcel 
 */
function scoreParcel(parcel) {
  // Calculate distance to parcel
  const distance = manhDistance(me, parcel);
    
  // If parcel is being carried by someone else, return lowest possible score
  if (parcel.carriedBy) return -Infinity;
  
  // Base score is the reward value
  let score = parcel.reward;
  
  // Apply distance penalty (the farther away, the lower the score)
  score /= (distance + 1) ** 2;  // +1 to avoid division by zero
  
  return score;
}



/**
 * Function to return the closest delivery tile
 * @param {*} me 
 * @param {*} deliveryTiles 
 * @returns 
 */
function chooseDelivery(me, deliveryTiles){
  let closest = null;
  let minDist = Infinity;
  for(const tile of deliveryTiles){
    const distance = manhDistance(me, tile);
    if(distance < minDist){
      closest=tile;
      minDist=distance;
    }
  }
  return closest;
}

/**
 * Function that when receiving new sensing generates a new option
 * for the agent to fulfill
 * @param {*} intent_rev pass the intent revision object to push options
 */
function optionGeneration(intent_rev){

  /*Option generation*/
  // Data structure to hold options
  const options = [];
  //For now let's add options to pick up the sensed parce excluding that carried by others
  const parcels = getCurrentParcels().filter(p => !p.carriedBy || p.carriedBy === me.id);
  for(const p of parcels){
    if(!p.carriedBy){
      // Add a new option for the agent
      options.push({type: "pickUp", target: {x: p.x, y: p.y, id: p.id}, priority: scoreParcel(p)});
    }
  }

  // If I am carryig a parcel
  if(parcels.filter(p => p.carriedBy === me.id).length > 0){
    // Let's generate a high priority delivery option
    const closestDelivery = chooseDelivery(me, deliveryTiles);
    options.push({type:"deliver", target: {x: closestDelivery.x, y: closestDelivery.y}, priority: Infinity});
  }

  // If I do not have any parcel in my beliefSet we add an idle option
  options.push({type: "idle", priority: -Infinity});



  /*Option filtering*/
  let best_option;
  if(options.length > 0){
    best_option = options.reduce((best, current) => 
      current.priority > best.priority ? current : best
    );
  }
  

  // If we have a best option pass It to the intent revision
  if(best_option){
    intent_rev.push(best_option);
  }

}


export {
  map,
  me,
  initAgentBelief,
  handleAgentSensing,
  handleParcelSensing,
  getCurrentAgents,
  getCurrentParcels,
  optionGeneration
};