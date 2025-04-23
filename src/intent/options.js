import { priorityPickUp, closestDelivery } from "./utils.js";
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
  const parcels = myBelief.getParcels().filter(p => !p.carriedBy || p.carriedBy === myBelief.me.id);
  
  for(const p of parcels){
    if(!p.carriedBy){
      // Add a new option for the agent
      options.push({type: "pickUp", 
        target: {x: p.x, y: p.y, id: p.id}, priority: priorityPickUp(p)});
    }
  }

  // If I am carryig a parcel
  if(parcels.filter(p => p.carriedBy === myBelief.me.id).length > 0){
    // Let's generate a high priority delivery option
    const closeDelivery = closestDelivery(myBelief.me, myBelief.map.deliveryTiles);
    if(closeDelivery){
      options.push({type:"deliver", 
        target: {x: closeDelivery.x, y: closeDelivery.y}, priority: 6});
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