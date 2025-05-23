import { agent } from "./agent.js";


/**Main function */
async function main() {
  await agent.run();
}


main()
.catch( (err) => {console.error(err);})