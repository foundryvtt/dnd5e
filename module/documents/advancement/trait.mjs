import Advancement from "./advancement.mjs";
import * as Trait from "../actor/trait.mjs";
import TraitConfig from "../../applications/advancement/trait-config.mjs";
import {TraitConfigurationData, TraitValueData} from "../../data/advancement/trait.mjs";

/**
 * Advancement that grants the player with certain traits or presents them with a list of traits from which
 * to choose.
 */
export default class TraitAdvancement extends Advancement {

  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      dataModels: {
        configuration: TraitConfigurationData,
        value: TraitValueData
      },
      order: 30,
      icon: "systems/dnd5e/icons/svg/trait.svg",
      title: game.i18n.localize("DND5E.AdvancementTraitTitle"),
      hint: game.i18n.localize("DND5E.AdvancementTraitHint"),
      apps: {
        config: TraitConfig
      }
    });
  }

  /* -------------------------------------------- */
  /*  Preparation Methods                         */
  /* -------------------------------------------- */

  /**
   * Prepare data for the Advancement.
   */
  prepareData() {
    const traitConfig = CONFIG.DND5E.traits[this.representedTraits().first()];
    this.title = this.title || traitConfig?.labels.title || this.constructor.metadata.title;
    this.icon = this.icon || traitConfig?.icon || this.constructor.metadata.icon;
  }

  /* -------------------------------------------- */
  /*  Display Methods                             */
  /* -------------------------------------------- */

  /** @inheritdoc */
  configuredForLevel(level) {
    return !!this.value.chosen?.size;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  sortingValueForLevel(levels) {
    const traitOrder = Object.keys(CONFIG.DND5E.traits).findIndex(k => k === this.representedTraits().first());
    const modeOrder = Object.keys(CONFIG.DND5E.traitModes).findIndex(k => k === this.configuration.mode);
    const order = traitOrder + (modeOrder * 100);
    return `${this.constructor.metadata.order.paddedString(4)} ${order.paddedString(4)} ${this.titleForLevel(levels)}`;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  summaryForLevel(level, { configMode=false }={}) {
    if ( this.configuration.hint ) return `<p>${this.configuration.hint}</p>`;
    return `<p>${Trait.localizedList({
      grants: this.configuration.grants, choices: this.configuration.choices, choiceMode: this.configuration.choiceMode
    })}</p>`;
  }

  /* -------------------------------------------- */
  /*  Helper Methods                              */
  /* -------------------------------------------- */

  /**
   * Guess the trait type from the grants & choices on this advancement.
   * @param {Set<string>[]} [pools]  Trait pools to use when figuring out the type.
   * @returns {Set<string>}
   */
  representedTraits(pools) {
    const set = new Set();
    pools ??= [this.configuration.grants, ...this.configuration.choices.map(c => c.pool)];
    for ( const pool of pools ) {
      for ( const key of pool ) {
        const type = key.split(":").shift();
        set.add(type);
      }
    }
    return set;
  }
}
