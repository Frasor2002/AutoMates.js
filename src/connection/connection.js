/**File to handle connection to the game */
import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import { envArgs } from "./env.js";

const client = new DeliverooApi(envArgs.host, envArgs.token);

export {client};