import { priorityPickUp, priorityPutDown } from "./utils.js";
import { myBelief } from "../belief/sensing.js";
import { agent } from "../agent.js"

/**
 * Function that when receiving new sensing generates a new option
 * for the agent to fulfill
 */
function optionGeneration(){

  /*Option generation*/

  // Data structure to hold options
  const options = [];

  //For now let's add options to pick up the sensed parce excluding that carried by others
  // Also some parcel sometimes is without x or y and we will ignore it
  const parcels = myBelief.getParcels().filter(p => (!p.carriedBy || 
    p.carriedBy === myBelief.me.id) && p.x != null && p.y != null);
  
  for(const p of parcels){
    if(!p.carriedBy){ // Parcel not carried by me
      // Add a new option for the agent
      options.push({type: "pickUp", 
        target: {x: p.x, y: p.y, id: p.id}, 
        priority: priorityPickUp(p)});
    }
  }

  // If I am carryig a parcel
  const carriedParcels = parcels.filter(p => p.carriedBy === myBelief.me.id); 
  if(carriedParcels.length > 0){
    // Total reward of carried parcels
    const totalReward = carriedParcels.reduce((sum, p) => sum + p.reward, 0);
    
    // Generate an option for every delivery tile with different priority
    for(const delivery of myBelief.map.deliveryTiles){
      options.push({type:"deliver", 
        target: {x: delivery.x, y: delivery.y}, 
        priority: priorityPutDown(delivery, totalReward)});
    }
  }

  // If I do not have any parcel in my beliefSet we add an idle option
  options.push({type: "idle", priority: -Infinity});


  /*Option filtering*/
  let bestOption;
  if(options.length > 0){
    bestOption = options.reduce((best, current) => 
      current.priority > best.priority ? current : best
    );
  }
  

  // If we have a best option pass It to the intent revision
  if(bestOption){
    agent.intentionRevision.push(bestOption);
  }

}

export {optionGeneration};