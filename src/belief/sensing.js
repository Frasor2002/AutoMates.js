/*File to collect all sensing information*/
import { client } from "../connection/connection.js";
import { Belief } from "./belief.js";
import { envArgs } from "../connection/env.js";
import { logger } from "../logger.js";

// Initialize the data of the agent
const myBelief = new Belief();


// Collect configuration information
client.onConfig((config) => {
  myBelief.updateConfig(config);

  // If logger is active we log the configuration used
  if(envArgs.logger){
    logger.logConfig(config);
  }
});

// Collect my agent information
client.onYou((me,time) => {
  myBelief.updateMe(me, time);
  myBelief.map.updateSpawnLastSeen(time,me.x,me.y);

  // Log my agent information therough the game if logger is active
  if(envArgs.logger){
    logger.logMe(me,time,"frame")
  }
  
});


// Collect map information
client.onMap((nrow, ncol, tiles) => {
  myBelief.map.initMatrix(nrow, ncol, tiles);
  myBelief.map.initSpawnType(tiles);
  myBelief.map.initTileLists(tiles);
  myBelief.map.initDeliveryMap();

  // Log map information, through the game if logger is active
  if(envArgs.logger){
    logger.logMap(nrow,ncol,myBelief.map, {frame: 0}, "frame")
  }
})


// Collect parcels sensed
client.onParcelsSensing((parcels) => {
  myBelief.updateParcels(parcels);

  // Log parcel sensed if logger is active
  if(envArgs.logger){
    logger.logParcelSensed(
    myBelief.parcelBelief,
    myBelief.me.x,myBelief.me.y,
    myBelief.map,
    myBelief.time,
    "frame"
    );
  }
})

// Collect agents sensed
client.onAgentsSensing((agents) => {
  myBelief.updateAgents(agents);

  // Log sensed agents if logger is active
  if(envArgs.logger){
    logger.logAgentsSensed(
    myBelief.agentBelief,
    myBelief.me.x,myBelief.me.y,
    myBelief.map,
    myBelief.time,
    "frame"
    )
  }
  
})

export { myBelief }