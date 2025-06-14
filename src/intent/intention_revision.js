import { Intention } from "./intention.js";
import { myBelief } from "../belief/sensing.js";
import { envArgs } from "../connection/env.js";
import { logger } from "../logger.js";


class IntentionRevision {
  // The datastructure to contain all intentions to perform
  #intentionQueue = new Array();


  /**Intention_queue getter */
  get intentionQueue () {
      return this.#intentionQueue;
  }


  /**
   * Check if current intention is still valid returning True or False
   * @param {Object} intention intention to check
   */
  isIntentionValid(intention) {
    // Get parcels in belief
    const parcels = myBelief.getParcels();

    // For pickup intentions, check if parcel still exists 
    // and isn't carried by someone else
    if (intention.predicate.type === "pickUp") {
      const targetParcel = parcels.find(p => p.id === intention.predicate.target.id);
      return targetParcel !== undefined && !targetParcel.carriedBy;
    }

    // For delivery intentions, check if we're still carrying a parcel
    if (intention.predicate.type === "deliver") {
      return parcels.filter(p => p.carriedBy === myBelief.me.id).length > 0;
    }

    // Otherwise its valid
    return true;
  }



  /**
   * Loop for intention revision
  */
  async loop ( ) {
    while ( true ) {
      // If queue not empty
      if ( this.#intentionQueue.length > 0 ) {
        
        // If logger is acrive we log intentions
        if(envArgs.logger){
          logger.logDecisions(
            Array.from(this.#intentionQueue.map(i=>i.predicate)),
            "CURRENT INTENTIONS",
            myBelief.time,
            "frame"
          )
        }
        
        console.log( 'intentionRevision.loop', this.#intentionQueue.map(i=>i.predicate.type) );

        // Get the current best intention
        const intention = this.#intentionQueue[0];
              
        // Check if this intention can be done
        if (!this.isIntentionValid(intention)) { // if intention is not valid
          this.#intentionQueue.shift(); // Delete intention and go on
          continue;
        }

        
        // Try to achieve intention
        await intention.achieve()
        // Catch failures and go on
        .catch( error => {
          console.log( 'Failed intention', intention.predicate.type , 'with error:', error )
        });

        // Delete intention
        this.#intentionQueue.shift();
      }
      // Postpone next iteration
      await new Promise( res => setImmediate( res ) );
    }
  }

  /**Log function to print information. */
  log ( ...args ) {
      console.log( ...args )
  }


  /**
   * Function to add a new best option to the intention queue
   * @param {*} predicate 
   */
  push ( predicate ) {
    //console.log( 'To push. Received', predicate );

    // Get the highest priority intent now
    const last = this.#intentionQueue[0];
    // Check if we just modify an intent or not
    let found = false;

    // Check if the intention is already present
    
    for(let i = 0; i < this.#intentionQueue.length; i++){
      // The intent is found within the queue
      if(predicate.type == "idle" && this.#intentionQueue[i].predicate.type === predicate.type){
        found = true;
      }
      else if(this.#intentionQueue[i].predicate.type === predicate.type && 
        JSON.stringify(this.#intentionQueue[i].predicate.target) === JSON.stringify(predicate.target)
      ) {
        this.#intentionQueue[i].predicate.priority = predicate.priority;
        found = true;
      }
    }

    // If it wasn't already in the queue, just add it
    if(!found){
      // Create a new intention given a predicate
      const intention = new Intention( this, predicate);
      this.#intentionQueue.push(intention);
    }


    // For multi agents we implement a simple sort
    this.#intentionQueue.sort((a, b) => {
      // Handle edge cases
      if (a.predicate.priority === b.predicate.priority) return 0;
      return b.predicate.priority - a.predicate.priority; // Descending order
    });

    // If a better intent is found we have to stop last and start the new one
    if ((last != null) &&
      (JSON.stringify(this.#intentionQueue[0].predicate) !== JSON.stringify(last.predicate))) {
      last.stop();
    }
  }


}



export {IntentionRevision};