import { client } from "../connection/connection.js";
//import { myBelief } from "../belief/sensing.js";
import { agent } from "../agent.js";
import { simpleEncription, simpleDecription, checkMessage } from "./encription.js";
import { templates } from "./utils.js";
import { delivererActs } from "./alleyway.js";
import { handleInformMsg, evaluatorResponds } from "./multioption.js";
import { receiveMessage } from "./message.js";
import { myBelief } from "../belief/sensing.js";

// Save the data of our teammate
let friendInfo = {};



/** Handshake protocol to connect the two agents */
async function handshake() {

  await new Promise(resolve => setTimeout(resolve, 50));
  
  // Broadcast handshake to everyone
  client.emitShout({
    msg: simpleEncription(templates.HANDSHAKE_START_TEMPLATE),
  });

  // Now we wait for next message from other agent
  let receivedFirst = false;
  while(!receivedFirst){
    // Receive a message
    const data = await receiveMessage(client);
    // Unpack the data
    const senderInfo = {name: data.name, id: data.id};
    const msg = data.msg;

    if(!msg.safe){ // If message is broadcasted we decrypt it
      msg.msg = simpleDecription(msg.msg);
    }
    
    // Check the message is the one we are waiting for
    if(checkMessage(msg, templates.HANDSHAKE_START_TEMPLATE)){
      receivedFirst = true;
      // Save friendId
      friendInfo = senderInfo;
      // Acknowledgement response
      // Set safe since we do not need encryption
      await client.emitSay(friendInfo.id, {
        msg: templates.HANDSHAKE_ACK_TEMPLATE,
        safe: true
      });
    } else if(checkMessage(msg, templates.HANDSHAKE_ACK_TEMPLATE)){
      receivedFirst = true;
      friendInfo = senderInfo;
    }
  }
  return true;
}


// Listen to messages from the teammate here
client.onMsg(async (id, name, msg, reply) => {
  if(id === friendInfo.id && name == friendInfo.name){
    // Check message is a correct INFORM state
    if(checkMessage(msg, templates.INFORM_STATE_TEMPLATE)){
      await handleInformMsg(agent, myBelief, msg, friendInfo);
    } 
    // Message INFORM intent
    else if(reply && checkMessage(msg, templates.INFORM_INTENT_TEMPLATE)){
      // Evaluator responds to proposer
      evaluatorResponds(agent,myBelief, msg, reply);
    }
    // Message that tells that other agent stopped intention, need to stop and find a new path
    else if(checkMessage(msg, templates.STOP_INTENTION_TEMPLATE)){
      if(agent.intentionRevision.intentionQueue.length > 0){
        agent.intentionRevision.intentionQueue[0].stop();
      }
    }
    // Respond to message for alleyway
    else if(reply && checkMessage(msg, templates.ALLEWAY_ACTION_TEMPLATE)){
      // Deliverer receives an order
      delivererActs(agent, msg, reply);
    }
  }
  
});

export {handshake, friendInfo};