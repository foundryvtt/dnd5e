import Advancement from "./advancement.mjs";
import TraitConfig from "../../applications/advancement/trait-config.mjs";
import TraitFlow from "../../applications/advancement/trait-flow.mjs";
import {TraitConfigurationData, TraitValueData} from "../../data/advancement/trait.mjs";
import * as Trait from "../../documents/actor/trait.mjs";

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
        config: TraitConfig,
        flow: TraitFlow
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
    const traitConfig = CONFIG.DND5E.traits[this.configuration.type];
    this.title = this.title || traitConfig?.label || this.constructor.metadata.title;
    this.icon = this.icon || traitConfig?.icon || this.constructor.metadata.icon;
  }

  /* -------------------------------------------- */
  /*  Display Methods                             */
  /* -------------------------------------------- */

  /** @inheritdoc */
  configuredForLevel(level) {
    return !this.value.chosen?.size;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  summaryForLevel(level, { configMode=false }={}) {
    const type = this.configuration.type;

    let source;
    if ( configMode || !this.item.isEmbedded || !this.value.chosen ) {
      source = [
        ...this.configuration.grants.map(g => Trait.keyLabel(type, g)),
        ...this.configuration.choices.map(c => Trait.choiceLabel(type, c))
      ];
    } else {
      source = this.value.chosen.map(k => Trait.keyLabel(type, k));
    }

    return source.reduce((html, label) => {
      html += `<span class="tag">${label}</span>\n`;
      return html;
    }, "");
  }

  /* -------------------------------------------- */
  /*  Application Methods                         */
  /* -------------------------------------------- */

  /** @inheritdoc */
  async apply(level, data) {
    const updates = {};
    if ( !data.chosen ) return;
    const type = this.configuration.type;

    // Skills
    if ( type === "skills" ) {
      for ( const key of data.chosen ) {
        if ( this.actor.system.skills[key].value < 1 ) updates[`system.skills.${key}.value`] = 1;
      }
    }

    else if ( type === "tool" ) {
      for ( const key of data.chosen ) {
        if ( (this.actor.system.tools[key]?.value ?? 0) < 1 ) updates[`system.tools.${key}.value`] = 1;
      }
    }

    // Saves
    else if ( type === "saves" ) {
      for ( const key of data.chosen ) {
        if ( this.actor.system.abilities[key].proficient < 1 ) updates[`system.abilities.${key}.proficient`] = 1;
      }
    }

    // Everything Else
    else {
      const keyPath = `${Trait.actorKeyPath(type)}.value`;
      const current = new Set(foundry.utils.getProperty(this.actor.system, keyPath));
      for ( const key of data.chosen ) current.add(key);
      updates[`system.${keyPath}`] = Array.from(current);
    }

    this.actor.updateSource(updates);
    this.updateSource({ "value.chosen": data.chosen });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async restore(level, data) {
    this.apply(level, data);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async reverse(level) {
    const updates = {};
    if ( !this.value.chosen ) return;
    const type = this.configuration.type;

    // Skills
    if ( type === "skills" ) {
      for ( const key of this.value.chosen ) {
        if ( this.actor.system.skills[key].value === 1 ) updates[`system.skills.${key}.value`] = 0;
      }
    }

    else if ( type === "tool" ) {
      for ( const key of this.value.chosen ) {
        if ( this.actor.system.tools[key].value === 1 ) {
          if ( !this.actor.system.tools[key].bonuses.check ) updates[`system.tools.-=${key}`] = null;
          else updates[`system.tools.${key}.value`] = 0;
        }
      }
    }

    // Saves
    else if ( type === "saves" ) {
      for ( const key of this.value.chosen ) {
        if ( this.actor.system.abilities[key].proficient === 1 ) updates[`system.abilities.${key}.proficient`] = 0;
      }
    }

    // Everything Else
    else {
      const keyPath = `${Trait.actorKeyPath(type)}.value`;
      const current = new Set(foundry.utils.getProperty(this.actor.system, keyPath));
      for ( const key of this.value.chosen ) current.delete(key);
      updates[`system.${keyPath}`] = Array.from(current);
    }

    const retainedData = foundry.utils.deepClone(this.value);
    this.actor.updateSource(updates);
    this.updateSource({ "value.chosen": [] });
    return retainedData;
  }
}
