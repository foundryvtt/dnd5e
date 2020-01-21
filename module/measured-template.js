import { DND5E } from "./config.js";

/**
 * Add Texture paths to DND5E CONFIG object
 */
DND5E.TEXTURES = {
    Acid: "systems/dnd5e/textures/acid.png",
    Bludgeoning: "systems/dnd5e/textures/bludgeoning.png",
    Cold: "systems/dnd5e/textures/cold.png",
    Fire: "systems/dnd5e/textures/fire.png",
    Force: "systems/dnd5e/textures/force.png",
    Lightning: "systems/dnd5e/textures/lightning.png",
    Necrotic: "systems/dnd5e/textures/necrotic.png",
    Piercing: "systems/dnd5e/textures/piercing.png",
    Poison: "systems/dnd5e/textures/poison.png",
    Psychic: "systems/dnd5e/textures/psychic.png",
    Radiant: "systems/dnd5e/textures/radiant.png",
    Slashing: "systems/dnd5e/textures/slashing.png",
    Thunder: "systems/dnd5e/textures/thunder.png", 
}

/**
 * A helper class for building MeasuredTemplates for 5e spells
 */
export class MeasuredTemplateSpell5e extends MeasuredTemplate {
    constructor(...args) {
        super(...args);
    }

    /**
     * Builds the data required for the template
     * @param {Object} spellData
     * @todo maybe throw an exception if no data?
     */
    static async prepareData(spellData) {
        if (!spellData) {
            return;
        }
        const user = game.user._id;
        const target = getProperty(spellData, "data.target");
        //const damage = getProperty(spellData, "data.damage");
    
        const templateShape = MeasuredTemplateSpell5e._getTemplateShape(target);
    
        if (!templateShape) {
            return;
        }
    
        const templateDimensions = MeasuredTemplateSpell5e._getTemplateDimensions(templateShape, target);
        //const templateTexture = this._getTemplateTexture(damage);
    
        if (!templateShape || !templateDimensions) {
            return;
        }
        
        return {
            t: templateShape.toLowerCase(),
            user: user,
            angle: templateDimensions.angle,
            distance: templateDimensions.distance,
            width: templateDimensions.width,
            //texture: templateTexture,
            direction: templateDimensions.direction,
            x: visualViewport.width / 2,
            y: visualViewport.height / 2,
            borderColor: "#000000",
            fillColor: game.user.color
        }  
    }
        
    /**
    * Returns a template shape for the provided target shape
    * @param {Object} target 
    */
    static _getTemplateShape(target) {
        
        switch (target.type) {
            case "none":
            case "self":
            case "creature":
            case "ally":
            case "enemy":
            case "object":
            case "space":
                break;
    
            case "radius":
            case "sphere":
            case "cylinder":
                return "circle";
    
            case "cone":
                return "cone";
    
            case "square":
            case "cube":
                return "rect";
    
            case "line":
            case "wall":
                return "ray";
    
            default:
                break;
        }
    }

    /**
     * For a given template shape and set of target data, return the dimensions the template should use during creation
     * @param {String} templateShape 
     * @param {Object} target 
     */
    static _getTemplateDimensions(templateShape, target) {
        const size = target.value;
    
        let angle,
            direction,
            distance,
            width;
    
        switch (templateShape) {
            case "rect":
                distance = width = size;
                direction = 45; //5e rect aoes are always cubes
                break;
    
            case "circle":
                distance = size;
                direction = 0;
                break;
            
            case "cone":
                distance = size;
                direction = 0;
                angle = 53.13;
                break;
            
            case "ray":
                distance = size;
                direction = 0;
                width = 5; //default to 5 for now as that is most common
                break;
            
            default:
                break;
        }
        
        return {
            angle: angle,
            direction: direction,
            distance: distance,
            width: width
        }
    }
    
    /**
     * FUTURE FEATURE
     * For a given damage type, find a matching texture to fill the template with
     * @param {Object} damage  the damage property from the spell data
     */
    _getTemplateTexture(damage) {
        if (!damage && !damage.parts) {
            return;
        }
    
        const damageType = this._getDamageType(damage);
    
        switch (damageType) {
            
            case "acid":
                return DND5E.TEXTURES.Acid;
            
            case "bludgeoning":
                return DND5E.TEXTURES.Bludgeoning;
            
            case "cold":
                return DND5E.TEXTURES.Cold;
            
            case "fire":
                return DND5E.TEXTURES.Fire;
            
            case "force":
                return DND5E.TEXTURES.Force;
            
            case "lightning":
                return DND5E.TEXTURES.Lightning;
    
            case "necrotic":
                return DND5E.TEXTURES.Necrotic;
    
            case "piercing":
                return DND5E.TEXTURES.Piercing;
            
            case "poison":
                return DND5E.TEXTURES.Poison;
    
            case "psychic":
                return DND5E.TEXTURES.Psychic;
    
            case "radiant":
                return DND5E.TEXTURES.Radiant;
    
            case "slashing":
                return DND5E.TEXTURES.Slashing;
    
            case "thunder":
                return DND5E.TEXTURES.Thunder;
            
            default:
                return;
        }
    }
    
    /**
     * FUTURE FEATURE
     * Extract the damage type from the first damage entry in a spell's damage property
     * @param {Object} damage 
     */
    _getDamageType(damage) {
        return damage.parts[0][1]; 
    }
    
