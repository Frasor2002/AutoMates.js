import { agent } from '../agent.js';
import { DeliverooMap } from './deliverooMap.js'
import { stringToMillisec } from './utils.js';


/**This class contains all belief data of the agent */
class Belief {
  // Information collected by the agent
  // Data of the configuration of the game
  config = {};

  // Reference to the current agent
  me = {};

  // Time inside the game
  time = {};

  // Belief regarding the game map
  map = new DeliverooMap();

  // Map agentId -> agents states
  agentBelief = new Map();

  // Map parcelId -> parcel states
  parcelBelief = new Map();

  /**Init the Belief class */
  constructor() {
    this.config = {};
    this.me = {};
    this.map = new DeliverooMap();
    this.agentBelief = new Map();
    this.parcelBelief = new Map();
  }


  /**
   * Method to update the configuration property
   * @param {Object} config 
   */
  updateConfig(config) {
    this.config.PARCELS_GENERATION_INTERVAL = stringToMillisec(config.PARCELS_GENERATION_INTERVAL);
    this.config.PARCELS_MAX = config.PARCELS_MAX;
    this.config.PARCEL_REWARD_AVG = config.PARCEL_REWARD_AVG;
    this.config.PARCEL_REWARD_VARIANCE = config.PARCEL_REWARD_VARIANCE;
    this.config.PARCEL_DECADING_INTERVAL = stringToMillisec(config.PARCEL_DECADING_INTERVAL);
    this.config.PENALTY = config.PENALTY;
    this.config.MOVEMENT_STEPS = config.MOVEMENT_STEPS;
    this.config.MOVEMENT_DURATION = config.MOVEMENT_DURATION;
    this.config.AGENTS_OBSERVATION_DISTANCE = config.AGENTS_OBSERVATION_DISTANCE;
    this.config.PARCELS_OBSERVATION_DISTANCE = config.PARCELS_OBSERVATION_DISTANCE;
    this.config.AGENT_TIMEOUT = config.AGENT_TIMEOUT;

    // Transfer POD to map for scoring
    this.map.POD = this.config.PARCELS_OBSERVATION_DISTANCE;
  }

  /**Function to update the reference to current agent
   * @param {Object} me 
   */
  updateMe(me, time){
    this.me.id = me.id;
    this.me.name = me.name;
    this.me.teamId = me.teamId;
    this.me.teamName = me.teamName;
    this.me.x = Math.round(me.x);
    this.me.y = Math.round(me.y);
    this.me.score = me.score;
    this.me.penalty = me.penalty;

    this.time = time;
  }

  /**
   * Update the parcel mapping
   * @param {Array} sensed_parcels 
   */
  updateParcels(sensed_parcels){
    //Take the current time
    const currTime = this.time.ms;
    //Create a structure to store the new parcels
    const updatedParcel = new Map();

    // Iterate over all sensed parcels
    for(const p of sensed_parcels){
      p.timestamp = currTime;
      updatedParcel.set(p.id, p);
      // Add parcels with timestamp
    }

    // Update parcels belief
    for(const parcel of this.parcelBelief.values()){
      if(!updatedParcel.has(parcel.id)) {
        const timePassed = currTime - parcel.timestamp;
        parcel.reward = parcel.reward - (timePassed / this.config.PARCEL_DECADING_INTERVAL);
        /* Keep them in memory only if
        * - timePassed is lower than 10 seconds
        * - reward is bigger than 5
        * - last time we saw it it was not carried (assume it was delivered)*/
        if(timePassed < (10 * 1000) && parcel.reward > 5 && !parcel.carriedBy){
          parcel.timestamp = currTime;
          updatedParcel.set(parcel.id, parcel);
        }
      }
    }

    // Reset beliefs and add updated parcels
    this.parcelBelief = new Map();
    for(const p of updatedParcel.values()){
      this.parcelBelief.set(p.id, p);
    }
  }

  /**Draw on the map object the current and next position of the agents */
  setAgentsPositions(){
    // Prepare a clean map to set position of agents
    this.map.clearMap();

    // Loop for map update
    for(const a of  this.getAgents()){
      // If coordinates are float agent is moving
      if(!Number.isInteger(a.x) || !Number.isInteger(a.y)){
        const pos1 = {x: Math.ceil(a.x), y: Math.ceil(a.y)}; // Round up coordinates
        const pos2 = {x: Math.trunc(a.x), y: Math.trunc(a.y)}; // Truncate coordinates
        //console.log("moving", pos1, pos2)
        this.map.updateMap(pos1);
        this.map.updateMap(pos2);
      }else{ // Otherwise agent is still
        const pos = {x: a.x, y: a.y};
        this.map.updateMap(pos);
      }
    }

  }


  /**
   * Update other enemy agents
   * @param {Array} sensed_agents 
   */
  updateAgents(sensed_agents){
    const currTime = this.time.ms;

    // Update agents with sensing information
    for(const a of sensed_agents){
      //Add timestamp
      a.timestamp = currTime;
      this.agentBelief.set(a.id, a);      
    }

    // Loop to remove very old agents from belief (may have disconnected)
    for(const a of this.agentBelief.values()){
      if(currTime - a.timestamp > 1000 * this.config.MOVEMENT_DURATION){
        this.agentBelief.delete(a.id);
      }
    }

    // Loop for map update
    this.setAgentsPositions();
  }

  /**
   * Get a list of all parcel in our belief
   * @returns 
   */
  getParcels(){
    return Array.from(this.parcelBelief.values());
  }

  /**
   * Get list of all agents in our belief
   * @returns return agents in our beliefset
   */
  getAgents(){
    return Array.from(this.agentBelief.values());
  }

  /**
   * Merget data in teammate belief into our own belief
   * @param {Object} bs beliefset data to merge with 
   */
  merge(bs){
    // First we can add the other agent information into our belief
    // This also avoids bumping into him later
    bs.me.timestamp = bs.time.ms;
    this.agentBelief.set(bs.me.id, bs.me);

    // Merge parcel belief
    bs.parcelBelief = new Map(Object.entries(bs.parcelBelief));
    for(const p of Array.from(bs.parcelBelief.values())){
      // If this agent data isn't in our belief or the data is newer we update
      if(!this.parcelBelief.has(p.id) || p.timestamp > this.parcelBelief.get(p.id).timestamp){
        this.parcelBelief.set(p.id, p);
      }
    }

    // Merge agent belief
    bs.agentBelief =  new Map(Object.entries(bs.agentBelief));
    for(const a of Array.from(bs.agentBelief.values())){
      // Skip ourselves
      if(a.id == this.me.id){ continue; }

      // If agent data isn't into belief or the new belief has newer data
      if(!this.agentBelief.has(a.id) || a.timestamp > this.agentBelief.get(a.id).timestamp){
        this.agentBelief.set(a.id, a);
      }
    }

    // Update map
    this.setAgentsPositions();
  }


  /** Print belief of the agent clearly*/
  printBelief() {
    console.log(this.config);
    console.log(this.me);
    console.log(this.map.map);
    console.log(this.getParcels());
    console.log(this.getAgents());
  }
}


export {Belief};