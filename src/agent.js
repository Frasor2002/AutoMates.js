import { myBelief } from "./belief/sensing.js";
import {IntentionRevision} from "./intent/intention_revision.js"
import { optionHandling } from "./intent/options.js";
import { handshake, friendInfo } from "./collaboration/comunication.js";
import { envArgs } from "./connection/env.js";

class Agent {
  belief = myBelief;
  options = [];
  bestOption;
  intentionRevision = new IntentionRevision();
  
  async run() {
    // Wait for connection
    console.log("Waiting for game to start...");
    while(!this.belief.me.id){
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
    let interval = 50;
    if(envArgs.mode=="multi"){
      interval = 100;
    }
    setInterval(optionHandling, interval);

    //setInterval(() => console.log("Penalty", this.belief.me.penalty), 2000);

  }

}

// Instantiate agent class
const agent = new Agent();


export {agent};