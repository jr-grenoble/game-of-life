/**
 * Configuration handling for eternal life game
 *
 * We store configuration in local storage, using JSON format.
 * Instead of storing individual values, we bucket them together
 * so that the model can set and get its data in one go,
 * the view in another go, a.s.o.
 * @module eternalｰconfig.js
 */

// shortcuts
const objectǃ = ( ...objects ) => Object.assign ( {}, ...objects );  // eslint-disable-line no-restricted-properties
const assignꔛ = Object.assign; // eslint-disable-line no-restricted-properties
const freezeꔛ = Object.freeze; // eslint-disable-line no-restricted-properties
const keysǃ = o => o.keys ? [ ...o.keys () ] : Object.keys ( o ); // eslint-disable-line no-restricted-properties
const storage = localStorage;

/**
 * The `config` object is a singleton
 */


/* dictionary of singleton configurations, accessed by bucket name */
const configurations = {};

class configuration {
    constructor ( bucket, defaults = {} ) {
            this.bucket = bucket;
            this.data = objectǃ ( defaults, JSON.parse ( storage.getItem ( bucket ) ) );
            freezeꔛ ( this );
            }

    /**
     * `load` fetches the content of a bucket from local storage and fills the corresponding
     * singleton object with its values; default values can supplement what is retrieved
     * from local storage, but locally stored values have priority.
     *
     * The `store method` will write these values back to local storage.
     * @param {Object} [defaults] - default values that get overriden by stored values
     */
    load ( defaults = {} ) { assignꔛ ( this.data, defaults, JSON.parse ( storage.getItem ( this.bucket ) ) ); }

    /**
     * `defaults` adds default value to the configuration, without overwriting existing values,
     * and saves the result back to local storage.
     *
     * @param {Object} [defaults] - default values that get overriden by stored values
     */
    defaults ( defaults ) { storage.setItem ( this.bucket, JSON.stringify ( assignꔛ ( this.data, defaults, this.data ) ) ); }

    /**
     * `store` writes the content of a bucket to local storage. It takes its input from the
     * singleton object corresponding to the bucket and blends them with new attributes if present.
     * The new attributes override existing values in the bucket
     * @param {Object} [attributes] - new attributes that override existing values from the bucket
     */
    store ( attributes = {} ) { storage.setItem ( this.bucket, JSON.stringify ( assignꔛ ( this.data, attributes ) ) ); }

    /**
     * `destructor` empties a bucket and also erases its content in local storage.
     * The corresponding configuration is no longer accessible
     */
    destructor () { storage.removeItem ( this.bucket ); delete configurations [ this.bucket ]; }
    }

export default class eternalｰconfig {
    // the constructor always returns the same singleton config, ensuring only one config can exist
    constructor ( bucket, defaults = {} ) {
            if ( bucket in configurations ) configurations [ bucket ].defaults ( defaults );
            else configurations [ bucket ] = new configuration ( bucket, defaults );
            return configurations [ bucket ];
            }
    // common constants (enums)
    static get effects () { return freezeꔛ ( { drop: "drop", top: "top", right: "right", bottom: "bottom", left: "left" } ); }
    static get tiles () { return freezeꔛ ( { hexagon: "hexagon", square: "square", triangle: "triangle" } ); }
    static get surroundings () { return freezeꔛ ( { moore: "Moore", vonｰneumann: "Von Neumann" } ); }
    static key ( enums, value ) { return keysǃ ( enums ).filter ( key => enums [ key ] === value ) [ 0 ]; }
    }
