/**Utility functions for Intent */
import { aStar } from "./astar.js";

/**
 * Compute priority of pickup intent based on:
 * - Distance
 * - Reward
 * - If its lost or not
 * @param {Object} parcel parcel of which to get priority score
 * @param {Object} bs belief set
 * @returns priority of picking up
 */
function priorityPickUp(parcel, bs) {
  // Calculate distance to parcel using A*
  const path = aStar(bs.me, parcel, bs.map);
  if(!path){ // If path is blocked
    return -Infinity; // Return lowest possible score (option will be discarded)
  }
  const distance = path.length;
  // Get how much reward is lost when parcel is reached
  const timeToMove = distance * bs.config.MOVEMENT_DURATION;
  const rewardLoss = timeToMove / bs.config.PARCEL_DECADING_INTERVAL;
  
  // Priority is remaining reward when parcel is reached
  let priority = parcel.reward - rewardLoss;

  // Check if other agents are nearby the parcel
  const nearbyAgentThreshold = distance; // # tiles of tollerance

  for (const agent of bs.getAgents()) {
    if (agent.id !== bs.me.id) { // Skip self

      const agentCoord = {x: Math.round(agent.x), y: Math.round(agent.y)}
      // Get agent distance to parcel without considering other agents
      const agentPath = aStar(agentCoord, parcel, bs.map, true);
      let agentDistance = Infinity; // If parcel not reachable for agent he is infinitely distant
      if(agentPath){
        agentDistance = agentPath.length;
      }

      // If agent is closer than a threshold we greatly reduce priority of the parcel
      if (agentDistance < nearbyAgentThreshold) {
        priority /= 2;
        // Stop at first agent near found
        break;
      }
    }
  }
  
  return priority;
}



/**
 * Function to return the delivery tile utility
 * @param {Object} delivery delivery tile
 * @param {Number} totalReward reward of currently carried parcels
 * @param {Object} bs belief set
 * @returns priority of delivery
 */
function priorityPutDown(delivery, totalReward, bs){
  const path = aStar(bs.me, delivery, bs.map, true);
  if(!path){ // Blocked path
    return -Infinity; // Return lowest possible priority
  }
  // Compute how much reward is lost when moving to delivery
  const distance = path.length;
  const timeToMove = distance * bs.config.MOVEMENT_DURATION;
  const rewardLoss = timeToMove / bs.config.PARCEL_DECADING_INTERVAL;
  // Remaining reward when delivery is reached multiplied by a scalar factor
  const priority = (totalReward - rewardLoss);

  return priority; 
}

/**
 * Generate possible intentions given belief set
 * @param {Object} bs beliefset
 */
function generateOptions(bs){
  // Data structure to hold options
  const options = [];

  // For now let's add options to pick up the sensed parcel excluding that carried by others
  // Some parcel sometimes is corrupted without x or y and we will ignore it
  const parcels = bs.getParcels().filter(p => (!p.carriedBy || 
    p.carriedBy === bs.me.id) && p.x != null && p.y != null);
  
  for(const p of parcels){
    if(!p.carriedBy){ // Parcel not carried by me
      const priority = priorityPickUp(p, bs);
      if(priority !== -Infinity){ // If option is different from -Infinity
        // Add a new option for the agent
        options.push({type: "pickUp", 
          target: {x: p.x, y: p.y, id: p.id}, 
          priority: priority});
        }
    }
  }
  
  // If I am carryig a parcel
  const carriedParcels = parcels.filter(p => p.carriedBy === bs.me.id);
  if(carriedParcels.length > 0){
    // Total reward of carried parcels
    const totalReward = carriedParcels.reduce((sum, p) => sum + p.reward, 0);
    
    // Generate an option for every delivery tile with different priority
    // Get only reachable delivery tiles for options
    const deliveryTiles = bs.map.filterReachableTileLists(bs.me).deliveryTiles;
    for(const delivery of deliveryTiles){
      const priority = priorityPutDown(delivery, totalReward, bs);
      if(priority !== -Infinity){ // Save intention only if priority is higher than -Infinity
        options.push({type:"deliver", 
          target: {x: delivery.x, y: delivery.y}, 
          priority: priority});
      }
    }
  }

  // Add an idle option with lowest possible priority
  options.push({type: "idle", priority: -Infinity});

  return options;
}

/**Given options return the best possible one with option filtering
 * @param {Array} options list of options generated
 * @returns best option object 
 */
function filterOptions(options){
  let bestOption;
  // Get best option according to priority
  bestOption = options.reduce((best, current) => 
    current.priority > best.priority ? current : best
  );

  return bestOption;
}



export {priorityPickUp, priorityPutDown, generateOptions, filterOptions};