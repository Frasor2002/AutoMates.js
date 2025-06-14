import { onlineSolver, PddlProblem } from "@unitn-asa/pddl-client";
import { myBelief } from "../belief/sensing.js";
import { aStar, fromPathToPositions } from "../intent/astar.js";
import { Intention } from "../intent/intention.js";
import { client } from "../connection/connection.js";
import { readFile, getIdleTarget} from "./utils.js";
import { envArgs } from "../connection/env.js";
import { logger } from "../logger.js";
import { friendInfo } from "../collaboration/comunication.js";
import { templates } from "../collaboration/utils.js";
import { checkMessage } from "../collaboration/encription.js";

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


// Different moves to enhance single agent
// - RandomMove
// - HeuristicMove
class RandomMove extends Plan {
  /**
  * Check if this plan can be applied to an intention
  */
  static isApplicableTo ( predicate ) {
    return predicate.type == 'random';
  }

  async execute ( predicate ) {
    let lastMove = "";
    let failure = 0;
    let cx = myBelief.me.x;
    let cy = myBelief.me.y;
    let moves = 0;

    while(moves < myBelief.map.POD){
      if(this.stopped) throw ['stopped'];

      let directions = [
        {move: "right", x: 1, y: 0},
        {move: "left", x: -1, y: 0},
        {move: "up", x: 0, y: 1},
        {move: "down", x: 0, y: -1}
      ]

      directions = directions.filter((x)=>x.move!=lastMove);
      let tentative;

      while(directions.length > 0 && tentative == undefined){
        let idx = Math.floor(directions.length * Math.random());
        if(myBelief.map.isWalkable({x: cx + directions[idx].x, y: cy + directions[idx].y})){
          tentative = directions[idx];
        } else {
          directions.splice(idx,1);
        }
      }

      if(tentative !== undefined){
        failure++;
        if(failure>10) throw ['failed'];
        await new Promise (res => setTimeout(res,50));
      }

      let hasMoved = await client.emitMove(tentative.move);
      
      if(!hasMoved){
        failure++;
        if(failure>10) throw ['failed'];
        await new Promise (res => setTimeout(res,50));
      } else{
        moves++;
      }

      cx = myBelief.me.x;
      cy = myBelief.me.y;
      
    }
  }
}

class HeuristicsMoveTo extends Plan {
  /**
  * Check if this plan can be applied to an intention
  */
  static isApplicableTo ( predicate ) {
    return predicate.type == 'heuristics';
  }


