import { client } from '../connection/connection.js';
import {createAgreedPath, compareBestOptions} from './utils.js'
import { generateOptions, filterOptions } from '../intent/utils.js';
import { aStar } from '../intent/astar.js';
import { getIdleTarget } from "../plan/utils.js";
import { templates } from './utils.js';
import { checkAlleyway, solveAlleyway } from './alleyway.js';


/**
 * Handle an INFORM message by merging belief and then acting differently if in alleyway or
 * usual case
 * @param {Object} agent object of the agent
 * @param {Object} bs belief set
 * @param {Object} msg message
 * @param {Object} fi friend information
 */
async function handleInformMsg(agent, bs, msg, fi){
  // Merge belief states
  bs.merge(msg.state);
  // Check if we are in alleyway case
  if(checkAlleyway(bs.me, msg.state.me, bs)){
    solveAlleyway(agent, bs, {x: msg.state.me.x, y: msg.state.me.y});
  } else { // Normal case
    await multiOptionHandling(agent, bs, fi);
  }
}


/**
 * Handle option generation and intentions in multi agent case
 * @param {Object} agent reference to push options
 * @param {Object} bs belief set
 * @param {Object} fi friend info
 */
async function multiOptionHandling(agent, bs, fi){
  // Reach an agreement if our best option is ok or to change
  // Let's assign a temporary role based on the name of the agent
  let role = "Proposer";

  if(bs.me.name > fi.name){
    role = "Evaluator";
  }


  // First we generate our options from the belief set
  agent.options = generateOptions(bs); // This are only options of solo case we may have different in multi

  // Since an agreement between paths must be reached, decide before the target of our idle
  for(let o of agent.options){
    if(o.type == "idle"){
      o.target = getIdleTarget(bs);
    }
  }


  // Option filtering
  agent.bestOption = filterOptions(agent.options);
  //console.log(role)

  // Now the proposer asks if the best intention found is ok
  // The evaluator will replying saying if proposer needs to change intention or not
  // Check that I finished my intention before starting another
  if(role == "Proposer" && agent.intentionRevision.intentionQueue.length < 1){
    const myBestOption = {msg: templates.INFORM_INTENT_TEMPLATE, intent: agent.bestOption};
    const reply = await client.emitAsk(fi.id, myBestOption);

    if(reply !== "timeout"){ // Check that the arrived reply is not a timeout
      // Depending on reply we decide to change intent or not
      if(reply.msg == templates.INFORM_INTENT_CHANGE_TEMPLATE && agent.options.length > 1){
        //console.log("I will change my intent")
        // We will take the second best intent
        agent.options.splice(agent.options.indexOf(agent.bestOption), 1);
        agent.bestOption = filterOptions(agent.options);

      }

      // We have to create a path in agreement with the one that we are given
      if(!reply.path){
        reply.path = [];
      }
      const agreedPath = createAgreedPath(bs.me, reply.start, reply.path, 
        agent.bestOption.target, bs);
      if(agreedPath.length == 0){
        agent.bestOption.target = {x: bs.me.x, y: bs.me.y}
        agent.bestOption.type = "moveTo"
      }
      agent.bestOption.path = agreedPath;
      // Push best option
      //console.log("Proposer best:", agent.bestOption.path)
      //console.log(agent.bestOption)
      agent.intentionRevision.push(agent.bestOption);
    }
  }
}

/**
 * Evaluator tells proposer if intention is ok or not and gives its path
 * @param {Object} agent agent object of evaluator
 * @param {Object} bs belief set
 * @param {Object} msg msg object from proposer
 * @param {Object} reply object to reply to proposer 
 */
function evaluatorResponds(agent, bs, msg, reply){
  // Synchronize with friend intentions
  if(agent.intentionRevision.intentionQueue.length > 0){
    agent.intentionRevision.intentionQueue[0].stop();
  }
  // Here is the Evaluator that will tell the proposer if the option must be changed or not
  const res = compareBestOptions(msg.intent, agent.bestOption);

  let response;
  if(res.change1){ // Other agent needs to change intention
    //console.log(friendInfo.name + "needs to change intent");
    response = {msg: templates.INFORM_INTENT_CHANGE_TEMPLATE};
  }else if(res.change2){
    //console.log("I will change intent");
    // Let's update our bestOption not to cause conflict
    if(agent.bestOption.type == "idle"){ // To change an idle change the target simply
      while(agent.bestOption.target.x == msg.intent.target.x || 
        agent.bestOption.target.y == msg.intent.target.y
      ){
        agent.bestOption.target = getIdleTarget(bs);
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
  const path = aStar(bs.me, agent.bestOption.target, bs.map);
  if(!path){
    agent.bestOption.path = [];
  } else {
    agent.bestOption.path = path;
  }

  response.path = path;
  response.start = {x: bs.me.x, y: bs.me.y};

  // Reply to the Proposer
  try{ reply(response) } catch{ (err) => console.error(err) };
  // Push best option
  agent.intentionRevision.push(agent.bestOption);
  
}


export {handleInformMsg, multiOptionHandling, evaluatorResponds};