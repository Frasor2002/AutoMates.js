import { myBelief } from "./belief/sensing.js";
import {IntentionRevision} from "./intent/intention_revision.js"
import { optionGeneration } from "./intent/options.js";

class Agent {
  belief = myBelief;
  intentionRevision = new IntentionRevision();

  async run() {
    this.intentionRevision.loop();

    setInterval(optionGeneration, 100);
  }
}

// Instantiate agent class
const agent = new Agent();


export {agent};