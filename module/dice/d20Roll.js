/**
 * Advantage mode of a 5e d20 roll
 * @enum {{
 *     numberOfDice: number,
 *     mod: string
 * }}
 * @readonly
 */
const ADV_MODE = {
    NORMAL: { numberOfDice: 1, mod: "" },
    ADV: { numberOfDice: 2, mod: "kh" },
    DISADV: { numberOfDice: 2, mod: "kl" },
}

/**
 * A type of Roll specific to a d20 based check, save, or attack roll in the 5e system
 *
 * @param {String} formula                The string formula to parse
 * @param {Object} data                   The data object against which to parse attributes within the formula
 * @param {ADV_MODE} advantageMode        What advantage modifier to apply to the roll (none, advantage, disadvantage)
 * @param {number} critical               The value of d20 result which represents a critical success
 * @param {number} fumble                 The value of d20 result which represents a critical failure
 * @param {(number|null)} targetValue     Assign a target value against which the result of this roll should be compared
 * @param {boolean} elvenAccuracy         Allow Elven Accuracy to modify this roll?
 * @param {boolean} halflingLucky         Allow Halfling Luck to modify this roll?
 * @param {boolean} reliableTalent        Allow Reliable Talent to modify this roll?
 */
class D20Roll extends Roll {
    constructor(formula, data, { advantageMode=ADV_MODE.NORMAL, critical=20, fumble=1,
        targetValue=null,  elvenAccuracy=false, halflingLucky=false, reliableTalent=false }={}) {

        let d20Options = arguments[2];
        const d20Term = D20Roll._createD20FormulaTerm(d20Options);
        formula = `${d20Term} + ${formula}`;

        super(formula, data);

        /**
         * 5e d20 check options
         * @type {{
         *     advantageMode: ADV_MODE,
         *     halflingLucky: boolean,
         *     elvenAccuracy: boolean,
         *     reliableTalent: boolean,
         *     critical: number,
         *     fumble: number,
         *     targetValue: (number|null)
         * }}
         * @private
         */
        this._d20Options = d20Options;
    }

    /** @private */
    static _createD20FormulaTerm(d20Options) {
        let { advantageMode, halflingLucky, elvenAccuracy, reliableTalent } = d20Options;

        // Set number of dice and modifiers based on advantage mode and halfling lucky feature
        let numberOfDice = advantageMode.numberOfDice;
        let mods = halflingLucky ? "r1=1" : "";
        mods += advantageMode.mod;

        // Account for elven accuracy feat when rolling with advantage
        if ( elvenAccuracy && advantageMode === ADV_MODE.ADV ) numberOfDice++;

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

            d.options.critical = this._d20Options.critical;
            d.options.fumble = this._d20Options.fumble;

            switch (this._d20Options.advantageMode) {
                case ADV_MODE.ADV: d.options.advantage = true; break;
                case ADV_MODE.DISADV: d.options.disadvantage = true; break;
                default: break;
            }

            if (this._d20Options.targetValue) d.options.target = this._d20Options.targetValue;
        }

        return this;
    }

    /** @override */
    toMessage(messageData = {}, { rollMode = null, create = true } = {}) {
        const rollFlagsKey = "flags.dnd5e.roll";
        const hasRollFlags = rollFlagsKey in messageData;

        // Add appropriate advantage mode message flavor and dnd5e roll flags
        switch (this._d20Options.advantageMode) {
            case ADV_MODE.ADV:
                messageData.flavor += ` (${game.i18n.localize("DND5E.Advantage")})`;
                if (hasRollFlags) messageData[rollFlagsKey].advantage = true;
                break;
            case ADV_MODE.DISADV:
                messageData.flavor += ` (${game.i18n.localize("DND5E.Disadvantage")})`;
                if (hasRollFlags) messageData[rollFlagsKey].disadvantage = true;
                break;
            default:
                break;
        }

        // Evaluate the roll now so we have the results available to determine whether reliable talent came into play
        if (!this._rolled) this.evaluate();

        // Add reliable talent message flavor if reliable talent affected the results
        if (this._d20Options.reliableTalent && this.dice[0].total < 10) {
            messageData.flavor += ` (${game.i18n.localize("DND5E.FlagsReliableTalent")})`;
        }

        return super.toMessage(messageData, { rollMode , create });
    }
}
