import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import { initAgentBelief, 
        handleAgentSensing,
        handleParcelSensing,
        getCurrentAgents,
        getCurrentParcels} from "./belief-revision.js"

/**
 * Agent loop function to run the agent
 * @param {String} host url of the host
 * @param {String} token token to access the game
 */
async function agentLoop (host, token) {
  const client = new DeliverooApi(host, token);
  
  // Initialization
  initAgentBelief(client);
  client.onAgentsSensing(handleAgentSensing);
  client.onParcelsSensing(handleParcelSensing);

  // Movement logic
  var previous = 'right';

  // Start infinite movement
  while ( true ) {
    // To move slower
    await new Promise(res=>setTimeout(res,1000));

    // Get beliefset of parcels and agents
    const parcel = getCurrentParcels();
    const agents = getCurrentAgents();
    console.log('Agent remembers parcels: ', parcel)
    console.log('Agent remembers agents: ',agents)

    // Try to pickup/putdown parcel on current tile
    await client.emitPutdown();
    await client.emitPickup();

    // Keep track of tried directions
    let tried = [];

    // Untile we haven't tried all directions try them all
    while ( tried.length < 4 ) {
      // Create variable for next backward move 
      let current = { up: 'down', right: 'left', down: 'up', left: 'right' }[previous];

      // Before going back try other directions
      if ( tried.length < 3 ) {
        current = [ 'up', 'right', 'down', 'left' ].filter( d => d != current )[ Math.floor(Math.random()*3) ];
      }

      // If we haven't moved in that direction move there
      if ( ! tried.includes(current) ) {
        if ( await client.emitMove( current ) ) {
          console.log( 'Agent has moved ', current );
          previous = current;
          break; // Move successfull, start over
        }
        tried.push( current );
      }
    }
    // If we moved in every direction we are stuck and we can only retry
    if ( tried.length == 4 ) {
      console.log( 'Agent is now stuck!' );
      await new Promise(res=>setTimeout(res,1000));
    }
  }
}


export {agentLoop};