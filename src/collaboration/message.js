import { client } from "../connection/connection.js";
import { templates } from "./utils.js";

// File containing function to communicate between agents

/**Send mental state of the agent with a common format to teammate ù
 * @param {Object} friendInfo information on teammate
 * @param {Object} state mental state of the agent
*/
async function sendState(friendInfo, state){
  await client.emitSay(friendInfo.id, {
    msg: templates.INFORM_STATE_TEMPLATE,
    state: state
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


export {sendState, receiveMessage};