  /**
   * Execute the plan
   */
  async execute ( predicate ) {
    let failure = 0

    // Get a path to avoid obstacles now
    let path = aStar(myBelief.me, predicate.target, myBelief.map, true);

    // Blocked path
    if(path === false){
      throw ["failed"];
    }

    let cx = myBelief.me.x;
    let cy = myBelief.me.y;

    // While not arrived
    while(cx !== predicate.target.x || cy !== predicate.target.y || path.length != 0) {
      if ( this.stopped ) throw ['stopped']; // If stopped then quit

      let move = path.shift();

      // If logger active, log current movement
      if(envArgs.logger){
        logger.logOthers(`Current move: ${JSON.stringify(move)}`, myBelief.time, "frame")
      }

      let canMove = false;

      if(
        (move == "right" && myBelief.map.isWalkable({x: cx+1, y: cy})) ||
        (move == "left" && myBelief.map.isWalkable({x: cx-1, y: cy})) ||
        (move == "up" && myBelief.map.isWalkable({x: cx, y: cy+1})) ||
        (move == "down" && myBelief.map.isWalkable({x: cx, y: cy-1}))
      ) {
        canMove = true;
      }
      
      if(!canMove)failure++;
      if(failure > 10) break; 

      let result = await client.emitMove(move);
      if(!result) failure++;
      if(failure > 10) break;

      if ( this.stopped ) throw ['stopped']; // If stopped then quit
      await new Promise(res => setImmediate(res));
    }

    if(failure > 10){
      return await this.subIntention({type: "random"});
    }
    else return true;
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
    let failure = 0
    // While not arrived
    while(myBelief.me.x !== predicate.target.x || myBelief.me.y !== predicate.target.y)
    {
      if ( this.stopped ) throw ['stopped']; // If stopped then quit


      // Get a path to avoid obstacles now
      const path = aStar(myBelief.me, predicate.target, myBelief.map);
      
      // Blocked path
      if(path === false){
        failure = 10;
        break;
      }


      // Get a move from the path
      const move = path[0];

      // If logger active, log current movement
      if(envArgs.logger){
        logger.logOthers(`Current move: ${JSON.stringify(move)}`, myBelief.time, "frame")
      }

      // Move agent
      if ( this.stopped ) throw ['stopped']; // If stopped then quit
      let result = await client.emitMove(move);

      if(!result) failure++;
      if(failure > 10) break;

      if ( this.stopped ) throw ['stopped']; // If stopped then quit
      await new Promise(res => setImmediate(res));
    }

    if(failure > 10){
      return await this.subIntention({type: "heuristics", target: {x: predicate.target.x, 
      y: predicate.target.y}});
    }
    else return true;
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
    myBelief.map.updatePDDL(myBelief.me);
    // Get map information
    const objectList = [...myBelief.map.mapBeliefSet.objects, agentName];
    const objects = objectList.join(' ');

    // Get current agent tile
    const initState = myBelief.map.mapBeliefSet.toPddlString()
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

      // Get move
      let move = path[i];

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
    if ( this.stopped ){
      await client.emitSay(friendInfo.id, {msg: templates.STOP_INTENTION_TEMPLATE})
      throw ['stopped']; // If stopped then quit
    } 

    // Take agreed path from predicate
    const agreedPath = predicate.path;

    const positions = fromPathToPositions({x:myBelief.me.x, y:myBelief.me.y}, agreedPath);
    
    // Since the path was agreed with the other agent we wont change it at each step
    // Similarly to PDDLMove we will wait if an obstacle is in front of us
    for(let i = 0; i < agreedPath.length; i++){
      if ( this.stopped ){
        await client.emitSay(friendInfo.id, {msg: templates.STOP_INTENTION_TEMPLATE})
        throw ['stopped']; // If stopped then quit
      }
      let move = agreedPath[i];

      // If log is active, log current movement
      if(envArgs.logger){
        logger.logOthers(`Current move: ${JSON.stringify(move)}`, myBelief.time, "frame");
      }

      let nextPos = positions[i];
      if(myBelief.map.map[nextPos.x][nextPos.y] == -1 || myBelief.map.map[nextPos.x][nextPos.y] == 0
        || !myBelief.map.isInBounds(nextPos)
      ){ // If agent blocks us
        await client.emitSay(friendInfo.id, {msg: templates.STOP_INTENTION_TEMPLATE})
        throw ["failed"];
      }

      if ( this.stopped ){
        await client.emitSay(friendInfo.id, {msg: templates.STOP_INTENTION_TEMPLATE})
        throw ['stopped']; // If stopped then quit
      } 
      await client.emitMove(move);
      
      if ( this.stopped ){
        await client.emitSay(friendInfo.id, {msg: templates.STOP_INTENTION_TEMPLATE})
        throw ['stopped']; // If stopped then quit
      } 
      await new Promise(res => setImmediate(res));
    }

    // If we failed to reach target we failed the plan
    if(myBelief.me.x != predicate.target.x || myBelief.me.y != predicate.target.y){
      //console.log("destination not reached")
      await client.emitSay(friendInfo.id, {msg: templates.STOP_INTENTION_TEMPLATE})
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
    let arr = await client.emitPickup();
    if (arr.length != 0) throw ['failed'];
    if ( this.stopped) throw ['stopped']; // if stopped then quit

    return true;
  }
}





class SoloDeliver extends Plan {
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
 
    let cx = myBelief.me.x;
    let cy = myBelief.me.y;

    let isOnTheWay = myBelief.map.deliveryMap[cx][cy].distance > 0;
    let isCarryingParcels = myBelief.getParcels()
      .find(val => val.carriedBy == myBelief.me.id) != undefined;
    let failures = 0;

    while(isOnTheWay && isCarryingParcels){
      let dirArray = myBelief.map.deliveryMap[cx][cy].direction.slice();
      let dir = "";      
      do{
        let idx = Math.floor(dirArray.length * Math.random());
        
        switch(dirArray[idx]){

          case "right":
            if(myBelief.map.isWalkable({x: cx+1, y: cy})) dir = "right";
            break;

          case "left":
            if(myBelief.map.isWalkable({x: cx-1, y: cy})) dir = "left";
            break;

          case "up":
            if(myBelief.map.isWalkable({x: cx, y: cy+1})) dir = "up";
            break;

          case "down":
            if(myBelief.map.isWalkable({x: cx, y: cy-1})) dir = "down";
            break;
        }
        dirArray.splice(idx,1);

      } while(dir=="" && dirArray.length > 0);

      if(dir==""){
        failures++;
        if(failures > 10) break;
        await new Promise (res => setTimeout(res,50))
        //console.log("I waited, no choices");continue;
      }
      if ( this.stopped ) throw ['stopped']; // if stopped then quit
      let hasMoved = await client.emitMove(dir);

      if(!hasMoved){
        failures++;
        if(failures > 10) break;
        await new Promise (res => setTimeout(res,50));
        //console.log("I waited, failed");continue;
      }
      cx = myBelief.me.x;
      cy = myBelief.me.y;

      isOnTheWay = myBelief.map.deliveryMap[cx][cy].distance > 0;
      let prcl = myBelief.getParcels()
      let z = prcl.find(val => val.carriedBy == myBelief.me.id);
      //console.log(`What I believe: ${JSON.stringify(prcl)}`)
      
      isCarryingParcels = z != undefined;
    }

    if ( !isCarryingParcels ) throw ['failed'];

