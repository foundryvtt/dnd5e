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

  /**
   * Level above which any ASI will be considered an Epic Boon when using the modern rules.
   * @type {number}
   */
  static EPIC_BOON_LEVEL = 19;

  /* -------------------------------------------- */
  /*  Preparation Methods                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  get _defaultTitle() {
    if ( this.isEpicBoon ) return game.i18n.localize("DND5E.ADVANCEMENT.AbilityScoreImprovement.TitleEpic");
    return super._defaultTitle;
  }

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
    return (this.item.type === "class") && (game.settings.get("dnd5e", "allowFeats")
      || game.settings.get("dnd5e", "rulesVersion") === "modern");
  }

  /* -------------------------------------------- */

  /**
   * Should this be considered an epic boon feat?
   * @type {boolean}
   */
  get isEpicBoon() {
    return (this.level >= AbilityScoreImprovementAdvancement.EPIC_BOON_LEVEL)
      && (this.item.type === "class")
      && (this.item.system.source?.rules ? (this.item.system.source.rules === "2024")
        : (game.settings.get("dnd5e", "rulesVersion") === "modern"));
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
  titleForLevel(level, { configMode=false }={}) {
    if ( this.value.selected !== "feat" ) return this.title;
    return game.i18n.localize("DND5E.Feature.Feat");
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  summaryForLevel(level, { configMode=false }={}) {
    const formatter = new Intl.NumberFormat(game.i18n.lang, { signDisplay: "always" });
    if ( configMode && this.isEpicBoon ) {
      return dnd5e.utils.linkForUuid(this.configuration.recommendation);
    }

    else if ( configMode ) {
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

    else if ( (this.value.type === "feat") && this.value.feat ) {
      const id = Object.keys(this.value.feat)[0];
      const feat = this.actor.items.get(id);
      if ( feat ) return feat.toAnchor({classes: ["content-link"]}).outerHTML;
    }

    else if ( (this.value.type === "asi") && this.value.assignments ) {
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

  /** @inheritDoc */
  async apply(level, data) {
    if ( data.type === "asi" ) {
      const assignments = Object.keys(CONFIG.DND5E.abilities).reduce((obj, key) => {
        obj[key] = (this.configuration.fixed[key] ?? 0) + (data.assignments[key] ?? 0);
        return obj;
      }, {});
      const updates = {};
      for ( const key of Object.keys(assignments) ) {
        const ability = this.actor.system.abilities[key];
        const source = this.actor.system.toObject().abilities[key] ?? {};
        if ( !ability || !this.canImprove(key) ) continue;
        const max = Math.max(ability.max, this.configuration.max ?? -Infinity);
        assignments[key] = Math.min(assignments[key], max - source.value);
        if ( assignments[key] ) updates[`system.abilities.${key}.value`] = source.value + assignments[key];
        else delete assignments[key];
      }
      data.assignments = assignments;
      data.feat = null;
      this.actor.updateSource(updates);
    }

    else {
      let itemData = data.retainedItems?.[data.featUuid];
      if ( !itemData ) itemData = await this.createItemData(data.featUuid);
      data.assignments = null;
      if ( itemData ) {
        data.feat = { [itemData._id]: data.featUuid };
        this.actor.updateSource({items: [itemData]});
      }
    }

    delete data.featUuid;
    delete data.retainedItems;
    this.updateSource({value: data});
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

    if ( this.value.type === "asi" ) {
      const updates = {};
      for ( const [key, change] of Object.entries(this.value.assignments ?? {}) ) {
        const ability = this.actor.system.toObject().abilities[key];
        if ( !ability || !this.canImprove(key) ) continue;
        updates[`system.abilities.${key}.value`] = ability.value - change;
        source.assignments[key] -= (this.configuration.fixed[key] ?? 0);
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
