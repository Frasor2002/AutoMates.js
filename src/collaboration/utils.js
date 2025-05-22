import { client } from "../connection/connection.js";
import { generateOptions, filterOptions } from "../intent/utils.js";

const templates = {
  // Handshake message templates
  HANDSHAKE_START_TEMPLATE: "HANDSHAKE start",
  HANDSHAKE_ACK_TEMPLATE: "HANDSHAKE acknowledge",
  // Inform message templates
  INFORM_STATE_TEMPLATE: "INFORM state",
  INFORM_INTENT_TEMPLATE: "INFORM intent",
  INFORM_INTENT_OK_TEMPLATE: "INFORM ok",
  INFORM_INTENT_CHANGE_TEMPLATE: "INFORM change"
};


/**
 * Handle option generation and intentions in multi agent case
 * @param {Object} bs belief set
 * @param {Object} fi friend info
 */
async function multiOptionHandling(agent, bs, fi){
  // First we generate our options from the belief set
  agent.options = generateOptions(bs); // This are only options of solo case we may have different in multi
  //console.log(agent.options);
  // Option filtering
  agent.bestOption = filterOptions(agent.options);
  
  // Now we must reach an agreement if our best option is ok or to change
  // Let's assign a temporary role based on score or if equal the name of the agent
  let role = "Proposer";
  if(fi.score == bs.me.score){ // If same score choose on id
    // We assume always different ids to avoid conflicts
    if(bs.me.id > fi.id){
      role = "Evaluator";
    }
  }else if(bs.me.score > fi.score){
    role = "Evaluator";
  }


  // Now the proposer asks if the best intention found is ok
  // The evaluator will replying saying if proposer needs to change intention or not
  if(role == "Proposer"){
    const myBestOption = {msg: templates.INFORM_INTENT_TEMPLATE, intent: agent.bestOption};
    const reply = await client.emitAsk(fi.id, myBestOption);
    // depending on reply we change intent or not
    console.log(reply)
    if(reply.msg == templates.INFORM_INTENT_CHANGE_TEMPLATE){
      console.log("I will change my intent")
      agent.options.splice(agent.options.indexOf(agent.bestOption), 1);
      agent.bestOption = filterOptions(agent.options);
    }
  }
  // Push best option
  agent.intentionRevision.push(agent.bestOption);


}

/**Given two best options from the agents we need to compare them to check if something must be changed.
 * @param {Object} bo1 best option of agent 1
 * @param {Object} bo2 best option of agent 2
 */
function compareBestOptions(bo1, bo2){
  const result = {change1: false, change2: false};

  // If both options have the same type
  if(bo1.type == bo2.type){
    // pickUp conflict
    if(bo1 == "pickUp" && (bo1.target.id == bo2.target.id || 
      (bo1.target.x == bo2.target.x && bo1.target.y == bo2.target.y))){
      // Decide who must change intention
      if (bo1.priority > bo2.priority) {
        result.change2 = true;
      } else if (bo2.priority > bo1.priority) {
        result.change1 = true;
      } else {
        // Equal priority -> random choice
        const random = Math.random() > 0.5;
        result.change1 = random;
        result.change2 = !random;
      }
      return result;
    }

    // deliver conflict
    if(bo1.type == "deliver" && bo1.target.x == bo2.target.x && bo1.target.y == bo2.target.y){
      // Decide who must change intention
      if (bo1.priority > bo2.priority) {
        result.change2 = true;
      } else if (bo2.priority > bo1.priority) {
        result.change1 = true;
      } else {
        // Equal priority -> random choice
        const random = Math.random() > 0.5;
        result.change1 = random;
        result.change2 = !random;
      }
      return result;
    }
  }

  return result;
}

export {templates, multiOptionHandling, compareBestOptions};