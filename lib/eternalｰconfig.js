/**
 * Configuration handling for eternal life game
 *
 * We store configuration in local storage, using JSON format.
 * Instead of storing individual values, we bucket them together
 * so that the model can set and get its data in one go,
 * the view in another go, a.s.o.
 * @module eternalｰconfig.js
 */


const mathｰutilities = { // Mathematical constants and functions

    // MATH infinity - always use +ထ and -ထ
    // eslint-disable-next-line no-restricted-syntax
    ထ: Infinity,

    // MATH number π
    // eslint-disable-next-line no-restricted-properties
    π: Math.PI,

    // MATH integer part of x
    // eslint-disable-next-line no-restricted-properties
    ᒪｘᒧ: x => Math.floor ( x ),

    // MATH minimum of a list of numbers
    // eslint-disable-next-line no-restricted-properties
    ᒷᐧᒲ: ( ...args ) => Math.min ( ...args ),

    // MATH maximum of a list of numbers
    // eslint-disable-next-line no-restricted-properties
    ᒯᐧᒬ: ( ...args ) => Math.max ( ...args ),

    // MATH clamp function, shaves x within [min,max]
    ᒥｘᒧ: ( x, min = 0, max = min + 1 ) => min < max ?
        ᒷᐧᒲ ( ᒯᐧᒬ ( x, min ), max ) :
        ᒷᐧᒲ ( ᒯᐧᒬ ( x, max ), min ),

    // MATH test for even
    // eslint-disable-next-line no-bitwise
    evenʔ̣: n => ( n & 1 ) === 0,

    // MATH test for odd
    // eslint-disable-next-line no-bitwise
    oddʔ̣: n => ( n & 1 ) !== 0,

    // MATH quotient of Euclidian division by 2
    // eslint-disable-next-line no-bitwise
    div2: n => n >> 1,

    // MATH remainder of Euclidian division by 2
    // eslint-disable-next-line no-bitwise
    rem2: n => n & 1,

    // MATH quotient of Euclidian division by 3
    div3: n => ( n - rem3 ( n ) ) / 3,

    // MATH remainder of Euclidian division by 3
    rem3: n => ( n % 3 + 3 ) % 3,

    // MATH quotient of Euclidian division by p
    div: p => n => ( n - rem ( p ) ( n ) ) / p,

    // MATH remainder of Euclidian division by p
    rem: p => n => ( n % p + p ) % p,

    // MATH euclidian division by p
    division: ( n, p ) => { const r = ( n % p + p ) % p; return [ ( n - r ) / p, r ]; }

    };
const { ᒷᐧᒲ, ᒯᐧᒬ, rem3, rem } = mathｰutilities;

const coordｰutilities = { // Functions that manipulate coordinates (unsigned 16-bit integers)

    // Turn x and y coordinates into a pair (array)
    pairǃ: ( x, y ) => [ x, y ],

    // Turn an [x,y] coordinates pair into a unique hash index, suitable for sets
    // eslint-disable-next-line no-bitwise
    pairｰᗒindex: ( [ x, y ] ) => ( x & 0xffff ) << 16 | y & 0xffff,

    // Unpack index into each coordinate separately
    // eslint-disable-next-line no-bitwise
    indexｰᗒx: index => index >>> 16,
    // eslint-disable-next-line no-bitwise
    indexｰᗒy: index => index & 0xffff,

    // Unpack index into a pair of coordinates
    indexｰᗒpair: index => [ indexｰᗒx ( index ), indexｰᗒy ( index ) ],

    // Shift a pair of coordinates by x and y
    shiftｰpair: ( x, y ) => ( [ i, j ] ) => [ x + i, y + j ],

    };
const { indexｰᗒx, indexｰᗒy } = coordｰutilities;

const generalｰutilities = { // Standard object and function manipulation

    // Merge multiple object properties into the first object target.
    // Call as assignꔛ ( target, ...sources );
    // eslint-disable-next-line no-restricted-properties
    assignꔛ: Object.assign,

    // Compose functions, e.g. composeǃ ( e, f, g ) ( args ) is the same as g ( f ( e ( args ) ) )
    composeǃ: ( ...functions ) => args => functions.reduceRight ( ( arg, fn ) => fn ( arg ), args ),

    // Prevent an object from being modified
    // eslint-disable-next-line no-restricted-properties
    freezeꔛ: Object.freeze,

    // Test whether an object is a function
    functionʔ̣: f => typeof f === "function",

    // Yield an array of the keys of an object (or indexes of an array)
    // eslint-disable-next-line no-restricted-properties
    keysǃ: o => o.keys ? [ ...o.keys () ] : Object.keys ( o ),

    // Create a new object with the properties from the list of source objects
    // eslint-disable-next-line no-restricted-properties
    objectǃ: ( ...objects ) => Object.assign ( {}, ...objects ),

    // Pipe functions, e.g. pipeǃ ( e, f, g ) ( args ) is the same as e ( f ( g ( args ) ) )
    pipeǃ: ( ...functions ) => args => functions.reduce ( ( arg, fn ) => fn ( arg ), args ),

    // Yield an array of the values contained in an object or array
    // eslint-disable-next-line no-restricted-properties
    valuesǃ: o => functionʔ̣ ( o.values ) ? [ ...o.values () ] : Object.values ( o ),

    };
const { assignꔛ, freezeꔛ, functionʔ̣, keysǃ, objectǃ } = generalｰutilities;

const storage = localStorage;
let listenerｰid = 0;

/**
 * The `configuration` object is a singleton
 */


/* dictionary of singleton configurations, accessed by bucket name */
const configurations = {};

class configuration {
    constructor ( bucket, defaults = {} ) {
            this.bucket = bucket;
            this.data = objectǃ ( defaults, JSON.parse ( storage.getItem ( bucket ) ) );
            this.listeners = {};
            freezeꔛ ( this );
            }

    /**
     * `listen` registers a listener to the listeners list; listeners get called whenever the config changes.
     *
     * @param {Function} listener - a parameterless function to be called when stored configuration changes.
     * @returns id - a symbol that can be used to stop listening by calling `ignore`
     */
    listen ( listener ) { this.listeners [ ++listenerｰid ] = listener; return listenerｰid; }

    /**
     * `ignore` deregisters a listener from the configuration store.
     *
     * @param {Symbol} id - an identifier previously returned by the `listen` method.
     */
    ignore ( id ) { delete this.listeners [ id ]; }

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
    store ( attributes = {} ) {
            storage.setItem ( this.bucket, JSON.stringify ( assignꔛ ( this.data, attributes ) ) );
            for ( const listener in this.listeners ) this.listeners [ listener ] ();
            }

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
    static get coordｰutilities () { return freezeꔛ ( coordｰutilities ); }
    static get generalｰutilities () { return freezeꔛ ( generalｰutilities ); }
    static get mathｰutilities () { return freezeꔛ ( mathｰutilities ); }
    }
