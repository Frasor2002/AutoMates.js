// Demo agent script

// Collect configuration of game
//client.onConfig( (c) => {console.log(c)})
// Collect information of yourself
//client.onYou( you => {console.log(you)})
// Collect information of agents
//client.onAgentsSensing( agents => console.log(agents))
//Collect parcel information
//client.onParcelsSensing( parcels => console.log(parcels))
// Collect map
//client.onMap((i,j, matrix)  => console.log(i, j ,matrix))
// Collect all tiles information
//client.onTile(tile => console.log(tile))

/**
 * Demo agent loop to try the API
 * @param {object} client 
 */
async function agentLoop (client) {

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