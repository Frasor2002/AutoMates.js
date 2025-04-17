import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import {initAgentBelief, 
        handleAgentSensing,
        handleParcelSensing,
        optionGeneration} from "./belief/belief_revision.js"
import { IntentionRevision } from "./intent/intention_revision.js";



/**
 * Agent loop function to run the agent
 * @param {String} host url of the host
 * @param {String} token token to access the game
 */
async function agentLoop (host, token) {
  const client = new DeliverooApi(host, token);
  
  // Initialization
  await initAgentBelief(client);
  //console.log(me, map, deliveryTiles);
  client.onAgentsSensing(handleAgentSensing);
  client.onParcelsSensing(handleParcelSensing);

  // Load intention revision class
  const intent_rev = new IntentionRevision(client);

  // Generate options on sensing events
  client.onAgentsSensing(() => {optionGeneration(intent_rev)});
  client.onParcelsSensing(() => {optionGeneration(intent_rev)});
  client.onYou(() => {optionGeneration(intent_rev)});
  

  // Start agent
  intent_rev.loop();
}
  

export {agentLoop};