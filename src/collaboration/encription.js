// Implementation of ceasar cypher to protect from others reading first hanshake message

function simpleEncription(text, key = 5) {
  return text.split('')
    .map(char => String.fromCharCode(char.charCodeAt(0) + key))
    .join('');
}

function simpleDecription(text, key = 5) {
  return text.split('')
    .map(char => String.fromCharCode(char.charCodeAt(0) - key))
    .join('');
}


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