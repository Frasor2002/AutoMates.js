import { myBelief } from "./belief/sensing.js";
import {IntentionRevision} from "./intent/intention_revision.js"
import { optionGeneration } from "./intent/options.js";
import { handshake, friendInfo, sendState} from "./collaboration/comunication.js";
import { envArgs } from "./connection/env.js";

class Agent {
  belief = myBelief;
  intentionRevision = new IntentionRevision();
  
  async run() {
    // Wait for connection
    while(!this.belief.me.id){
      console.log("Waiting for game to start...");
      await new Promise(res => setImmediate(res));
    }

    // If we are in multiagent mode, perform the handshake
    if(envArgs.mode === "multi"){
      console.log(this.belief.me.name, "is waiting for other agent to connect...");
      const result = await handshake().catch((err) => console.error(err));
      if(result){
        console.log("Handsake success! My mate is ", friendInfo.name );
      } else {
        console.error("Handshake failed");
        process.exit(1);
      }
    }
    
    // Intention revision loop
    this.intentionRevision.loop();

    // Option generation
    setInterval(optionGeneration, 500);

    
    // If in multiagent case, send beliefset to teammate
    if(envArgs.mode == "multi"){
      setInterval(async () => {await sendState(friendInfo, myBelief)}, 500);
      // Check if nothing is coming, no longer do multi
    }
  }
}

// Instantiate agent class
const agent = new Agent();


export {agent};