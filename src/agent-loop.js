import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";

/**
 * Demo agent loop to try the API
 * @param {String} host url of the host
 * @param {String} token token to access the game
 */
async function agentLoop (host, token) {
  const client = new DeliverooApi(host, token);
  var previous = 'right'

  while ( true ) {
    await client.emitPutdown();
    await client.emitPickup();

    let tried = [];

    while ( tried.length < 4 ) {
        let current = { up: 'down', right: 'left', down: 'up', left: 'right' }[previous] // backward
        if ( tried.length < 3 ) { // try haed or turn (before going backward)
            current = [ 'up', 'right', 'down', 'left' ].filter( d => d != current )[ Math.floor(Math.random()*3) ];
        }
        if ( ! tried.includes(current) ) {
            if ( await client.emitMove( current ) ) {
                console.log( 'moved', current );
                previous = current;
                break; // moved, continue
            }
            tried.push( current );
        }
    }
    if ( tried.length == 4 ) {
        console.log( 'stucked' );
        await new Promise(res=>setTimeout(res,1000)); // stucked, wait 1 sec and retry
    }
  }
}


export {agentLoop};