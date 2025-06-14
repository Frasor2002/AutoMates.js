import { agent } from "./agent.js";


/**Main function */
async function main() {
  // Run agent loop
  await agent.run();
}

// Catch main errors
main()
.catch( (err) => {console.error(err);})