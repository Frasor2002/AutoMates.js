/*File to collect all sensing information*/
import { client } from "../connection/connection.js";
import { Belief } from "./belief.js";
import { logger } from "../logger.js";

// Initialize the data of the agent
const myBelief = new Belief();
//const logger = new Log();

// Collect configuration information
client.onConfig((config) => {
  myBelief.updateConfig(config)
  logger.logConfig(config)
});

// Collect my agent information
client.onYou((me,time) => {
  myBelief.updateMe(me)
  logger.logMe(me,time,"frame")
});


// Collect map information
client.onMap((nrow, ncol, tiles) => {
  myBelief.map.initMatrix(nrow, ncol, tiles);
  myBelief.map.initTileLists(tiles);
  logger.logMap(nrow,ncol,myBelief.map)
})


// Collect parcels sensed
client.onParcelsSensing((parcels) => {
  myBelief.updateParcels(parcels);
  logger.logParcelSensed(
    myBelief.parcelBelief,
    myBelief.me.x,myBelief.me.y,
    myBelief.map
  )
  //console.log("NEW PARCEL SENSING")
  /*for(let i in parcels){
    console.log(JSON.stringify(parcels[i]))
  }*/
})

// Collect agents sensed
client.onAgentsSensing((agents) => {
  myBelief.updateAgents(agents);
  logger.logAgentsSensed(
    myBelief.agentBelief,
    myBelief.me.x,myBelief.me.y,
    myBelief.map
  )
})

export { myBelief }