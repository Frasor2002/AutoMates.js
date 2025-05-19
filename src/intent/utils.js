/**Utility functions for Intent */
import { aStar } from "./astar.js";
import { myBelief } from "../belief/sensing.js";


/**
 * Compute priority of pickup intent based on:
 * - Distance
 * - Reward
 * - If its lost or not
 * @param {Object} parcel 
 */
function priorityPickUp(parcel) {
  // Sometimes the agent sees parcel that are out of bounds, in that case we filter them out
  if(parcel.x === undefined || parcel.y === undefined){
    //console.log(parcel)
    return -Infinity
  }

  // Calculate distance to parcel using A*
  const distance = aStar(myBelief.me, parcel, myBelief.map).length;
    
  // If parcel not reachable
  if(distance == 0) return -Infinity;
  
  // Base score is the reward value
  let priority = parcel.reward;
  
  // Apply distance penalty (the farther away, the lower the score)
  // * 10 is to have numbers > 0
  priority /= (distance) * 10;

  // Check if other agents are nearby the parcel
  const nearbyAgentThreshold = distance; // # tiles of tollerance

  for (const agent of myBelief.getAgents()) {
    if (agent.id !== myBelief.me.id) { // Skip self

      const agentCoord = {x: Math.round(agent.x), y: Math.round(agent.y)}
      const agentDistance = aStar(agentCoord, parcel, myBelief.map).length;

      if (agentDistance < nearbyAgentThreshold) {
        priority *= 0.9;
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
 */
function priorityPutDown(delivery, totalReward){
  const distance = aStar(myBelief.me, delivery, myBelief.map).length;
  if (distance === 0) return -Infinity; // No path or already on delivery tile

  return totalReward * 10 / (distance*10); // Same formula of priorityPickUp with a higher reward
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





export {priorityPickUp, priorityPutDown, quickSort};