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
const freezeꔛ = Object.freeze; // eslint-disable-line no-restricted-properties
// const propertyꔛ = Object.defineProperty; // eslint-disable-line no-restricted-properties
// const propertiesꔛ = Object.defineProperties; // eslint-disable-line no-restricted-properties

// ==| Configuration |=========================================================

import eternalｰconfig from "./eternalｰconfig.js";

const sides = freezeꔛ ( { top: "top", right: "right", bottom: "bottom", left: "left" } );
const effects = freezeꔛ ( { bounce: "bounce", drop: "drop", teleport: "teleport" } );

const defaults = {
    geometry: {
        width: null,
        height: null,
        top: { effect: effects.teleport, side: sides.bottom },
        right: { effect: effects.bounce, side: sides.left },
        bottom: { effect: effects.drop, side: sides.top },
        left: { effect: effects.bounce, side: sides.left }
        }
    };

const config = new eternalｰconfig ( "model", defaults );

export default class eternalｰmodel {
    constructor ( log ) {
            this.log = log;
            log ( "model initialized" );
            }
    set width ( width ) { config.data.geometry.width = width; }
    set height ( height ) { config.data.geometry.height = height; }
    }
