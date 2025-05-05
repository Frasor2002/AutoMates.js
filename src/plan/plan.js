import { onlineSolver, PddlProblem } from "@unitn-asa/pddl-client";
import { myBelief } from "../belief/sensing.js";
import { aStar } from "../intent/astar.js";
import { Intention } from "../intent/intention.js";
import { client } from "../connection/connection.js";
import { readFile } from "./utils.js";
import { logger } from "../logger.js";

//Get domain for pddl planning
const domain = await readFile("./src/plan/domain.pddl")
const PDDL = false;

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
      if ( this.stopped ) throw ['stopped']; // if stopped then quit

      // Get a path
      const path = aStar(myBelief.me, predicate.target, myBelief.map);
      // Empty path
      if(path.length === 0){
        break;
      }
      // Get a move and move in that direction
      const move = path[0];
      logger.logOthers(`Current move: ${JSON.stringify(move)}`)

      if ( this.stopped ) throw ['stopped']; // if stopped then quit
      await client.emitMove(move);
      if ( this.stopped ) throw ['stopped']; // if stopped then quit
      // Await a bit before moving again
      await new Promise(res => setTimeout(res, myBelief.config.MOVEMENT_DURATION));
      if ( this.stopped ) throw ['stopped']; // if stopped then quit
    }

    // If we failed to reach target we failed the plan
    if(myBelief.me.x !== predicate.target.x || myBelief.me.y !== predicate.target.y){
      throw ["failed"];
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
    if ( this.stopped ) throw ['stopped']; // if stopped then quit

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
      console.log(plan)
      path = plan.map(step => step.action.toLowerCase());
    }else { // No plan created
      throw ['failed'];
    }
    
    if ( this.stopped ) throw ['stopped']; // if stopped then quit
    
    for(const move of path){
      if ( this.stopped ) throw ['stopped']; // if stopped then quit
      // We must try to avoid other agents

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

      while(!myBelief.map.isWalkable(nextPos)){
        await new Promise(res => setTimeout(res, myBelief.config.MOVEMENT_DURATION));
      }

      await client.emitMove(move);
      await new Promise(res => setTimeout(res, myBelief.config.MOVEMENT_DURATION));
      if ( this.stopped ) throw ['stopped']; // if stopped then quit
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
      y: predicate.target.y}} );
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
      y: predicate.target.y}}, client );
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
    if (this.stopped) throw ['stopped']; // if stopped then quit

    const currentPos = { x: myBelief.me.x, y: myBelief.me.y };

    // Get current score based on tile agent is on
    let currScore = 0;
    const currentTile = myBelief.map.spawnTiles.find(
      t => t.x === currentPos.x && t.y === currentPos.y
    );
    if (currentTile) { // If we are on a spawn tile set spawn tile score
      currScore = currentTile.score;
    }

    // Check if we're in a high-scoring area but no parcels are around
    const shouldExplore = currScore > 3 && Math.random() < 0.6; // 30% chance to explore from high-score areas

    const candidateSpawns = myBelief.map.spawnTiles
      .filter(spawn => {
        // Exclude current position
        if (spawn.x === currentPos.x && spawn.y === currentPos.y) return false;
        
        // If we're exploring, consider all walkable spawn tiles
        if (shouldExplore) {
          return myBelief.map.isWalkable(spawn);
        }
        // Otherwise only consider tiles with higher score
        if (spawn.score <= currScore) return false;
        
        // Check if tile is walkable (not occupied)
        return myBelief.map.isWalkable(spawn);
      })
      .map(spawn => ({
        point: spawn,
        distance: aStar(currentPos, spawn, myBelief.map).length,
        score: spawn.score
      }))
      .filter(spawn => spawn.distance > 0) // Exclude unreachable targets
      .sort((a, b) => {
        if (a.distance !== b.distance) return a.distance - b.distance;
        return b.score - a.score;
      });

      // If no candidates found, stay put
      if (candidateSpawns.length === 0) {
        return true;
      }

      // Select target based on mode
      let target;
      if (shouldExplore) {
        // When exploring, give some randomness to the selection
        const topCandidates = candidateSpawns.slice(0, 3); // Consider top 3 candidates
        target = topCandidates[Math.floor(Math.random() * topCandidates.length)].point;
      } else {
        // Normal behavior: select the nearest highest-scoring tile
        target = candidateSpawns[0].point;
      }

      if (this.stopped) throw ['stopped'];
      await this.subIntention({ type: "moveTo", target: target });
      if (this.stopped) throw ['stopped'];

      return true;
  }

}

// Add all plans to planLib
if(PDDL){
  planLib.push(PDDLMoveTo);
} else {
  planLib.push(MoveTo);
}
planLib.push(PickUp);
planLib.push(Deliver);
planLib.push(Idle);

export {planLib};