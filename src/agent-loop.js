import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import { me,
        initAgentBelief, 
        handleAgentSensing,
        handleParcelSensing,
        getCurrentParcels,
        chooseParcel} from "./belief-revision.js"


/**
 * Function to make a random move
 * @param {*} client 
 * @param {*} me 
 */
async function randomMove(client, me) {
  const directions = ['up', 'down', 'left', 'right'];
  const randomDirection = directions[Math.floor(Math.random() * directions.length)];
  
  var m = new Promise(res => client.onYou(m => m.x % 1 != 0 || m.y % 1 != 0 ? null : res()));
  await client.emitMove(randomDirection);
  await m;
}



/**
 * Function to blindly move toward a target
 * @param {*} client 
 * @param {*} me 
 * @param {*} x 
 * @param {*} y 
 */
async function blindMovement(client, me, x, y){
  while ( me.x != x || me.y != y ) {
      var m = new Promise( res => client.onYou( m => m.x % 1 != 0 || m.y % 1 != 0 ? null : res() ) );
      
      if ( me.x < x )
          await client.emitMove('right');
      else if ( me.x > x )
          await client.emitMove('left');
      
      if ( me.y < y )
          await client.emitMove('up');
      else if ( me.y > y )
          await client.emitMove('down');

      await m;
  }
}



/**
 * Agent loop function to run the agent
 * @param {String} host url of the host
 * @param {String} token token to access the game
 */
async function agentLoop (host, token) {
  const client = new DeliverooApi(host, token);
  
  // Initialization
  await initAgentBelief(client);
  client.onAgentsSensing(handleAgentSensing);
  client.onParcelsSensing(handleParcelSensing);

  while(true){
    await new Promise(res=>setTimeout(res,500));

    // Get beliefset of parcels and agents
    const parcel = getCurrentParcels();
    console.log('Agent remembers parcels:', parcel);

    
    if(parcel.length > 0){ // If parcel is found
      let p = chooseParcel(parcel);
      console.log("I need to reach parcel", p.x, p.y)
      // Choose parcel
      await blindMovement(client, me, p.x, p.y);
      await client.emitPickup();
      console.log("Picked up parcel", p.id);
    } else {
      console.log("No parcel sensed so we move at random")
      await randomMove(client, me)
    }
  }
}
  

export {agentLoop};