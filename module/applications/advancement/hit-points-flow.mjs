import AdvancementFlow from "./advancement-flow-v2.mjs";
import Advancement from "../../documents/advancement/advancement.mjs";
import { simplifyBonus } from "../../utils.mjs";

/**
 * Inline application that presents hit points selection upon level up.
 */
export default class HitPointsFlow extends AdvancementFlow {

  /** @override */
  static DEFAULT_OPTIONS = {
    actions: {
      rollHitPoints: HitPointsFlow.#rollHitPoints
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    ...super.PARTS,
    content: {
      template: "systems/dnd5e/templates/advancement/hit-points-flow.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const source = this.retainedData ?? this.advancement.value;
    const value = source[this.level];
    const hp = this.advancement.actor.system.attributes.hp;
    const abilityId = CONFIG.DND5E.defaultAbilities.hitPoints || "con";
    const mod = this.advancement.actor.system.abilities[abilityId]?.mod ?? 0;
    const bonus = simplifyBonus(hp.bonuses?.level ?? "", this.advancement.actor.getRollData());

    return {
      ...context,
      data: {
        value: value === "avg" ? this.advancement.average : Number.isInteger(value) ? value : "",
        useAverage: value === "avg"
      },
      hp: {
        average: this.advancement.average,
        bonus,
        max: this.advancement.hitDieValue,
        modifier: {
          label: CONFIG.DND5E.abilities[abilityId]?.abbreviation ?? "",
          value: mod
        },
        previous: Object.keys(this.advancement.value).reduce((total, level) => {
          if ( parseInt(level) === this.level ) return total;
          return total + Math.max(this.advancement.valueForLevel(parseInt(level)) + mod, 1) + bonus;
        }, 0),
        total: hp.max
      },
      hitDie: this.advancement.hitDie,
      isFirstClassLevel: (this.level === 1) && this.advancement.item.isOriginalClass,
      manual: !["avg", "max"].includes(value)
    };
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle rolling hit points.
   * @this {HitPointsFlow}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static async #rollHitPoints(event, target) {
    const roll = await this.advancement.actor.rollClassHitPoints(this.advancement.item);
    if ( roll ) {
      await this.advancement.apply(this.level, { [this.level]: roll.total });
      this.render();
    }
  }

  /* -------------------------------------------- */
  /*  Form Handling                               */
  /* -------------------------------------------- */

  /** @override */
  async _handleForm(event, form, formData) {
    let newValue;
    if ( event.target?.name === "useAverage" ) {
      newValue = event.target.checked ? "avg" : null;
    } else if ( event.target?.name === "value" ) {
      newValue = Number.isInteger(event.target.valueAsNumber) ? event.target.valueAsNumber : null;
    } else return;

    if ( newValue ) await this.advancement.apply(this.level, { [this.level]: newValue });
    else await this.advancement.reverse(this.level);

    // TODO: Re-implement advancement errors
    // this.form.querySelector(".rollResult")?.classList.add("error");
    // const errorType = formData.value ? "Invalid" : "Empty";
    // throw new Advancement.ERROR(game.i18n.localize(`DND5E.ADVANCEMENT.HitPoints.Warning.${errorType}`));
  }
}
