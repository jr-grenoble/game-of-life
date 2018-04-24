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
import eternalｰconfig from "./eternalｰconfig.js";

const { effects, tiles, surroundings } = eternalｰconfig;

let config, log; // config and log come from the view via the controller

export default class eternalｰmodel {
    constructor ( logger, configｰdata ) {
            config = configｰdata;
            log = logger;
            log ( "model initialized" );
            }
    static get maxw () { return config.data.geometry.maxw; }
    static get maxh () { return config.data.geometry.maxh; }
    static get width () { return config.data.geometry.width; }
    static get height () { return config.data.geometry.height; }
    // static index ( x, y ) { return x * config.data.geometry.maxh + y; }
    // Chebyshev distance (Moore neighborhood) dc ((x0,y0), (x1,y1)) = max(|x1-x0|,|y1-y0|)
    // Manhattan distance (Von Neumann neighborhood) dm ((x0,y0), (x1,y1)) = sum(|x1-x0|,|y1-y0|)
    static neighbors ( x0, y0 ) {
            // returns [ { x, y } | distance ( { x, y }, { x0, y0 } ) ≤ range )]
            return x0 - y0;
            }
    static nextｰstate ( state, newｰstate ) {
            //
            const {
                vicinity, range, born, survive,

                maxh, maxw, height, width,

                bottom, left, right, top
                } = state;

            for (
                let x = 0;
                x < state.width;
                x++
                ) for (
                    let y = 0;
                    y < state.height;
                    y++
                    ) {
                    // compute new state
                    }

            log ( state.length );
            return newｰstate;
            }
    }
