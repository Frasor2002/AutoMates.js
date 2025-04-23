/*File to collect env variables*/
const envArgs = {
  host: process.env.HOST,
  token: process.env.TOKEN,
};

// Check that all envArgs are initialized
Object.keys(envArgs).forEach(key => {
  if (!envArgs[key]) {
    throw new Error(`Missing required parameter: ${key}`);
  }
});


export {envArgs}