    if ( failures > 10 ) {await this.subIntention( {type: "moveTo", 
      target: {x: predicate.target.x, y: predicate.target.y, entity: "delivery"}}, client );
      // Retry with standard move using A*
    }

    await this.subIntention( {type: "moveTo", target: {x: predicate.target.x, 
      y: predicate.target.y}} );
    if ( this.stopped ) throw ['stopped']; // if stopped then quit
    await client.emitPutdown();
    if ( this.stopped ) throw ['stopped']; // if stopped then quit

    return true;
  }
}



class MultiDeliver extends Plan {

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
      y: predicate.target.y}, path: predicate.path} );
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
    //console.log(`Target: ${JSON.stringify(target)}`)

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

class PDDLAlleyway extends Plan {

  static isApplicableTo ( predicate ) {
    return predicate.type == 'planAlleyway';
  }

  async execute ( predicate ) {
    if (this.stopped) throw ['stopped']; // If stopped then quit

    // Check our role either as collector or as deliverer
    if(predicate.role == "collector"){
      // Plan the solution

      let parcel= predicate.parcelPos;

      // Define important objects
      // Agents
      const myAgentName = "me";
      const friendAgentName = "friend";
      const parcelName = "p";
      // Positions
      const myCurrentTile = `t_${myBelief.me.x}_${myBelief.me.y}`;
      const friendCurrentTile = `t_${predicate.friendPos.x}_${predicate.friendPos.y}`;
      const parcelPos = `t_${parcel.x}_${parcel.y}`;
      const targetPos = `t_${predicate.target.x}_${predicate.target.y}`;

      // Update beliefset of map
      myBelief.map.updatePDDL(myBelief.me);
      // Get objects of the problem
      const objectList = [...myBelief.map.mapBeliefSet.objects, myAgentName, friendAgentName,
        parcelName];
      const objects = objectList.join(' ');

      // Set positions on the map
      const initState = myBelief.map.mapBeliefSet.toPddlString()
      + ` (agent ${myAgentName})`
      + ` (at ${myAgentName} ${myCurrentTile})`
      + ` (agent ${friendAgentName})`
      + ` (at ${friendAgentName} ${friendCurrentTile})`
      + ` (parcel ${parcelName})`
      + ` (at ${parcelName} ${parcelPos})`;
    
    // Construct target goal predicate
    const goal = `and (at ${parcelName} ${targetPos})`;

    
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
    if(!plan){
      throw ['failed']
    } 
    //console.log(plan);

    // Send to other agent
    //await client.emitSay(friendInfo.id, {msg: "plan", plan: plan});

    for(const move of plan){
      // Iterate through every move in the plan
      if(move.args[0] == "ME"){ // If my action

        // If pickup
        if(move.action == "PICKUP"){
          // Do pickup
          if (this.stopped) throw ['stopped'];
          await client.emitPickup();
          if (this.stopped) throw ['stopped'];

        } else if(move.action == "PUTDOWN"){
          // Do putdown
          if (this.stopped) throw ['stopped'];
          await client.emitPutdown();
          if (this.stopped) throw ['stopped'];
        } else { // Movement action
          if (this.stopped) throw ['stopped'];
          await client.emitMove(move.action.toLowerCase());
          if (this.stopped) throw ['stopped'];
        }
      } else { // Friend action
        const reply = await client.emitAsk(friendInfo.id, {msg: templates.ALLEWAY_ACTION_TEMPLATE, move: move});
        if(!checkMessage(reply, templates.ALLEWAY_RESPONSE_TEMPLATE)){
          throw ['failed']
        }
      }


      await new Promise(res => setImmediate(res));
    }
    
    }else{
      //console.log("MOVE: ", predicate.move)
      const move = predicate.move;
      if(move.action == "PICKUP"){
        // Do pickup
        if (this.stopped) throw ['stopped'];
        await client.emitPickup();
        if (this.stopped) throw ['stopped'];

      } else if(move.action == "PUTDOWN"){
        // Do putdown
        if (this.stopped) throw ['stopped'];
        await client.emitPutdown();
        if (this.stopped) throw ['stopped'];
      } else { // Movement action
        if (this.stopped) throw ['stopped'];
        await client.emitMove(move.action.toLowerCase());
        if (this.stopped) throw ['stopped'];
      }
      predicate.reply({msg: templates.ALLEWAY_RESPONSE_TEMPLATE})
    }

    return true;
  }

}



// Add all plans to planLib

// If multiagent we add multi plans
if(envArgs.mode == "multi"){
  planLib.push(MultiMoveTo);
  planLib.push(MultiIdle);
  planLib.push(PDDLAlleyway);
  planLib.push(MultiDeliver);
} else { // Solo agent plans
  planLib.push(Idle);
  planLib.push(SoloDeliver);
  if(envArgs.usePDDL){ // Solo PDDL
  planLib.push(PDDLMoveTo);
  } else {
  planLib.push(MoveTo);
  planLib.push(HeuristicsMoveTo);
  planLib.push(RandomMove);
}  
}

planLib.push(PickUp);


export {planLib};