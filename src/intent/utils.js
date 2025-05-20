/**Utility functions for Intent */
import { aStar } from "./astar.js";
import { myBelief } from "../belief/sensing.js";

/**
 * Compute priority of pickup intent based on:
 * - Distance
 * - Reward
 * - If its lost or not
 * @param {Object} parcel parcel of which to get priority score
 * @returns priority of picking up
 */
function priorityPickUp(parcel) {
  // Calculate distance to parcel using A*
  const path = aStar(myBelief.me, parcel, myBelief.map);
  if(!path){ // If path is blocked
    return -Infinity; // Return lowest possible score (option will be discarded)
  }
  const distance = path.length;
  // Get how much reward is lost when parcel is reached
  const timeToMove = distance * myBelief.config.MOVEMENT_DURATION;
  const rewardLoss = timeToMove / myBelief.config.PARCEL_DECADING_INTERVAL;
  
  // Priority is remaining reward when parcel is reached
  let priority = parcel.reward - rewardLoss;

  // Check if other agents are nearby the parcel
  const nearbyAgentThreshold = distance; // # tiles of tollerance

  for (const agent of myBelief.getAgents()) {
    if (agent.id !== myBelief.me.id) { // Skip self

      const agentCoord = {x: Math.round(agent.x), y: Math.round(agent.y)}
      // Get agent distance to parcel without considering other agents
      const agentPath = aStar(agentCoord, parcel, myBelief.map, true);
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
 * @returns priority of delivery
 */
function priorityPutDown(delivery, totalReward){
  const path = aStar(myBelief.me, delivery, myBelief.map, true);
  if(!path){ // Blocked path
    return -Infinity; // Return lowest possible priority
  }
  // Compute how much reward is lost when moving to delivery
  const distance = path.length;
  const timeToMove = distance * myBelief.config.MOVEMENT_DURATION;
  const rewardLoss = timeToMove / myBelief.config.PARCEL_DECADING_INTERVAL;
  // Remaining reward when delivery is reached multiplied by a scalar factor
  const priority = (totalReward - rewardLoss);

  return priority; 
}

/**Given options return the best possible one with option filtering
 * @param {Array} options list of options generated
 * @returns best option object 
 */
function getBestOption(options){
  let bestOption;
  // Get best option according to priority
  bestOption = options.reduce((best, current) => 
    current.priority > best.priority ? current : best
  );

  return bestOption;
}


/**
 * Quicksort implementation for sorting objects by priority (descending order)
 * @param {Array} arr - Array of objects with a priority field
 */
function quickSort(arr) {
  // Base case: arrays with 0 or 1 element are already "sorted"
  if (arr.length <= 1) {
    return arr;
  }

  // Choose a pivot (we'll use the middle element)
  const pivotIndex = Math.floor(arr.length / 2);
  const pivot = arr[pivotIndex].predicate.priority;

  // Partition the array into three parts
  const left = [];
  const right = [];
  const equal = [];

  for (const element of arr) {
    const current_priority = element.predicate.priority
    if(current_priority == -Infinity){
      right.push(element);
    }
    else if (current_priority > pivot) {
      left.push(element);
    } else if (current_priority < pivot) {
      right.push(element);
    } else {
      equal.push(element);
    }
  }

  // Recursively sort the left and right partitions
  // Combine results (higher priorities first)
  return [...quickSort(left), ...equal, ...quickSort(right)];
}





export {priorityPickUp, priorityPutDown, getBestOption, quickSort};