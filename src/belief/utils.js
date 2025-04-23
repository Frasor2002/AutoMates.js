/**Utility functions for belief class*/

/**
 * Convert a string in config file to milliseconds
 * @param {String} str 
 * @returns number of milliseconds
 */
function stringToMillisec(str) {
  if (str == "infinite") {
    return Number.MAX_VALUE;
  }
    return parseInt(str.slice(0, -1)) * 1000;
}


export {
  stringToMillisec
};