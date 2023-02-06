import Advancement from "./advancement.mjs";
import AbilityScoreImprovementConfig from "../../applications/advancement/ability-score-improvement-config.mjs";
import AbilityScoreImprovementFlow from "../../applications/advancement/ability-score-improvement-flow.mjs";
import {
  AbilityScoreImprovementConfigurationData,
  AbilityScoreImprovementValueData
} from "../../data/advancement/ability-score-improvement.mjs";

/**
 * Advancement that presents the player with the option of improving their ability scores or selecting a feat.
 */
export default class AbilityScoreImprovementAdvancement extends Advancement {

  /** @inheritdoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      dataModels: {
        configuration: AbilityScoreImprovementConfigurationData,
        value: AbilityScoreImprovementValueData
      },
      order: 20,
      icon: "systems/dnd5e/icons/svg/ability-score-improvement.svg",
      title: game.i18n.localize("DND5E.AdvancementAbilityScoreImprovementTitle"),
      hint: game.i18n.localize("DND5E.AdvancementAbilityScoreImprovementHint"),
      validItemTypes: new Set(["background", "class"]),
      apps: {
        config: AbilityScoreImprovementConfig,
        flow: AbilityScoreImprovementFlow
      }
    });
  }

  /* -------------------------------------------- */
  /*  Instance Properties                         */
  /* -------------------------------------------- */

  /**
   * Does this advancement allow feats, or just ability score improvements?
   * @type {boolean}
   */
  get allowFeat() {
    return (this.item.type === "class") && game.settings.get("dnd5e", "allowFeats");
  }

  /* -------------------------------------------- */

  /**
   * Information on the ASI points available.
   * @type {{ assigned: number, total: number }}
   */
  get points() {
    return {
      assigned: Object.values(this.value.improvements ?? {}).reduce((n, c) => n + c, 0),
      total: this.configuration.points + Object.values(this.configuration.fixed).reduce((t, v) => t + v, 0)
    };
  }

  /* -------------------------------------------- */
  /*  Display Methods                             */
  /* -------------------------------------------- */

  /** @inheritdoc */
  titleForLevel(level, { configMode=false }={}) {
    if ( this.value.selected !== "feat" ) return this.title;
    return game.i18n.localize("DND5E.Feature.Feat");
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  summaryForLevel(level, { configMode=false }={}) {
    if ( (this.value.type === "feat") && this.value.feat ) {

      const id = Object.keys(this.value.feat)[0];
      const feat = this.actor.items.get(id);
      if ( feat ) return feat.toAnchor({classes: ["content-link"]}).outerHTML;

    } else if ( (this.value.type === "asi") && this.value.assignments ) {

      const formatter = new Intl.NumberFormat(game.i18n.lang, { signDisplay: "always" });
      return Object.entries(this.value.assignments).reduce((html, [key, value]) => {
        const name = CONFIG.DND5E.abilities[key]?.label ?? key;
        html += `<span class="tag">${name} <strong>${formatter.format(value)}</strong></span>\n`;
        return html;
      }, "");

    }
    return "";
  }

  /* -------------------------------------------- */
  /*  Application Methods                         */
  /* -------------------------------------------- */

  /** @inheritdoc */
  async apply(level, data) {
    if ( data.type === "asi" ) {
      const assignments = foundry.utils.mergeObject(this.configuration.fixed, data.assignments, {inplace: false});
      const updates = {};
      for ( const key of Object.keys(assignments) ) {
        const ability = this.actor.system.abilities[key];
        if ( !ability ) continue;
        assignments[key] = Math.min(assignments[key], ability.max - ability.value);
        if ( assignments[key] ) updates[`system.abilities.${key}.value`] = ability.value + assignments[key];
        else delete assignments[key];
      }
      data.assignments = assignments;
      data.feat = null;
      this.actor.updateSource(updates);
    }

    else {
      let itemData = data.retainedItems?.[data.featUuid];
      if ( !itemData ) {
        const source = await fromUuid(data.featUuid);
        if ( source ) {
          itemData = source.clone({
            _id: foundry.utils.randomID(),
            "flags.dnd5e.sourceId": data.featUuid,
            "flags.dnd5e.advancementOrigin": `${this.item.id}.${this.id}`
          }, {keepId: true}).toObject();
        }
      }
      data.assignments = null;
      if ( itemData ) {
        data.feat = { [itemData._id]: data.featUuid };
        this.actor.updateSource({items: [itemData]});
      }
    }

    this.updateSource({value: data});
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  restore(level, data) {
    data.featUuid = Object.values(data.feat ?? {})[0];
    this.apply(level, data);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  reverse(level) {
    const source = foundry.utils.deepClone(this.value);

    if ( this.value.type === "asi" ) {
      const updates = {};
      for ( const [key, change] of Object.entries(this.value.assignments ?? {}) ) {
        const ability = this.actor.system.abilities[key];
        if ( !ability ) continue;
        updates[`system.abilities.${key}.value`] = ability.value - change;
      }
      this.actor.updateSource(updates);
    }

    else {
      const [id, uuid] = Object.entries(this.value.feat ?? {})[0] ?? [];
      const item = this.actor.items.get(id);
      if ( item ) source.retainedItems = {[uuid]: item.toObject()};
      this.actor.items.delete(id);
    }

    this.updateSource({ "value.assignments": null, "value.feat": null });
    return source;
  }
}
