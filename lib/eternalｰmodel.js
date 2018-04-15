/*
 * MVC model for eternal life game
 *
 * The model records the current state of the game, as well as past state.
 * It can export and import such states.
 * It allows to go to the next state and reports the new state as a delta.
 * It can import a delta state and merge it with the current state.
 *
 * It accepts different sets of rules and it can transition to new rules on the fly.
 *
 */

// usual shortcuts

// const log = ( ...args ) => console.log ( ...args ); // eslint-disable-line no-console
// const ᒪxᒧ = x => Math.floor ( parseInt ( x, 10 ) ); // eslint-disable-line no-restricted-properties
// const assignꔛ = Object.assign; // eslint-disable-line no-restricted-properties
// const freezeꔛ = Object.freeze; // eslint-disable-line no-restricted-properties
// const propertyꔛ = Object.defineProperty; // eslint-disable-line no-restricted-properties
// const propertiesꔛ = Object.defineProperties; // eslint-disable-line no-restricted-properties

// ==| Configuration |=========================================================

let config; // config comes from the view via the controller

export default class eternalｰmodel {
    constructor ( log, configｰdata ) {
            config = configｰdata;
            this.log = log;
            log ( "model initialized" );
            }
    get width () { return config.data.geometry.width; }
    get height () { return config.data.geometry.height; }
    }
