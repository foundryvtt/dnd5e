/**
 * A simple form to set actor hit dice amounts
 * @implements {DocumentSheet}
 */
export default class ActorHitDiceConfig extends DocumentSheet {

    /** @override */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["dnd5e", "hd-config", "dialog"],
            template: "systems/dnd5e/templates/apps/hit-dice-config.html",
            width: 400,
            height: "auto"
        });
    }

    /* -------------------------------------------- */

    /** @override */
    get title() {
        return `${game.i18n.localize("DND5E.HitDiceConfig")}: ${this.object.name}`;
    }

    /* -------------------------------------------- */

    /** @override */
    getData(options) {
        // Get class items and sort by order of largest hit die
        const classItems = this.object.items.filter(i => i.data.type === "class")
            .sort((a, b) => parseInt(b.data.data.hitDice.slice(1)) - parseInt(a.data.data.hitDice.slice(1)));
        return {
            classes: classItems.map(i => ({
                classItemId: i.data._id,
                name: i.data.name,
                diceDenom: i.data.data.hitDice,
                currentHitDice: i.data.data.levels - i.data.data.hitDiceUsed,
                maxHitDice: i.data.data.levels,
                canRoll: (i.data.data.levels - i.data.data.hitDiceUsed) > 0,
            })),
        };
    }

    /* -------------------------------------------- */

    /** @override */
    activateListeners(html) {
        super.activateListeners(html);

        // Hook up -/+ buttons to adjust the current value in the form
        html.find("button.decrement").click(function() {
            const el = $(this);
            const oldVal = parseInt(el.siblings("input.current").val());
            const newVal = oldVal - 1 < 0 ? 0 : oldVal - 1;
            el.siblings("input.current").val(newVal);
        });

        html.find("button.increment").click(function() {
            const el = $(this);
            const oldVal = parseInt(el.siblings("input.current").val());
            const maxVal = parseInt(el.siblings("input.max").val())
            const newVal = oldVal + 1 > maxVal ? maxVal : oldVal + 1;
            el.siblings("input.current").val(newVal);
        });

        html.find("button.roll-hd").click(this._onRollHitDie.bind(this));
    }

    /* -------------------------------------------- */

    /** @override */
    _getSubmitData(updateData = {}) {
        const fd = new FormDataExtended(this.form);
        // formData maps the class item id as the key to the new hit dice quantity as the value
        const formData = fd.toObject();
        const actorItems = this.object.items;
        return Object.entries(formData).map(([id, hd]) => ({
            _id: id,
            "data.hitDiceUsed": actorItems.get(id).data.data.levels - hd,
        }));
    }

    /* -------------------------------------------- */

    /** @override */
    async _updateObject(event, formData) {
        return this.object.updateEmbeddedDocuments("Item", formData);
    }

    /* -------------------------------------------- */

    /**
     * Rolls the hit die corresponding with the class row containing the event's target button.
     * @param {MouseEvent} event
     * @private
     */
    async _onRollHitDie(event) {
        event.preventDefault();
        const button = event.currentTarget;
        await this.object.rollHitDie(button.dataset.hdDenom);

        // Re-render dialog to reflect changed hit dice quantities
        this.render();
    }
}
