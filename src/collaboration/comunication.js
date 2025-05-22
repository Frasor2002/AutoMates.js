import { client } from "../connection/connection.js";
import { myBelief } from "../belief/sensing.js";
import { simpleEncription, simpleDecription, checkMessage } from "./encription.js";
import { templates, multiOptionHandling, compareBestOptions } from "./utils.js";
import { agent } from "../agent.js";
import { filterOptions } from "../intent/utils.js";

// Save the data of our teammate
let friendInfo = {};

/**Send mental state of the agent with a common format to teammate ù
 * @param {Object} friendInfo information on teammate
 * @param {Object} state mental state of the agent
*/
async function sendState(friendInfo, state){
  await client.emitSay(friendInfo.id, {
    msg: templates.INFORM_STATE_TEMPLATE,
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
  // Here we save options and bestOption of the current agent
  let options = [];
  let bestOption;

  // Check message is from teammate and if its a correct INFORM
  if(id === friendInfo.id && checkMessage(msg, templates.INFORM_STATE_TEMPLATE)){
    // Get score from teammate
    friendInfo.score = msg.state.me.score;
    //console.log("INFORM from", name);
    //console.log(msg);
    // Merge belief states
    myBelief.merge(msg.state);

    // Here we merge bs
    // Compute options for me and other agent
    // compare best options and decide how to coordinate
    // if both idle ok
    // if both deliver if the delivery is different ok
    // if both delivery and the delivery is the same change deliver for lower priority (if same sum name characters and higher changes)
    // if both pickup different parcel ok
    // if both pickup same decide on priority if same decide on sum of name
    // if no spawn or no delivery => alleway logic

    // Check if we are in alleyway case
    const tiles = myBelief.map.filterReachableTileLists(myBelief.me);
    //console.log(tiles.spawnTiles, tiles.deliveryTiles)
    //console.log(tiles.spawnTiles.length === 0, tiles.deliveryTiles.length === 0)
    if(tiles.spawnTiles.length === 0 || tiles.deliveryTiles.length === 0){
      console.log("Alleyway case!")
    } else { // Normal case
      await multiOptionHandling(agent, myBelief, friendInfo);
    }


  } else if(reply && id === friendInfo.id && checkMessage(msg, templates.INFORM_INTENT_TEMPLATE)){
    // Here is the Evaluator that will tell the proposer if the option must be changed or not
    const res = compareBestOptions(msg.intent, agent.bestOption);
    //console.log(msg, res);
    if(res.change1){ // Other agent needs to change intention
      console.log(friendInfo.name + "needs to change intent");
      const response = {msg: templates.INFORM_INTENT_CHANGE_TEMPLATE};
      try{ reply(response) } catch{ (err) => console.error(err) };
    }else if(res.change2){
      console.log("I will change intent")
      // Let's update our bestOption not to cause conflict
      agent.options.splice(agent.options.indexOf(agent.bestOption), 1);
      agent.bestOption = filterOptions(agent.options);

      const response = {msg: templates.INFORM_INTENT_OK_TEMPLATE};
      try{ reply(response) } catch{ (err) => console.error(err) }
    }else{
      console.log("Nobody has to change intent")
      const response = {msg: templates.INFORM_INTENT_OK_TEMPLATE};
      try{ reply(response) } catch{ (err) => console.error(err) }
    }
  }
});


export {handshake, friendInfo, sendState};