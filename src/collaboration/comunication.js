import { client } from "../connection/connection.js";
import { myBelief } from "../belief/sensing.js";
import { simpleEncription, simpleDecription, checkMessage } from "./encription.js";
import { templates, multiOptionHandling, compareBestOptions, checkAlleyway, solveAlleyway } from "./utils.js";
import { agent } from "../agent.js";
import { filterOptions } from "../intent/utils.js";
import { aStar } from "../intent/astar.js";
import { getIdleTarget } from "../plan/utils.js";

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

    // Merge belief states
    myBelief.merge(msg.state);

    // Check if we are in alleyway case
    if(checkAlleyway(myBelief.me, msg.state.me, myBelief)){
      solveAlleyway(agent, myBelief, {x: msg.state.me.x, y: msg.state.me.y});
    } else { // Normal case
      await multiOptionHandling(agent, myBelief, friendInfo);
    }


  } else if(reply && id === friendInfo.id && checkMessage(msg, templates.INFORM_INTENT_TEMPLATE)){
    // Here is the Evaluator that will tell the proposer if the option must be changed or not
    const res = compareBestOptions(msg.intent, agent.bestOption);

    //console.log(msg, res);
    let response;
    if(res.change1){ // Other agent needs to change intention
      //console.log(friendInfo.name + "needs to change intent");
      response = {msg: templates.INFORM_INTENT_CHANGE_TEMPLATE};
    }else if(res.change2){
      //console.log("I will change intent");
      // Let's update our bestOption not to cause conflict
      if(agent.bestOption.type == "idle"){ // To change an idle change the target simply
        while(agent.bestOption.target == msg.intent.target){
          agent.bestOption.target = getIdleTarget(myBelief);
        }
      } else {
        agent.options.splice(agent.options.indexOf(agent.bestOption), 1);
        agent.bestOption = filterOptions(agent.options);
      }
      response = {msg: templates.INFORM_INTENT_OK_TEMPLATE};
    }else{
      //console.log("Nobody has to change intent");
      response = {msg: templates.INFORM_INTENT_OK_TEMPLATE};
    }

    // Here we compute our path and send it to Proposer to reach an agreement on path
    const path = aStar(myBelief.me, agent.bestOption.target, myBelief.map);
    if(!path){
      agent.bestOption.path = [];
    } else {
      agent.bestOption.path = path;
    }
    //console.log(agent.bestOption)

    response.path = path;
    response.start = {x: myBelief.me.x, y: myBelief.me.y};

    // Reply to the Proposer
    try{ reply(response) } catch{ (err) => console.error(err) };
    // Push best option
    agent.intentionRevision.push(agent.bestOption);
  }
  else if(reply && id === friendInfo.id && checkMessage(msg, "plan")){
    // Deliverer receives an order
    agent.bestOption = {type: "planAlleyway", role: "deliverer",
      move:msg.move,
      reply: reply,
      priority: 1};
    

    agent.intentionRevision.push(agent.bestOption);
  }
});


export {handshake, friendInfo, sendState};