import aggregateDamageRolls from "../../dice/aggregate-damage-rolls.mjs";
import RollMessageData from "./roll-message-data.mjs";

const { SchemaField, SetField, StringField } = foundry.data.fields;

/**
 * @import { DamageMessageSystemData } from "./_types.mjs";
 */

/**
 * Data stored in a damage chat message.
 * @extends {RollMessageData<DamageMessageSystemData>}
 * @mixes DamageMessageSystemData
 */
export default class DamageMessageData extends RollMessageData {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      applicationOptions: new SchemaField({
        downgrade: new SetField(new StringField(), { required: false }),
        ignore: new SchemaField({
          immunity: new SetField(new StringField(), { required: false }),
          resistance: new SetField(new StringField(), { required: false }),
          vulnerability: new SetField(new StringField(), { required: false })
        }, { required: false })
      }, { required: false }),
      onSave: new StringField({ blank: false, initial: null, nullable: true, required: false })
    };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    template: "systems/dnd5e/templates/chat/damage-card.hbs"
  }, { inplace: false }));

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @override */
  get canApplyDamage() {
    return true;
  }

  /* -------------------------------------------- */

  /**
   * Whether the results of this message should be applied as healing rather than damage.
   * @type {boolean}
   */
  get isHealing() {
    return false;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /**
   * Marshal salient properties for this damage roll.
   * @param {Activity} [activity]  The associated activity.
   * @returns {{ [css]: string, label: string }[]}
   * @protected
   */
  _getDamageProperties(activity) {
    activity ??= this.parent.getAssociatedActivity();
    const { isSpell=false } = activity ?? {};
    const isCritical = this.parent.rolls[0]?.isCritical === true;
    const isWeapon = this.item?.type === "weapon";
    const props = new Set(this.parent.rolls.flatMap(r => r.options.properties ?? []));
    const tags = [];
    if ( isCritical ) tags.push({ css: "critical", label: _loc("DND5E.Critical") });
    if ( isSpell ) tags.push({ label: _loc(CONFIG.Item.typeLabels.spell) });
    else if ( isWeapon ) tags.push({ label: _loc(CONFIG.Item.typeLabels.weapon) });
    tags.push(...Array.from(props, p => ({ label: CONFIG.DND5E.itemProperties[p]?.label })).filter(p => p.label));
    return tags;
  }

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const aggregate = CONFIG.DND5E.aggregateDamageDisplay;
    const rolls = aggregate ? aggregateDamageRolls(this.parent.rolls) : this.parent.rolls;
    const isPrivate = !this.parent.isContentVisible;
    const activity = this.parent.getAssociatedActivity();
    const context = {
      isPrivate,
      formula: rolls.map(r => aggregate ? r.formula : ` + ${r.formula}`).join("").replace(/^ \+ /, ""),
      parts: rolls.map(roll => {
        const part = roll.aggregateTerms();
        part.config = CONFIG.DND5E.damageTypes[part.type] ?? CONFIG.DND5E.healingTypes[part.type] ?? null;
        part.label = part.config?.labelShort ?? part.config?.label ?? "";
        return part;
      }),
      rows: {
        properties: {
          entries: this._getDamageProperties(activity),
          icon: "fa-solid fa-tag",
          label: "DND5E.CHATMESSAGE.Row.Properties"
        }
      },
      showTray: (game.user.isGM || dnd5e.settings.allowPlayerDamageTray) && !isPrivate,
      total: rolls.reduce((total, roll) => total + Math.max(0, roll.total), 0)
    };

    const item = this.parent.getAssociatedItem();
    if ( !isPrivate && item ) context.header = {
      item,
      activity: this.activity,
      subtitle: [this.activity.name, activity?.damageFlavor].filterJoin(" • ")
    };
    if ( !isPrivate && this.onSave ) {
      context.onSave = _loc(`DND5E.SAVE.FIELDS.damage.onSave.${this.onSave.capitalize()}`);
    }

    return context;
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Get the final damage application options, merging the defaults from this card into a set of base options.
   * @param {DamageApplicationOptions} [base={}]  Base options into which this card's defaults should be merged.
   * @returns {DamageApplicationOptions}
   */
  getDamageApplicationOptions(base={}) {
    const defaultOptions = this.applicationOptions ?? {};
    return {
      ...base,
      downgrade: this.#mergeOption(base.downgrade, defaultOptions.downgrade),
      ignore: base.ignore === true ? base.ignore : {
        ...(base.ignore ?? {}),
        immunity: this.#mergeOption(base.ignore?.immunity, defaultOptions.ignore?.immunity),
        resistance: this.#mergeOption(base.ignore?.resistance, defaultOptions.ignore?.resistance),
        vulnerability: this.#mergeOption(base.ignore?.vulnerability, defaultOptions.ignore?.vulnerability)
      },
      multiplier: base.multiplier
    };
  }

  /* -------------------------------------------- */

  /**
   * Merge a single application option with the default options from the chat message.
   * @param {boolean|Set<string>} targetOption  Option for a specific target.
   * @param {Set<string>|void} defaultOption    Default option from chat message.
   * @returns {boolean|Set<string>|void}
   */
  #mergeOption(targetOption, defaultOption) {
    if ( !defaultOption || (targetOption === true) ) return targetOption;
    if ( defaultOption.has("ALL") ) return true;
    return new Set(targetOption ?? []).union(defaultOption);
  }
}
