import { me, map } from "../belief/belief_revision.js";
import { manhDistance, aStar } from "../belief/astar.js";
import { Intention } from "../intent/intention.js";

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
  async subIntention ( predicate, client ) {
    const sub_intention = new Intention( this, predicate, client );
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
  async execute ( predicate, client ) {
    if ( this.stopped ) throw ['stopped']; // if stopped then quit
    await this.subIntention( {type: "moveTo", target: {x: predicate.target.x, 
      y: predicate.target.y}}, client );
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
  async execute ( predicate, client ) {
    if ( this.stopped ) throw ['stopped']; // if stopped then quit
    const path = aStar(me, predicate.target, map);
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
    if(me.x !== predicate.target.x || me.y !== predicate.target.y){
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
  async execute ( predicate, client ) {
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
  async execute ( predicate, client ) {
    
    if ( this.stopped ) throw ['stopped']; // if stopped then quit
    
    // Find all tiles with type 1 (parcel spawn points)
    const spawnableTiles = [];
    for (let x = 0; x < map.length; x++) {
      for (let y = 0; y < map[x].length; y++) {
        if (map[x][y] === 1 && me.x != x && me.y != y) { // diverso da quello in cui sei
          spawnableTiles.push({x, y});
        }
      }
    }

    if ( this.stopped ) throw ['stopped']; // if stopped then quit

    // If no spawn tiles wait a few
    if (spawnableTiles.length === 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      throw "no spawnable tiles";
    }

    //Find n nearest tiles
    const closestSpawns = spawnableTiles
      .map(spawn => ({
        point: spawn,
        distance: manhDistance(me, spawn)
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 4); // Consider top 4 closest

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