    /**
     * Creates a preview of the spell template
     * @param {*} spell 
     * @param {*} event 
     */
    createPreview(event) {
        const data = this.data;

        if (!data) {
            return;
        }

        // Switch to the template scene controls
        this._switchSceneControls();
        
        // Get the x, y coords from the click event 
        // as a starting point for preview rendering
        data.x = event.clientX;
        data.y = event.clientY;
    
        // Draw the preview, set it's opacity to 50% and add it to the layer's preview objects
        this.draw();
        this.alpha = 0.5;
        this.layer.preview.addChild(this);

        // Activate listeners for events on the preview
        this.activatePreviewListeners();
    }

    /**
     * Activate listeners for the preview
     */
    activatePreviewListeners() {
        this.mm = this._onMouseMovePreview.bind(this);
        this.mc = this._onClickPreview.bind(this);
        this.mr = this._onContextMenuPreview.bind(this);
        this.mw = this._onWheelPreview.bind(this);

        canvas.stage.on("mousemove", this.mm);
        canvas.stage.on("click", this.mc);
        
        canvas.app.view.oncontextmenu = this.mr;
    }

    /**
     * Remove listeners
     */
    deactivatePreviewListeners() {
        canvas.stage.off("mousemove", this.mm);
        canvas.stage.off("click", this.mc);
    }

    /**
     * Switches to the Measured Template Scene Controls
     */
    _switchSceneControls() {
        // Get the Measured Template controls object
        const control = ui.controls.controls.find(c => c.name === "measure");

        // Save the user's current control/tool
        this.previousControl = ui.controls.activeControl;
        this.previousTool = game.activeTool;

        // Set the active control to Measured Template
        ui.controls.activeControl = "measure";

        // Change the canvas layer so template positioning behaves as expected
        if ( control && control.layer ) canvas.getLayer(control.layer).activate();
    }

    /**
     * Restores Scene control/tool to its pre-template-preview state
     */
    _restoreSceneControls() {
        // Reset the Scene control to the user's previous selection or default to token
        ui.controls.activeControl = this.previousControl ? this.previousControl : "token";
        const control = ui.controls.controls.find(c => c.name === ui.controls.activeControl);

        // Reset the tool
        // Using a hook as there is some race conditions with layer changing/tool selection
        Hooks.once("renderSceneControls", () => {
            ui.controls.control.activeTool = this.previousTool ? this.previousTool : "select";
            ui.controls.render();
        });

        // Reset the layer
        if ( control && control.layer ) canvas.getLayer(control.layer).activate();
    }

    /**
     * Handle mouse move event
     * @param {Object} event 
     */
    _onMouseMovePreview(event) {
        const data = this.data;

        if (!data) {
            return;
        }

        // Get the mouse position on the template layer
        const pos = event.data.getLocalPosition(this.layer);

        // Retrieve the 1/4 snapped position of the mouse so the template obeys grid intersection rules
        const destination = canvas.grid.getSnappedPosition(pos.x, pos.y, 0.25);
        data.x = destination.x;
        data.y = destination.y;

        this.refresh();   
    }


    /**
     * Handle mouse-wheel event
     * @param {Object} event 
     */
    _onWheelPreview(event) {
        let data = this.data;

        if (!data && !event.ctrlKey) {
            return;
        }

        event.preventDefault();

        // Interpret the mouse wheel at 1/10th precision for smoother rotation
        const directionDelta = event.deltaY * 0.1;

        data.direction += directionDelta;
        this.refresh();
    }
        
    /**
     * Handle click event
     * @param {Object} event
     */
    async _onClickPreview(event) {
        const data = this.data;

        if (!data) { 
            return;
        }

        // Create the Measured Template on the active scene using the existing preview data
        await MeasuredTemplate.create(data);

        // Restore scene control/tool to previous state and deactivate the listeners
        this._restoreSceneControls();
        this.deactivatePreviewListeners();
    }
        
    /**
     * Handle right-click
     */
    _onContextMenuPreview() {
        const data = this.data;

        if (!data) {
            return;
        }

        // Remove the template preview
        this.layer.preview.removeChild(this);
        
        // Restore scene control/tool to previous state and deactivate the listeners
        this._restoreSceneControls();
        this.deactivatePreviewListeners();
    }


    /**
     * Override -- Master mouse-wheel event keyboard handler
     * Add Spell Template preview rotation handling
     * @private
     */
    static _onWheelOverride(event) {

        // Prevent zooming the entire browser window
        if ( event.ctrlKey ) event.preventDefault();

        // Handle wheel events for the canvas if it is ready and if it is our hover target
        let hover = document.elementFromPoint(event.clientX, event.clientY);
        if ( canvas.ready && hover && hover.id === "board" ) {
        event.preventDefault();
        let layer = canvas.activeLayer;
        let isCtrl = event.ctrlKey || event.metaKey,
            isShift = event.shiftKey;
        const templatePreview = canvas.templates.preview.children[0] || null;
        
        // Case 1 - rotate spell template preview
        if ( templatePreview instanceof MeasuredTemplateSpell5e && (isCtrl) ) templatePreview._onWheelPreview(event);

        // Case 2 - rotate tokens or tiles
        else if ( layer instanceof PlaceablesLayer && ( isCtrl || isShift ) ) layer._onMouseWheel(event);
        
        // Case 3 - zoom the canvas
        else canvas._onMouseWheel(event);
        }
    }

}
