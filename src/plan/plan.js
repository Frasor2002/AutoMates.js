import { myBelief } from "../belief/sensing.js";
import { aStar } from "../intent/astar.js";
import { Intention } from "../intent/intention.js";
import { client } from "../connection/connection.js";

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
    if ( this.stopped ) throw ['stopped']; // if stopped then quit
    const path = aStar(myBelief.me, predicate.target, myBelief.map);
    if ( this.stopped ) throw ['stopped']; // if stopped then quit

    // Promise to move only if we are already still
    var m = new Promise(res => client.onYou(m => m.x % 1 != 0 || m.y % 1 != 0 
      ? null : res()));
    
    for(const move of path){
      if ( this.stopped ) throw ['stopped']; // if stopped then quit
      await client.emitMove(move);
      await m;
      if ( this.stopped ) throw ['stopped']; // if stopped then quit
    }

    // If we failed to reach target we failed the plan
    if(myBelief.me.x !== predicate.target.x || myBelief.me.y !== predicate.target.y){
      throw ["failed"];
    }
    
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
    
    if ( this.stopped ) throw ['stopped']; // if stopped then quit
    

    //Find n nearest tiles
    const closestSpawns = myBelief.map.spawnTiles
    .filter(spawn => !(spawn.x === myBelief.me.x && spawn.y === myBelief.me.y)) // Exclude current position
      .map(spawn => ({
        point: spawn,
        distance: aStar(myBelief.me, spawn, myBelief.map).length
      }))
      .filter(spawn => spawn.distance > 0) // Exclude targets with path length 0
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 8); // Consider closest
    

    // Randomly pick one of these tiles
    const totalWeight = closestSpawns.reduce((sum, spawn) => 
      sum + (1 / spawn.distance), 0);
    let random = Math.random() * totalWeight;
    let target = null;

    for (const spawn of closestSpawns) {
      random -= 1 / spawn.distance;
      if (random <= 0) {
        target = spawn.point;
        break;
      }
    }

    target = target || closestSpawns[0].point;

    if (this.stopped) throw ['stopped'];
    await this.subIntention({ type: "moveTo", target: target }, client);
    if (this.stopped) throw ['stopped'];
    

    return true;
  }

}

// Add all plans to planLib
planLib.push(PickUp);
planLib.push(MoveTo);
planLib.push(Deliver);
planLib.push(Idle);

export {planLib};