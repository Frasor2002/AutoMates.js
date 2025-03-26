import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import { agentLoop } from "./demo-agent.js";

var parameters = {
  host: process.env.HOST,
  token: process.env.TOKEN
}

const client = new DeliverooApi(parameters.host, parameters.token);

agentLoop(client);