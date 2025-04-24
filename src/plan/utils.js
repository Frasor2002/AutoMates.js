import fs from "fs";

/**
 * Function to read a file for PDDL
 * @param {*} path 
 * @returns 
 */
function readFile ( path ) {
  return new Promise( (res, rej) => {
    fs.readFile( path, 'utf8', (err, data) => {
      if (err) rej(err)
      else res(data)
    })
  })

}


export {readFile};