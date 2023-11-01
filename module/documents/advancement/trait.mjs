import Advancement from "./advancement.mjs";
import SelectChoices from "../actor/select-choices.mjs";
import * as Trait from "../actor/trait.mjs";
import TraitConfig from "../../applications/advancement/trait-config.mjs";
import TraitFlow from "../../applications/advancement/trait-flow.mjs";
import {TraitConfigurationData, TraitValueData} from "../../data/advancement/trait.mjs";
import { filteredKeys } from "../../utils.mjs";

/**
 * Advancement that grants the player with certain traits or presents them with a list of traits from which
 * to choose.
 */
export default class TraitAdvancement extends Advancement {

  /** @inheritdoc */
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
    if ( configMode ) {
      if ( this.configuration.hint ) return `<p>${this.configuration.hint}</p>`;
      return `<p>${Trait.localizedList({
        grants: this.configuration.grants, choices: this.configuration.choices,
        choiceMode: this.configuration.choiceMode
      })}</p>`;
    } else {
      return Array.from(this.value.chosen).map(k => `<span class="tag">${Trait.keyLabel(k)}</span>`).join(" ");
    }
  }

  /* -------------------------------------------- */
  /*  Application Methods                         */
  /* -------------------------------------------- */

  /** @inheritdoc */
  async apply(level, data) {
    const updates = {};
    if ( !data.chosen ) return;

    for ( const key of data.chosen ) {
      const keyPath = Trait.changeKeyPath(key);
      let existingValue = updates[keyPath] ?? foundry.utils.getProperty(this.actor, keyPath);
      console.log(keyPath, existingValue);

      if ( ["Array", "Set"].includes(foundry.utils.getType(existingValue)) ) {
        existingValue = new Set(existingValue);
        existingValue.add(key.split(":").pop());
        updates[keyPath] = Array.from(existingValue);
      } else if ( (this.configuration.mode !== "expertise") || (existingValue !== 0) ) {
        updates[keyPath] = (this.configuration.mode === "default")
          || ((this.configuration.mode === "upgrade") && (existingValue === 0)) ? 1 : 2;
      }
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

    for ( const key of this.value.chosen ) {
      const keyPath = Trait.changeKeyPath(key);
      let existingValue = updates[keyPath] ?? foundry.utils.getProperty(this.actor, keyPath);

      if ( ["Array", "Set"].includes(foundry.utils.getType(existingValue)) ) {
        existingValue = new Set(existingValue);
        existingValue.delete(key.split(":").pop());
        updates[keyPath] = Array.from(existingValue);
      }

      else if ( this.configuration.mode === "expertise" ) updates[keyPath] = 1;
      else if ( this.configuration.mode === "upgrade" ) updates[keyPath] = existingValue === 1 ? 0 : 1;
      else updates[keyPath] = 0;
      // TODO: When using forced expertise mode, this has the potential to lost data
      // if the value before being applied is 1. To fix that this would need to store
      // the value before the change was applied.
    }

    const retainedData = foundry.utils.deepClone(this.value);
    this.actor.updateSource(updates);
    this.updateSource({ "value.chosen": [] });
    return retainedData;
  }

  /* -------------------------------------------- */
  /*  Helper Methods                              */
  /* -------------------------------------------- */

  /**
   * Two sets of keys based on actor data, one that is considered "selected" and thus unavailable to be chosen
   * and another that is "available". This is based off configured advancement mode.
   * @returns {{selected: Set<string>, available: Set<string>}}
   */
  async actorSelected() {
    const selected = new Set();
    const available = new Set();

    // If "default" mode is selected, return all traits
    // If any other mode is selected, only return traits that support expertise
    const traitTypes = this.configuration.mode === "default" ? Object.keys(CONFIG.DND5E.traits)
      : filteredKeys(CONFIG.DND5E.traits, t => t.expertise);

    for ( const trait of traitTypes ) {
      const actorValues = Trait.actorValues(this.actor, trait);
      const choices = await Trait.choices(trait, { prefixed: true });
      for ( const key of choices.asSet() ) {
        const value = actorValues[key];
        if ( this.configuration.mode === "default" ) {
          if ( value >= 1 ) selected.add(key);
          else available.add(key);
        } else {
          if ( value === 2 ) selected.add(key);
          if ( (this.configuration.mode === "expertise") && (value === 1) ) available.add(key);
          else if ( (this.configuration.mode !== "expertise") && (value < 2) ) available.add(key);
        }
      }
    }

    return { selected, available };
  }

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
        const [type] = key.split(":");
        set.add(type);
      }
    }
    return set;
  }

  /* -------------------------------------------- */

  /**
   * Prepare the list of available traits from which the player can choose.
   * @param {Set<string>} [chosen]  Traits already chosen on the advancement. If not set then it will
   *                                be retrieved from advancement's value.
   * @returns {{choices: SelectChoices, label: string}|null}
   */
  async availableChoices(chosen) {
    // TODO: Still shows "Choose 1 x" even if not possible due to mode restriction
    let { available, choices } = await this.unfulfilledChoices(chosen);

    // If all traits of this type are already assigned, then nothing new can be selected
    if ( foundry.utils.isEmpty(choices) ) return null;

    // Remove any grants that have no choices remaining
    let unfilteredLength = available.length;
    available = available.filter(a => a.asSet().size > 0);

    // If replacements are allowed and there are grants with zero choices from their limited set,
    // display all remaining choices as an option
    if ( this.configuration.allowReplacements && (unfilteredLength > available.length) ) {
      return {
        choices: choices.filter(this.representedTraits().map(t => `${t}:*`), { inplace: false }),
        label: game.i18n.format("DND5E.AdvancementTraitChoicesRemaining", {
          count: unfilteredLength,
          type: Trait.traitLabel(this.representedTraits().first(), unfilteredLength)
        })
      };
      // TODO: This works well for types without categories like skills where it is primarily intended,
      // but perhaps there could be some improvements elsewhere. For example, if I have an advancement
      // that grants proficiency in the Bagpipes and allows replacements, but the character already has
      // Bagpipe proficiency. In this example this just lets them choose from any other tool proficiency
      // as their replacement, but it might make sense to only show other musical instruments unless
      // they already have proficiency in all musical instruments. Might not be worth the effort.
    }

    // Create a choices object featuring a union of choices from all remaining grants
    const remainingSet = new Set(available.flatMap(a => Array.from(a.asSet())));
    choices.filter(remainingSet);

    // Simplify label if exclusive mode and more than one set of choices still available
    const simplifyNotification = this.configuration.choiceMode === "exclusive"
      && (new Set(available.map(a => a._index))).size > 1;

    if ( !available.length ) return null;

    return {
      choices,
      label: game.i18n.format(`DND5E.AdvancementTraitChoicesRemaining${simplifyNotification ? "Simple" : ""}`, {
        count: available.length,
        type: Trait.traitLabel(this.representedTraits(available.map(a => a.asSet())).first(), available.length)
      })
    };
  }

  /* -------------------------------------------- */

  /**
   * Determine which of the provided grants, if any, still needs to be fulfilled.
   * @param {Set<string>} [chosen]  Traits already chosen on the advancement. If not set then it will
   *                                be retrieved from advancement's value.
   * @returns {{ available: SelectChoices[], choices: SelectChoices }}
   */
  async unfulfilledChoices(chosen) {
    const actorData = await this.actorSelected();
    const selected = {
      actor: actorData.selected,
      item: chosen ?? this.value.selected ?? new Set()
    };

    // Duplicate choices a number of times equal to their count to get numbers correct
    const choices = Array.from(this.configuration.choices.entries()).reduce((arr, [index, choice]) => {
      const set = new Set(choice.pool);
      set._index = index;
      let count = choice.count;
      while ( count > 0 ) {
        arr.push(set);
        count -= 1;
      }
      return arr;
    }, []);

    // If everything has already been selected, no need to go further
    if ( (this.configuration.grants.size + choices.length) <= selected.item.size ) {
      return { available: [], choices: new SelectChoices() };
    }

    let available = await Promise.all([
      ...this.configuration.grants.map(g => Trait.mixedChoices(new Set([g]))),
      ...choices.map(async c => {
        const choices = await Trait.mixedChoices(c);
        if ( c._index !== undefined ) Object.defineProperty(choices, "_index", { value: c._index, enumerable: false });
        return choices;
      })
    ]);
    available.sort((lhs, rhs) => lhs.asSet().size - rhs.asSet().size);

    // Remove any fulfilled grants
    if ( this.configuration.choiceMode === "inclusive" ) this.removeFullfilledInclusive(available, selected);
    else this.removeFullfilledExclusive(available, selected);

    // Merge all possible choices into a single SelectChoices
    const allChoices = await Trait.mixedChoices(actorData.available);
    allChoices.exclude(new Set([...(selected.actor ?? []), ...selected.item]));
    available = available.map(a => {
      const filtered = allChoices.filter(a, { inplace: false });
      if ( a._index !== undefined ) Object.defineProperty(filtered, "_index", { value: a._index, enumerable: false });
      return filtered;
    });

    return { available, choices: allChoices };
  }

  /* -------------------------------------------- */

  /**
   * Remove any fulfilled grants, handling choices using the "inclusive" elimination mode.
   * @param {Set<string>[]} available  List of grant/choice pools.
   * @param {Set<string>} selected     Currently selected trait keys.
   */
  removeFullfilledInclusive(available, selected) {
    for ( const key of selected.item ) available.findSplice(grant => grant.asSet().has(key));
  }

  /* -------------------------------------------- */

  /**
   * Remove any fulfilled grants, handling choices using the "exclusive" elimination mode.
   * @param {Set<string>[]} available  List of grant/choice pools.
   * @param {Set<string>} selected    Currently selected trait keys.
   */
  removeFullfilledExclusive(available, selected) {
    const indices = new Set(available.map(a => a._index));
    for ( const key of selected.item ) {
      // Remove first selected grant
      const index = available.findIndex(grant => grant.asSet().has(key));
      const firstMatch = available[index];
      available.splice(index, 1);

      if ( firstMatch?._index !== undefined ) {
        for ( const index of indices ) {
          if ( index === firstMatch._index ) continue;
          // If it has an index, remove any other choices by index that don't have this choice
          const anyMatch = available.filter(a => a._index === index).some(grant => grant.asSet().has(key));
          if ( !anyMatch ) {
            let removeIndex = available.findIndex(a => a._index === index);
            while ( removeIndex !== -1 ) {
              available.splice(removeIndex, 1);
              removeIndex = available.findIndex(a => a._index === index);
            }
            indices.delete(index);
          }
        }
      }
    }
  }
}
