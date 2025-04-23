import { DeliverooMap } from './deliverooMap.js'
import { stringToMillisec } from './utils.js';


/**This class contains all belief data of the agent */
class Belief {
  // Information collected by the agent
  // Data of the configuration of the game
  config = {};

  // Reference to the current agent
  me = {};

  // Belief regarding the game map
  map = new DeliverooMap();

  // Map agentId -> agents states
  agentBelief = new Map();

  //Map parcelId -> parcel states
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
  }

  /**Function to update the reference to current agent
   * @param {Object} me 
   */
  updateMe(me){
    this.me.id = me.id;
    this.me.name = me.name;
    this.me.teamId = me.teamId;
    this.me.teamName = me.teamName;
    this.me.x = Math.round(me.x);
    this.me.y = Math.round(me.y);
    this.me.score = me.score;
    this.me.penalty = me.penalty;
  }

  /**
   * Update the parcel mapping
   * @param {Array} sensed_parcels 
   */
  updateParcels(sensed_parcels){
    //Take the current time
    const currTime = Date.now();
    //Create a structure to store the new parcels
    const updatedParcel = new Map();

    // Iterate over all sensed parcels
    for(const p of sensed_parcels){
      p.timestamp = currTime;
      updatedParcel.set(p.id, p);
      // Add parcels with timestamp
    }

    // Update unseen parcels
    for(const parcel of this.parcelBelief.values()){
      if(!updatedParcel.has(parcel.id)) {
        const timePassed = currTime - parcel.timestamp;
        parcel.reward = parcel.reward - (timePassed / this.config.PARCEL_DECADING_INTERVAL);

        /* Keep them in memory only if
        * - timePassed is lower than 10 seconds
        * - reward is bigger than 5*/
        if(timePassed > (10 * 1000) && parcel.reward > 5){
          p.timestamp = currTime;
          updatedParcel.set(p.id, p);
        }
      }
    }

    // Reset beliefs and add updated parcels
    this.parcelBelief = new Map();
    for(const p of updatedParcel.values()){
      this.parcelBelief.set(p.id, p);
    }
  }

  /**
   * Update other enemy agents
   * @param {Array} sensed_agents 
   */
  updateAgents(sensed_agents){
    // Prepare a clean map to set position of agents
    this.map.clearMap();

    for(const a of sensed_agents){
      //Add timestamp
      a.timestamp = Date.now();

      // If agent isn't already saved, save it
      if(!this.agentBelief.has(a.id)){
        a.moving = ""; // Where the agent is moving
        this.agentBelief.set(a.id, a);
      } else {
        // Compute agent direction and set position of the agent as wall
        const seenLast = this.agentBelief.get(a.id);
        // If we saw him in the last 5 moves
        if(Date.now() - seenLast.timestamp < this.config.MOVEMENT_DURATION * 5){
          const horrizontalMove = seenLast.x - a.x;
          const verticalMove = seenLast.y - a.y;
          if(horrizontalMove > 0){
            a.moving = "left";
            this.map.updateMap({x: a.x + 1, y:a.y});
          }
          else if(horrizontalMove < 0){
            a.moving = "right";
            this.map.updateMap({x: a.x - 1, y:a.y});
          }
          else if(verticalMove > 0){
            a.moving = "down";
            this.map.updateMap({x: a.x, y: a.y - 1});
          }
          else if(verticalMove < 0){
            a.moving = "up";
            this.map.updateMap({x: a.x, y:a.y + 1});
          }
          else{
            a.moving = "";
          }
        }
        // Update old agent state
        this.agentBelief.set(a.id, a);
      }
    }

    // Now we update map with all current agent positions
    for (const a of this.agentBelief.values()) {
      this.map.updateMap({x:a.x, y:a.y});
    }
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
   * @returns 
   */
  getAgents(){
    return Array.from(this.agentBelief.values());
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