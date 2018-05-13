/* The eternal life application uses a typical model-view-controller scheme.
 *
 * This module is the MVC controller for the game.
 *
 * The model records the current state of the game, as well as past state.
 * It can export and import such states.
 * It allows to go to the next state and reports the new state as a delta.
 * It can import a delta state and merge it with the current state
 *
 * The view displays that state on a canvas.
 * It also keeps track of external events and user input.
 * It processes locally some user actions such as displaying or hiding the grid.
 *
 *
 * The controller initializes both the model and the view
 * and allows interaction with the user, such as:
 * - running and pausing the game
 * - changing the speed of the game
 * - going one step at a time
 * - saving the current state
 * - restoring previous states
 * - zooming in and out
 * - changing various display settings (grid, colors…)
 * - composing an initial state
 * - modifying the rules of the game
 *
 * The role of this module is to initialize the MVC and launch the application.
 * The controller is specific to both the model and the view (it knows their public interfaces)
 * It registers callbacks on the view to be notified of user interaction.
 */

import eternalｰmodel from "./eternalｰmodel.js";
import eternalｰview from "./eternalｰview.js";

const eternalｰcontroller = new class {
    //
    constructor () {
            this.view = new eternalｰview ();

            // Pass the model a live image of the view configuration data:
            // when the config changes, config fields change in the model too.
            this.model = new eternalｰmodel ( this.view.config );

            // Register reconfiguration callback from model on view:
            // when the config changes in a meaningful way, the model knows.
            this.view.config = eternalｰmodel.reconfig;

            // Pass neighborhood computation functions to the view:
            this.view.vicinities = eternalｰmodel.vicinities;
            this.view.flanks = eternalｰmodel.flanks;

            // Pass aliveʔ̣, breedǃ, chokeǃ, cycleǃ to the view:
            this.view.state = eternalｰmodel;

            // Ensure the model knows about any config changes that have occurred during initialization:
            eternalｰmodel.reconfig ();
            this.view.log ( "running…" );
            }
    };
