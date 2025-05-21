import { client } from "../connection/connection.js";
import { myBelief } from "../belief/sensing.js";
import { simpleEncription, simpleDecription, checkMessage } from "./encription.js";

// Save the data of our teammate
let friendInfo = {};


// Handshake messages templates
const HANDSHAKE_START_TEMPLATE = "HANDSHAKE start";
const HANDSHAKE_ACK_TEMPLATE = "HANDSHAKE acknowledge";
// Inform message templates
const INFORM_TEMPLATE = "INFORM";

/**Send mental state of the agent with a common format to teammate ù
 * @param {Object} friendInfo information on teammate
 * @param {Object} state mental state of the agent
*/
async function sendState(friendInfo, state){
  await client.emitSay(friendInfo.id, {
    msg: "INFORM",
    state: state,
    time: myBelief.time.ms
  });
}


/**Create a promise in order to receive message from other agent
 * @returns Promise containing message received
 */
function receiveMessage(){
  return new Promise((res) => {
    client.onMsg((id, name, msg) => {
      res({
        id: id,
        name: name,
        msg: msg
      });
    });
  });
}


/** Handshake protocol to connect the two agents */
async function handshake() {

  await new Promise(resolve => setTimeout(resolve, 50));
  
  // Broadcast handshake to everyone
  client.emitShout({
    msg: simpleEncription(HANDSHAKE_START_TEMPLATE),
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
    if(checkMessage(msg, HANDSHAKE_START_TEMPLATE)){
      receivedFirst = true;
      // Save friendId
      friendInfo = senderInfo;
      // Acknowledgement response
      // Set safe since we do not need encryption
      await client.emitSay(friendInfo.id, {
        msg: HANDSHAKE_ACK_TEMPLATE,
        safe: true
      });
    } else if(checkMessage(msg, HANDSHAKE_ACK_TEMPLATE)){
      receivedFirst = true;
      friendInfo = senderInfo;
    }
  }
  return true;
}


// Listen to messages from the teammate here
client.onMsg((id, name, msg, reply) => {
  // Check message is from teammate and if its a correct INFORM
  if(id === friendInfo.id && checkMessage(msg, INFORM_TEMPLATE)){
    console.log("INFORM from", name);
    console.log(msg);
    // Here we merge bs
    // Compute options for me and other agent
    // compare best options and decide how to coordinate
    // if both idle ok
    // if both deliver if the delivery is different ok
    // if both delivery and the delivery is the same change deliver for lower priority (if same sum name characters and higher changes)
    // if both pickup different parcel ok
    // if both pickup same decide on priority if same decide on sum of name
    // if no spawn or no delivery => alleway logic
  }
});


export {handshake, friendInfo, sendState};