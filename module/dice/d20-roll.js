

/**
 * A type of Roll specific to a d20 based check, save, or attack roll in the 5e system
 *
 * @param {string} formula                       The string formula to parse, *not including the d20 term*
 * @param {object} data                          The data object against which to parse attributes within the formula
 * @param {object} options                       Extra optional arguments
 * @param {number} [options.advantageMode]       What advantage modifier to apply to the roll (none, advantage, disadvantage)
 * @param {number} [options.critical]            The value of d20 result which represents a critical success
 * @param {number} [options.fumble]              The value of d20 result which represents a critical failure
 * @param {(number|null)} [options.targetValue]  Assign a target value against which the result of this roll should be compared
 * @param {boolean} [options.elvenAccuracy]      Allow Elven Accuracy to modify this roll?
 * @param {boolean} [options.halflingLucky]      Allow Halfling Luck to modify this roll?
 * @param {boolean} [options.reliableTalent]     Allow Reliable Talent to modify this roll?
 */
export default class D20Roll extends Roll {
    constructor(formula, data, { advantageMode=D20Roll.ADV_MODE.NORMAL, critical=20, fumble=1,
        targetValue=null,  elvenAccuracy=false, halflingLucky=false, reliableTalent=false }={}) {

        super(formula, data);

        this.options = mergeObject(this.options ?? {}, {
            advantageMode,
            critical,
            fumble,
            targetValue,
            elvenAccuracy,
            halflingLucky,
            reliableTalent
        });

        // If there is not already a d20 term, add one
        if ( !(this.terms[0] instanceof Die) || this.terms[0].faces !== 20 ) {
            const d20Term = this._createD20FormulaTerm();
            formula = `${d20Term} + ${this._formula}`;
            this.terms = this._identifyTerms(formula);
            this._formula = this.constructor.cleanFormula(this.terms);
        }
    }

    /**
     * Advantage mode of a 5e d20 roll
     * @enum {number}
     * @readonly
     */
    static ADV_MODE = {
        NORMAL: 0,
        ADV: 1,
        DISADV: -1,
    }

    /**
     * Details of how to apply each advantage mode to a d20 roll
     * @enum {{ numberOfDice: number, mod: string }}
     * @private
     * @readonly
     */
    static _ADV_MODE_LOOKUP = {
        [D20Roll.ADV_MODE.NORMAL]: { numberOfDice: 1, mod: "" },
        [D20Roll.ADV_MODE.ADV]: { numberOfDice: 2, mod: "kh" },
        [D20Roll.ADV_MODE.DISADV]: { numberOfDice: 2, mod: "kl" }
    }

    /**
     * Creates the d20 term of the roll formula, including the effects of actor features and advantage/disadvantage
     * @private
     */
    _createD20FormulaTerm() {
        let { advantageMode=D20Roll.ADV_MODE.NORMAL, halflingLucky=false, elvenAccuracy=false, reliableTalent=false } = this.options;

        // Set number of dice and modifiers based on advantage mode and halfling lucky feature
        let numberOfDice = D20Roll._ADV_MODE_LOOKUP[advantageMode].numberOfDice;
        let mods = halflingLucky ? "r1=1" : "";
        mods += D20Roll._ADV_MODE_LOOKUP[advantageMode].mod;

        // Account for elven accuracy feat when rolling with advantage
        if ( elvenAccuracy && advantageMode === D20Roll.ADV_MODE.ADV ) numberOfDice++;

        let d20Term = `${numberOfDice}d20${mods}`;

        // Minimum result of 10 for reliable talent
        if (reliableTalent) d20Term = `{${d20Term}, 10}kh`;

        return d20Term;
    }

    /** @override */
    evaluate({ minimize = false, maximize = false } = {}) {
        super.evaluate({ minimize , maximize });

        // Set appropriate dice options for all d20s in the roll
        for (let d of this.dice) {
            if (d.faces !== 20) continue;

            d.options.critical = this.options.critical;
            d.options.fumble = this.options.fumble;

            switch (this.options.advantageMode) {
                case D20Roll.ADV_MODE.ADV: d.options.advantage = true; break;
                case D20Roll.ADV_MODE.DISADV: d.options.disadvantage = true; break;
                default: break;
            }

            if ( this.options.targetValue ) d.options.target = this.options.targetValue;
        }

        return this;
    }

    /** @override */
    toMessage(messageData = {}, { rollMode = null, create = true } = {}) {
        const rollFlagsKey = "flags.dnd5e.roll";
        const hasRollFlags = rollFlagsKey in messageData;

        // Add appropriate advantage mode message flavor and dnd5e roll flags
        switch ( this.options.advantageMode ) {
            case D20Roll.ADV_MODE.ADV:
                messageData.flavor += ` (${game.i18n.localize("DND5E.Advantage")})`;
                if (hasRollFlags) messageData[rollFlagsKey].advantage = true;
                break;
            case D20Roll.ADV_MODE.DISADV:
                messageData.flavor += ` (${game.i18n.localize("DND5E.Disadvantage")})`;
                if (hasRollFlags) messageData[rollFlagsKey].disadvantage = true;
                break;
            default:
                break;
        }

        // Evaluate the roll now so we have the results available to determine whether reliable talent came into play
        if (!this._rolled) this.evaluate();

        // Add reliable talent message flavor if reliable talent affected the results
        if ( this.options.reliableTalent && this.dice[0].total < 10 ) {
            messageData.flavor += ` (${game.i18n.localize("DND5E.FlagsReliableTalent")})`;
        }

        return super.toMessage(messageData, { rollMode , create });
    }
}
