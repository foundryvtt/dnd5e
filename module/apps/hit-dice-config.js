/**
 * A simple form to set actor hit dice amounts
 * @implements {BaseEntitySheet}
 */
export default class ActorHitDiceConfig extends BaseEntitySheet {

    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["dnd5e", "hd-config", "dialog"],
            template: "systems/dnd5e/templates/apps/hit-dice-config.html",
            width: 400,
            height: "auto"
        });
    }

    /* -------------------------------------------- */

    /** @override */
    get title() {
        return `${game.i18n.localize("DND5E.HitDiceConfig")}: ${this.entity.name}`;
    }

    /* -------------------------------------------- */

    /** @override */
    getData(options) {
        // Get class items and sort by order of largest hit die
        const classItems = this.object.data.items.filter(i => i.type === "class")
            .sort((a, b) => parseInt(b.data.hitDice.slice(1)) - parseInt(a.data.hitDice.slice(1)));
        return {
            classes: classItems.map(i => ({
                classItemId: i._id,
                name: i.name,
                diceDenom: i.data.hitDice,
                currentHitDice: i.data.levels - i.data.hitDiceUsed,
                maxHitDice: i.data.levels,
                canRoll: (i.data.levels - i.data.hitDiceUsed) > 0,
            })),
        };
    }

    /* -------------------------------------------- */

    /** @override */
    activateListeners(html) {
        super.activateListeners(html);

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
        const formData = fd.toObject();

        const actorItems = this.object.items;

        return Object.entries(formData).map(([id, hd]) => {
            const thisClassItem = actorItems.get(id);

            return {
                _id: id,
                "data.hitDiceUsed": thisClassItem.data.data.levels - hd,
            };
        });
    }

    /* -------------------------------------------- */

    /** @override */
    async _updateObject(event, formData) {
        return this.object.updateOwnedItem(formData);
    }

    async _onRollHitDie(event) {
        event.preventDefault();
        const button = event.currentTarget;
        const hdDenom = button.dataset.hdDenom;
        await this.object.rollHitDie(hdDenom);
        this.render();
    }
}
