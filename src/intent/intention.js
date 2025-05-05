import { planLib } from "../plan/plan.js";


// Class to define an intent of the agent
class Intention {
  // Private attributes

  #current_plan;
  #stopped = false;
  #started = false;
  #parent;
  #predicate;

  /**
   * Constructor to init intent class
   * @param {*} parent 
   * @param {*} predicate 
   */
  constructor( parent, predicate ) {
    this.#parent = parent;
    this.#predicate = predicate;
  }

  /**Getter for stopped attribute. */
  get stopped () {
    return this.#stopped;
  }

  /**Function to set flag to true and stop the current plan */
  stop () {
      this.#stopped = true;
      if ( this.#current_plan)
          this.#current_plan.stop();
  }

  /** Getter for the predicate
   * Predicate is in the form {type: "", target: {}, priority: number}
  */
  get predicate () {
    return this.#predicate;
  }

  /**Function to delegate for printing. */
  log ( ...args ) {
    if ( this.#parent && this.#parent.log )
      this.#parent.log( '\t', ...args )
    else
      console.log( ...args )
  }

  /**Function to use the planning library to achieve an intention*/
  async achieve() {
    // First line to avoid starting twice
    if ( this.#started)
      return this;
    else
      this.#started = true;

    // Iterate through every plan in the library in order to find applicable ones
    for (const planClass of planLib) {

      // If intention is stopped we throw a stopped intention
      if ( this.stopped ) throw [ 'stopped intention', this.predicate ];

      // Check if plan is applicable
      if ( planClass.isApplicableTo( this.predicate ) ) {
        // We instantiate the plan
        this.#current_plan = new planClass(this.#parent);
        //this.log('achieving intention', this.predicate, 'with plan', planClass.name);
        
        // Now we can execute the plan
        try {
          const plan_res = await this.#current_plan.execute( this.predicate );
          //this.log( 'succesful intention', this.predicate, 'with plan', planClass.name, 'with result:', plan_res );
          return plan_res
        // If we fail we can catch any error
        } catch (error) {
          //this.log( 'failed intention', this.predicate,'with plan', planClass.name, 'with error:', error );
        }
      }
    }

    //  If intention is stopped we throw a stopped intention
    if ( this.stopped ) throw [ 'stopped intention', this.predicate ];

    // No plans satisfy this intention
    throw ['no plan satisfied the intention ', this.predicate ]
  }
}

export {Intention};