import { onlineSolver, PddlProblem } from "@unitn-asa/pddl-client";
import { myBelief } from "../belief/sensing.js";
import { aStar, fromPathToPositions } from "../intent/astar.js";
import { Intention } from "../intent/intention.js";
import { client } from "../connection/connection.js";
import { readFile, getIdleTarget} from "./utils.js";
import { envArgs } from "../connection/env.js";
import { logger } from "../logger.js";
import { friendInfo } from "../collaboration/comunication.js";

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

    const postions = fromPathToPositions({x:myBelief.me.x, y:myBelief.me.y}, path)

    // Since its costly to regenerate path till we reach the goal we will keep our path
    // and wait to move until to agent blocks us
    for(let i = 0; i < path.length; i++){
      if ( this.stopped ) throw ['stopped']; // If stopped then quit

      // If log is active, log current movement
      if(envArgs.logger){
        logger.logOthers(`Current move: ${JSON.stringify(move)}`, myBelief.time, "frame")
      }

      // Get nextPos
      let nextPos = postions[i];
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


class MultiMoveTo extends Plan {
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

    // Take agreed path from predicate
    const agreedPath = predicate.path;
    //console.log(agreedPath);

    //console.log(agreedPath, typeof agreedPath)
    const positions = fromPathToPositions({x:myBelief.me.x, y:myBelief.me.y}, agreedPath);
    
    // Since the path was agreed with the other agent we wont change it at each step
    // Similarly to PDDLMove we will wait if an obstacle is in front of us
    for(let i = 0; i < agreedPath.length; i++){
      if(!myBelief.map.isWalkable(myBelief.me)){ // If on other agent path
        throw ["failed"];
      }


      if ( this.stopped ) throw ['stopped']; // If stopped then quit
      let move = agreedPath[i];

      // If log is active, log current movement
      if(envArgs.logger){
        logger.logOthers(`Current move: ${JSON.stringify(move)}`, myBelief.time, "frame");
      }

      let nextPos = positions[i];
      if(myBelief.map.map[nextPos.x][nextPos.y] == -1){ // If agent blocks us
        if(myBelief.me.name > friendInfo.name){
          await new Promise(res => setTimeout(res, myBelief.config.MOVEMENT_DURATION));
        }else {
          throw ["failed"];
        }
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
      y: predicate.target.y}, path: predicate.path} );
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
      y: predicate.target.y},  path: predicate.path} );
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

    const target = getIdleTarget(myBelief);

    if (this.stopped) throw ['stopped'];
    await this.subIntention({ type: "moveTo", target: {x: target.x, 
    y: target.y} });
    if (this.stopped) throw ['stopped'];

    return true;
  }

}


class MultiIdle extends Plan {

  static isApplicableTo ( predicate ) {
    return predicate.type == 'idle';
  }

  async execute ( predicate ) {
    if (this.stopped) throw ['stopped']; // If stopped then quit

    // We simply forward the agreed path to the MultiMoveTo

    //console.log(predicate)

    if (this.stopped) throw ['stopped'];
    await this.subIntention({ type: "moveTo", target: {x: predicate.target.x, 
    y: predicate.target.y},  path: predicate.path });
    if (this.stopped) throw ['stopped'];

    return true;
  }

}

// Add all plans to planLib

// If multiagent we add multi plans
if(envArgs.mode == "multi"){
  planLib.push(MultiMoveTo);
  planLib.push(MultiIdle);
} else { // Solo agent plans
  planLib.push(Idle);
  if(envArgs.usePDDL){
  planLib.push(PDDLMoveTo);
  } else {
  planLib.push(MoveTo);
}  
}

planLib.push(PickUp);
planLib.push(Deliver);

export {planLib};