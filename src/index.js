import { agentLoop } from "./agent_loop.js";

/**Initialization function to collect environment variables
 * @returns {Object} options
 */
function initializeOptions() {
  // Initialize options from environment variables
  let options = {
    host: process.env.HOST,
    token: process.env.TOKEN,
  };

  // Check that all options are initialized
  Object.keys(options).forEach(key => {
    if (!options[key]) {
      throw new Error(`Missing required parameter: ${key}`);
    }
  });

  return options;
}

/**Main function */
async function main() {
  // Collect options
  const options = initializeOptions();

  // Start agent
  agentLoop(options.host, options.token)
}


main()
.catch( (err) => {console.error(err.message)})