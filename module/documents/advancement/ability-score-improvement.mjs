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

  /** @inheritDoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      dataModels: {
        configuration: AbilityScoreImprovementConfigurationData,
        value: AbilityScoreImprovementValueData
      },
      order: 20,
      icon: "icons/magic/symbols/star-solid-gold.webp",
      typeIcon: "systems/dnd5e/icons/svg/ability-score-improvement.svg",
      title: game.i18n.localize("DND5E.ADVANCEMENT.AbilityScoreImprovement.Title"),
      hint: game.i18n.localize("DND5E.ADVANCEMENT.AbilityScoreImprovement.Hint"),
      apps: {
        config: AbilityScoreImprovementConfig,
        flow: AbilityScoreImprovementFlow
      }
    });
  }

  /* -------------------------------------------- */
  /*  Preparation Methods                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _preCreate(data) {
    if ( super._preCreate(data) === false ) return false;
    if ( this.item.type !== "class" || foundry.utils.hasProperty(data, "configuration.points") ) return;
    this.updateSource({"configuration.points": 2});
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
      assigned: Object.entries(this.value.assignments ?? {}).reduce((n, [abl, c]) => {
        if ( this.canImprove(abl) ) n += c;
        return n;
      }, 0),
      total: this.configuration.points + Object.entries(this.configuration.fixed).reduce((t, [abl, v]) => {
        if ( this.canImprove(abl) ) t += v;
        return t;
      }, 0)
    };
  }

  /* -------------------------------------------- */
  /*  Instance Methods                            */
  /* -------------------------------------------- */

  /**
   * Is this ability allowed to be improved?
   * @param {string} ability  The ability key.
   * @returns {boolean}
   */
  canImprove(ability) {
    return CONFIG.DND5E.abilities[ability]?.improvement !== false;
  }

  /* -------------------------------------------- */
  /*  Display Methods                             */
  /* -------------------------------------------- */

  /** @inheritDoc */
  summaryForLevel(level, { configMode=false }={}) {
    const formatter = new Intl.NumberFormat(game.i18n.lang, { signDisplay: "always" });
    if ( configMode ) {
      const entries = Object.entries(this.configuration.fixed).map(([key, value]) => {
        if ( !value ) return null;
        const name = CONFIG.DND5E.abilities[key]?.label ?? key;
        return `<span class="tag">${name} <strong>${formatter.format(value)}</strong></span>`;
      });
      if ( this.configuration.points ) entries.push(`<span class="tag">${
        game.i18n.localize("DND5E.ADVANCEMENT.AbilityScoreImprovement.FIELDS.points.label")}: <strong>${
        this.configuration.points}</strong></span>`
      );
      return entries.filterJoin("\n");
    }

    const parts = [];
    if ( this.value.feat ) {
      const id = Object.keys(this.value.feat)[0];
      const feat = this.actor.items.get(id);
      if ( feat ) parts.push(feat.toAnchor({classes: ["content-link"]}).outerHTML);
    }

    parts.push(...Object.entries(this.value.assignments ?? {}).map(([key, value]) => {
      const name = CONFIG.DND5E.abilities[key]?.label ?? key;
      return `<span class="tag">${name} <strong>${formatter.format(value)}</strong></span>`;
    }));

    return parts.filterJoin(" ");
  }

  /* -------------------------------------------- */
  /*  Application Methods                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async apply(level, data) {
    let feat;
    const updates = {};
    if ( data.featUuid ) {
      feat = data.retainedItems?.[data.featUuid];
      if ( !feat ) feat = await this.createItemData(data.featUuid);
      if ( feat ) {
        data.feat = { [feat._id]: data.featUuid };
        updates.items = [feat];
      }
    }
    delete data.featUuid;
    delete data.retainedItems;

    data.assignments ??= {};
    const fixedAbility = feat?.system.asi.abilities.length === 1 ? feat.system.asi.abilities[0] : null;
    for ( const key of Object.keys(CONFIG.DND5E.abilities) ) {
      const ability = this.actor.system.abilities[key];
      const source = this.actor.system.toObject().abilities[key] ?? {};
      if ( !ability || !this.canImprove(key) ) continue;
      const assignment = data.assignments[key] ?? 0;
      const fixed = feat ? fixedAbility === key ? 1 : 0 : this.configuration.fixed[key] ?? 0;
      data.assignments[key] = Math.min(assignment + fixed, (feat?.system.asi.maximum ?? ability.max) - source.value);
      if ( data.assignments[key] ) updates[`system.abilities.${key}.value`] = source.value + data.assignments[key];
      else delete data.assignments[key];
    }

    this.actor.updateSource(updates);
    this.updateSource({ value: data });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  restore(level, data) {
    data.featUuid = Object.values(data.feat ?? {})[0];
    this.apply(level, data);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  reverse(level) {
    const source = this.value.toObject();

    const [id, uuid] = Object.entries(this.value.feat ?? {})[0] ?? [];
    const feat = this.actor.items.get(id);
    if ( feat ) source.retainedItems = { [uuid]: feat.toObject() };
    this.actor.items.delete(id);

    const updates = {};
    const fixedAbility = feat?.system.asi.abilities.length === 1 ? feat.system.asi.abilities[0] : null;
    for ( const [key, change] of Object.entries(this.value.assignments ?? {}) ) {
      const ability = this.actor.system.toObject().abilities[key];
      if ( !ability || !this.canImprove(key) ) continue;
      updates[`system.abilities.${key}.value`] = ability.value - change;
      const fixed = feat ? fixedAbility === key ? 1 : 0 : this.configuration.fixed[key] ?? 0;
      source.assignments[key] -= fixed;
    }
    this.actor.updateSource(updates);

    this.updateSource({ "value.assignments": null, "value.feat": null });
    return source;
  }
}
