import { Intention } from "./intention.js";
import { me,
  getCurrentParcels
 } from "../belief/belief_revision.js";

class IntentionRevision {
  #client;
  #intention_queue = new Array();


  constructor( client ) {
    this.#client = client;
  }

  /**Intention_queue getter */
  get intention_queue () {
      return this.#intention_queue;
  }


  /**
   * Check if current intention is still valid returning True or False
   * @param {Object} intention 
   */
  isIntentionValid(intention) {
    // For pickup intentions, check if parcel still exists 
    // and isn't carried by someone else
    if (intention.predicate.type === "pickUp") {
      const parcels = getCurrentParcels();
      const targetParcel = parcels.find(p => p.id === intention.predicate.target.id);
      //console.log("PID CHekc", targetParcel !== undefined && !targetParcel.carriedBy)
      return targetParcel !== undefined && !targetParcel.carriedBy;
    }

    // For delivery intentions, check if we're still carrying a parcel
    if (intention.predicate.type === "deliver") {
      const parcels = getCurrentParcels();
      return parcels.filter(p => p.carriedBy === me.id).length > 0;
    }

    // Otherwise we idle
    return true;
  }

  /**
   * Loop for intention revision
  */
  async loop ( ) {
    while ( true ) {
      // If queue not empty
      if ( this.intention_queue.length > 0 ) {
        console.log( 'intentionRevision.loop', this.intention_queue.map(i=>i.predicate) );
        
        // Get the current best intention
        const intention = this.intention_queue[0];
              
        // Check if this intention can be done
        if (!this.isIntentionValid(intention)) { // if intention is not valid
          this.intention_queue.shift(); // Delete intention and go on
          continue;
        }

        // Try to achieve intention
        await intention.achieve()
        // Catch failures and go on
        .catch( error => {
          console.log( 'Failed intention', intention.predicate, 'with error:', ...error )
        });

        // Delete intention
        this.intention_queue.shift();
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
  async push ( predicate ) {

    // Check if already queued
    for(const i of this.#intention_queue){
      // Already have an idle in queue
      if(i.predicate.type === "idle" && 
        JSON.stringify(i.predicate) === JSON.stringify(predicate)){
          return;
      }
      
      if(i.predicate.type === predicate.type && 
        JSON.stringify(i.predicate.target) === JSON.stringify(predicate.target)
      ) {
        return
      }
    }
    console.log( 'To push. Received', predicate );

    

    // Create a new intention given a predicate
    const intention = new Intention( this, predicate, this.#client);

    // If the queue is empty, just add the new intention
    if (this.intention_queue.length === 0) {
      this.intention_queue.push(intention);
      return;
    }
    
    // Find position to insert based on priority score (higher first)
    let insertIndex = 0;
    while (insertIndex < this.intention_queue.length) {
      if (predicate.priority > this.intention_queue[insertIndex].predicate.priority) {
        break; // We found the index where to insert intention
      }
      insertIndex++;
    }

    // Insert at the correct position
    this.intention_queue.splice(insertIndex, 0, intention);

    // If we inserted at position 0 and there was a previous intention,
    // we might want to abort the current one if it's no longer optimal
    if (insertIndex === 0 && this.intention_queue.length > 1) {
      const last = this.intention_queue[ this.intention_queue.length - 1 ];
      last.stop();
    }
  }


}



export {IntentionRevision};