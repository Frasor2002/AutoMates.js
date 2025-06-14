import { generateOptions, filterOptions } from "./utils.js";
import { myBelief } from "../belief/sensing.js";
import { agent } from "../agent.js"
import { envArgs } from "../connection/env.js";
import { logger } from "../logger.js";
import { friendInfo } from "../collaboration/comunication.js";
import { sendState } from "../collaboration/message.js";


/**
 * Function that at regular intervals creates new intentions given beliefs
*/
async function optionHandling(){
  // If in multiagent mode we send our belief to other agent
  if(envArgs.mode == "multi"){
    // Every time agent information is updated we send state
    // Prepare a light object to send to other agent
    const myState = {me: myBelief.me, time: myBelief.time, 
      parcelBelief: myBelief.parcelBelief, agentBelief: myBelief.agentBelief};
    await sendState(friendInfo, myState);
    // Reaction to message in communication.js
  } else {
    // Solo agent
    // Option generation
    agent.options = generateOptions(myBelief);

    // If logger is active, log decisions of the agent
    if(envArgs.logger){
      logger.logDecisions(agent.options,"GENERATED OPTIONS", myBelief.time, "frame")
    }

    // Option filtering
    agent.bestOption = filterOptions(agent.options);
    

    // If we have a best option push It to intent revision
    agent.intentionRevision.push(agent.bestOption);
  }

  
}

export {optionHandling};