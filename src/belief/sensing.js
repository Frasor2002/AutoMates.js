/*File to collect all sensing information*/
import { client } from "../connection/connection.js";
import { Belief } from "./belief.js";

// Initialize the data of the agent
const myBelief = new Belief();

// Collect configuration information
client.onConfig((config) => {myBelief.updateConfig(config)});

// Collect my agent information
client.onYou((me) => {myBelief.updateMe(me)});


// Collect map information
client.onMap((nrow, ncol, tiles) => {
  myBelief.map.initMatrix(nrow, ncol, tiles);
  myBelief.map.initTileLists(tiles);
})


// Collect parcels sensed
client.onParcelsSensing((parcels) => {
  myBelief.updateParcels(parcels);
})

// Collect agents sensed
client.onAgentsSensing((agents) => {
  myBelief.updateAgents(agents);
})

export { myBelief }