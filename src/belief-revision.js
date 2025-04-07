/*File containing all code regarding belief of the agent*/

// Declare constants used to store the belief of the agent on the game state
/** @type {Map<string,[{id,x,y,carriedBy,reward}]} Map agentId to array of agents states*/
const agentBelief = new Map();

/** @type {Map<string,[{id,x,y,carriedBy,reward}]} Map parcelId to array of parcel states*/
const parcelBelief = new Map();

// Agents Observation Distance
let AOD;
// Parcels Observation Distance
let POD;
// Reference to this agent
let me;

/**
 * Compute Manhattan distance between positions
 * @param {Object} p1 - First position
 * @param {Object} p2 - Second position
 * @returns {number} Manhattan distance 
 */
function manhDistance(p1, p2){ Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y); }


/**
 * Initialize agent beliefs
 * @param {Object} client API client object
 */
function initAgentBelief(client) {
  client.onConfig(config =>{
    AOD = config.AGENTS_OBSERVATION_DISTANCE;
    POD = config.PARCELS_OBSERVATION_DISTANCE;
  });
  client.onYou(m => me = m);
}


/**
 * Process agent sensing data and update beliefs
 * @param {Array} agents - Array of sensed agents
 */
function handleAgentSensing(agents) {
  const visibleAgentIds = new Set();
    
  for (const a of agents) {
    // Skip intermediate movement values
    if (a.x % 1 != 0 || a.y % 1 != 0) continue;
    
    visibleAgentIds.add(a.id);
    
    if (!agentBelief.has(a.id)) {
      // New agent encountered
      agentBelief.set(a.id, [a]);
    } else {
      updateTrackedEntity(agentBelief, a, 'agent');
    }
  }
   // Check for agents that are no longer visible
   checkLostEntities(agentBelief, visibleAgentIds, 'agent');
}


/**
 * Process parcel sensing data and update beliefs
 * @param {Array} parcels - Array of sensed parcels
 */
function handleParcelSensing(parcels) {
  const visibleParcelIds = new Set();
  
  for (const p of parcels) {
    // Skip parcels being carried (they move with agents)
    if (p.carriedBy) continue;
    
    visibleParcelIds.add(p.id);
    
    if (!parcelBelief.has(p.id)) {
        // New parcel encountered
        parcelBelief.set(p.id, [p]);
    } else {
        updateTrackedEntity(parcelBelief, p);
    }
  }

  // Check for parcels that are no longer visible
  checkLostEntities(parcelBelief, visibleParcelIds, 'parcel');
}

/**
* Update information about a generic tracked entity
* @param {Map} beliefset - The beliefset to update
* @param {Object} entity - The entity data
*/
function updateTrackedEntity(beliefset, entity) {
  const history = beliefset.get(entity.id);
  const last = history[history.length - 1];
  const secondLast = history.length > 1 ? history[history.length - 2] : null;

  if (last === 'lost' || (last.x !== entity.x || last.y !== entity.y)) {
      // Entity reappeared after being lost
      history.push(entity);
  }
  // Else: entity is in same position, no update needed
}


/**
* Check for entities that are no longer visible
* @param {Map} beliefset - The beliefset to check
* @param {Set} visibleIds - Set of currently visible entity IDs
* @param {string} type - Type of entity ('agent' or 'parcel')
*/
function checkLostEntities(beliefset, visibleIds, type) {

  for (const [id, history] of beliefset.entries()) {
    if (!visibleIds.has(id)) {
      const last = history[history.length - 1];
      
      if (last !== 'lost') {
        // Entity just disappeared
        history.push('lost');
        
        // For parcels, check if we should forget them
        if (type === 'parcel' && history.length > 1) {
          const lastKnown = history[history.length - 2];
          if (manhDistance(me, lastKnown) > POD) {
            beliefset.delete(id);
          }
        }
      }
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
  return Array.from(parcelBelief.values())
    .map(history => history[history.length - 1])
    .filter(state => state !== 'lost');
}


export {
  initAgentBelief,
  handleAgentSensing,
  handleParcelSensing,
  getCurrentAgents,
  getCurrentParcels
};