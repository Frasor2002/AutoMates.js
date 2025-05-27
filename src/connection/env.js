/*File to collect env variables*/

/**envArgs:
 * host: the host of the game, can either be localhost or a web server
 * token: the token to play the game with to decide the player
 * usePDDL: set if PDDL is used for plans or not, by default we dont use it
 * logger: set if we want to activate the logger, a '.logs' folder must be created
 * mode: the game is played either by a "solo" agent or a "multi" agent system
 * secretKey: key for encrypting hanshake message
 */
const envArgs = {
  host: process.env.HOST,
  token: process.env.TOKEN,
  usePDDL: process.env.USE_PDDL === "true",
  logger: process.env.LOGGER === "true",
  mode: process.env.MODE || "solo",
  secretKey: Number(process.env.SECRET_KEY) || 5
};

// Mandatory args
const requiredArgs = ["host", "token"]

// Check that all envArgs are initialized
Object.keys(envArgs).forEach(key => {
  if (requiredArgs.includes(key) && !envArgs[key]) {
    throw new Error(`Missing required parameter: ${key.toUpperCase()}`);
  }
});


export {envArgs}