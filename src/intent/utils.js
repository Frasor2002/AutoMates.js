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
  // Calculate distance to parcel using A*
  const distance = aStar(myBelief.me, parcel, myBelief.map).length;
    
  // If parcel is being carried by someone else, return lowest possible score
  // Or if not reachable
  if (parcel.carriedBy || distance == 0) return -Infinity;
  
  // Base score is the reward value
  let priority = parcel.reward;
  
  // Apply distance penalty (the farther away, the lower the score)
  // + 1 is to avoid division by zero and * 10 is to have numbers > 0
  priority /= (distance + 1) * 10;

  // Check if other agents are nearby the parcel
  const nearbyAgentThreshold = distance; // # tiles of tollerance
  for (const agent of myBelief.getAgents()) {
    if (agent.id !== myBelief.me.id) { // skip self
      const agentCoord = {x: Math.round(agent.x), y: Math.round(agent.y)}
      const agentDistance = aStar(agentCoord, parcel, myBelief.map).length;
      if (agentDistance < nearbyAgentThreshold) {
        priority *= 0.5;
        // Stop at first agent near found
        break;
      }
    }
  }
  
  return priority;
}



/**
 * Function to return the closest delivery tile
 * @param {Object} me 
 */
function closestDelivery(){
  let closest = null;
  let minDist = Infinity;

  for(const tile of myBelief.map.deliveryTiles){
    const distance = aStar(myBelief.me, tile, myBelief.map).length;
    if(distance != 0 && distance < minDist){
      closest = tile;
      minDist = distance;
    }
  }
  return closest;
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
  const pivot = arr[pivotIndex].priority;

  // Partition the array into three parts
  const left = [];
  const right = [];
  const equal = [];

  for (const element of arr) {
    if (element.priority > pivot) {
      left.push(element);
    } else if (element.priority < pivot) {
      right.push(element);
    } else {
      equal.push(element);
    }
  }

  // Recursively sort the left and right partitions
  // Combine results (higher priorities first)
  return [...quickSort(left), ...equal, ...quickSort(right)];
}





export {priorityPickUp, closestDelivery, quickSort};