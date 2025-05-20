import { onlineSolver, PddlProblem } from "@unitn-asa/pddl-client";
import { myBelief } from "../belief/sensing.js";
import { aStar } from "../intent/astar.js";
import { Intention } from "../intent/intention.js";
import { client } from "../connection/connection.js";
import { readFile } from "./utils.js";
import { envArgs } from "../connection/env.js";
import { logger } from "../logger.js";

//Get domain for pddl planning
const domain = await readFile("./src/plan/domain.pddl")

// Library where plans are put inside
const planLib = [];

// Class used as blueprint for plans
class Plan {
  // Create private attributes
  #stopped = false; // True if plan is stopped
  #parent; // Referring to the caller class
  #sub_intentions = []; // List of sub intentions the plan is composed of

  /**Constructor of the Plan class */
  constructor( parent ) {
    this.#parent = parent;

  }

  /**stop method to set the stopped flag to true
   * and to stop all sub intentions*/
  stop () {
    this.#stopped = true;
    for ( const i of this.#sub_intentions ) {
        i.stop();
    }
  }
  /**Getter method to return stopped attribute value */
  get stopped () {
      return this.#stopped;
  }

  /**log method that delegates to parent log method and falls
   * to console.log if no parent exists*/
  log ( ...args ) {
    if ( this.#parent && this.#parent.log )
        this.#parent.log( '\t', ...args )
    else
        console.log( ...args )
  }

  /**Add subintention to subintentions list and then achieve them*/
  async subIntention ( predicate ) {
    const sub_intention = new Intention( this, predicate );
    this.#sub_intentions.push( sub_intention );
    return sub_intention.achieve();
  }

}


class MoveTo extends Plan {
  /**
  * Check if this plan can be applied to an intention
  */
  static isApplicableTo ( predicate ) {
    return predicate.type == 'moveTo';
  }


  /**
   * Execute the plan
   */
  async execute ( predicate ) {
    // While not arrived
    while(myBelief.me.x !== predicate.target.x || myBelief.me.y !== predicate.target.y)
    {
      if ( this.stopped ) throw ['stopped']; // If stopped then quit

      // Get a path to avoid obstacles now
      const path = aStar(myBelief.me, predicate.target, myBelief.map);
      
      // Blocked path
      if(path === false){
        throw ["failed"];

      }


      // Get a move from the path
      const move = path[0];

      // If logger active, log current movement
      if(envArgs.logger){
        logger.logOthers(`Current move: ${JSON.stringify(move)}`, myBelief.time, "frame")
      }

      // Move agent
      if ( this.stopped ) throw ['stopped']; // If stopped then quit
      await client.emitMove(move);
      if ( this.stopped ) throw ['stopped']; // If stopped then quit
      await new Promise(res => setImmediate(res));
    }
    
    return true;
  }
}


class PDDLMoveTo extends Plan {
  /**
  * Check if this plan can be applied to an intention
  */
  static isApplicableTo ( predicate ) {
    return predicate.type == 'moveTo';
  }


