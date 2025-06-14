// Implementation of ceasar cypher to protect from others reading first hanshake message

/**
 * Simple Ceasar cypher enchription for simulating a more complex security module
 * @param {String} text text to encode
 * @param {Number} key key to encode the text
 * @returns encoded text
 */
function simpleEncription(text, key = 5) {
  return text.split('')
    .map(char => String.fromCharCode(char.charCodeAt(0) + key))
    .join('');
}

/**
 * Decypher previously encoded text
 * @param {*} text text to decode
 * @param {*} key key to decode the text with
 * @returns decoded text
 */
function simpleDecription(text, key = 5) {
  return text.split('')
    .map(char => String.fromCharCode(char.charCodeAt(0) - key))
    .join('');
}

/**
 * Compare two messages verifying that a given template is respected
 * @param {Object} received received message
 * @param {String} template template to test
 * @returns boolean totell if message respects template or not
 */
function checkMessage(received, template){
  const content = received.msg.split(" ");
  const temp_content = template.split(" ");
  
  // First check if arrays have same length
  if (content.length !== temp_content.length) {
    return false;
  }
  
  // Then compare each element
  for (let i = 0; i < content.length; i++) {
    if (content[i] !== temp_content[i]) {
      return false;
    }
  }

  return true;
  
}

export {simpleEncription, simpleDecription, checkMessage};