  /**
   * Execute the plan
   */
  async execute ( predicate ) {
    if ( this.stopped ) throw ['stopped']; // If stopped then quit

    const agentName = "me";
    const currentTile = `t_${myBelief.me.x}_${myBelief.me.y}`;
    const targetTile = `t_${predicate.target.x}_${predicate.target.y}`;


    // Update beliefset of map
    myBelief.map.updatePDDL();
    // Get map information
    const objectList = [...myBelief.map.mapBeliefSet.objects, agentName];
    const objects = objectList.join(' ');

    // Get current agent tile
    const initState = myBelief.map.mapBeliefSet.toPddlString()
    + ` (me ${agentName})`
    + ` (agent ${agentName})`
    + ` (at ${agentName} ${currentTile})`;
    
    // Construct target goal predicate
    const goal = `and (at ${agentName} ${targetTile})`;

    
    // Create problem
    const pddlProblem = new PddlProblem(
      'deliveroo',
      objects,
      initState,
      goal
    );

    const problem = pddlProblem.toPddlString();
    //console.log(problem)
    const plan = await onlineSolver(domain, problem);
    let path = [];
    if (plan != null){
      path = plan.map(step => step.action.toLowerCase());
    }else { // No plan created
      throw ['failed'];
    }
    
    if ( this.stopped ) throw ['stopped']; // If stopped then quit

    // Since its costly to regenerate path till we reach the goal we will keep our path
    // and wait to move until to agent blocks us
    for(const move of path){
        if ( this.stopped ) throw ['stopped']; // If stopped then quit

      // If log is active, log current movement
      if(envArgs.logger){
        logger.logOthers(`Current move: ${JSON.stringify(move)}`, myBelief.time, "frame")
      }

      // First get next position
      let nextPos = {x:myBelief.me.x, y:myBelief.me.y};
      switch(move){
        case "left":{
          nextPos.x--;
          break;
        }
        case "right":{
          nextPos.x++;
          break;
        }
        case "up":{
          nextPos.y++;
          break;
        }
        case "down":{
          nextPos.y--;
          break;
        }
      };

      while(!myBelief.map.isWalkable(nextPos)){ // While agent blocks us we wait
        await new Promise(res => setTimeout(res, myBelief.config.MOVEMENT_DURATION));
        await new Promise(res => setImmediate(res));
      }
  

      if ( this.stopped ) throw ['stopped']; // if stopped then quit
      await client.emitMove(move);
      if ( this.stopped ) throw ['stopped']; // if stopped then quit
      await new Promise(res => setImmediate(res));
    }

    // If we failed to reach target we failed the plan
    if(myBelief.me.x !== predicate.target.x || myBelief.me.y !== predicate.target.y){
      throw ["failed"];
    }

    return true;
  }
}


class PickUp extends Plan {

  /**
   * Check if this plan can be applied to an intention
   */
  static isApplicableTo ( predicate ) {
    return predicate.type == 'pickUp';
  }


  /**
   * Execute the plan
   */
  async execute ( predicate ) {
    if ( this.stopped ) throw ['stopped']; // if stopped then quit
    await this.subIntention( {type: "moveTo", target: {x: predicate.target.x, 
      y: predicate.target.y, entity: "parcel"}} );
    if ( this.stopped ) throw ['stopped']; // if stopped then quit
    await client.emitPickup();
    if ( this.stopped ) throw ['stopped']; // if stopped then quit

    return true;
  }
}





class Deliver extends Plan {
  /**
  * Check if this plan can be applied to an intention
  */
  static isApplicableTo ( predicate ) {
    return predicate.type == 'deliver';
  }

  /**
   * Execute the plan
   */
  async execute ( predicate ) {
    if ( this.stopped ) throw ['stopped']; // if stopped then quit
    await this.subIntention( {type: "moveTo", target: {x: predicate.target.x, 
      y: predicate.target.y, entity: "delivery"}}, client );
    if ( this.stopped ) throw ['stopped']; // if stopped then quit
    await client.emitPutdown();
    if ( this.stopped ) throw ['stopped']; // if stopped then quit

    return true;
  }
}

class Idle extends Plan {
  /**
  * Check if this plan can be applied to an intention
  */
  static isApplicableTo ( predicate ) {
    return predicate.type == 'idle';
  }

  /**
   * Execute the plan
   */
  async execute ( predicate ) {
    if (this.stopped) throw ['stopped']; // If stopped then quit

    // Get reachable spawn tiles (reachable not considering agents)
    const spawnTiles = myBelief.map.filterReachableTileLists(myBelief.me, true).spawnTiles;

    // If no reachable spawn tiles, stay put
    if (spawnTiles.length === 0) {
      return true;
    }

    // Sort by score descending and take top n
    const bestSpawns = spawnTiles
    .filter(spawn => {
      if (spawn.x === myBelief.me.x && spawn.y === myBelief.me.y) return false // Not my position
      return true
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
    // Case where we have less bestSpawns, we just use the spawnTiles
    const candidates = bestSpawns.length > 0 ? bestSpawns : spawnTiles;

    // Random selection of one of the candidates
    const randomIndex = Math.floor(Math.random() * candidates.length);
    const target = candidates[randomIndex];


    if (this.stopped) throw ['stopped'];
    await this.subIntention({ type: "moveTo", target: {x: target.x, 
    y: target.y, entity: "spawn"} });
    if (this.stopped) throw ['stopped'];

    return true;
  }

}

// Add all plans to planLib
if(envArgs.usePDDL){
  planLib.push(PDDLMoveTo);
} else {
  planLib.push(MoveTo);
}

planLib.push(PickUp);
planLib.push(Deliver);
planLib.push(Idle);

export {planLib};