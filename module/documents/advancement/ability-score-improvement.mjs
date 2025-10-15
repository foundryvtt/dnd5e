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
    this.updateSource({ "configuration.points": 2 });
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

  /**
   * @typedef SubclassAdvancementApplicationData
   * @property {Record<string, number>} [assignments]    Changes to specific ability scores.
   * @property {Record<string, object>} [retainedItems]  Item data grouped by UUID.
   * @property {"asi"|"feat"} [type]                     Type of ASI being handled.
   * @property {string} [uuid]                           UUID of the feat item to add.
   */

  /** @inheritDoc */
  async apply(level, data, options={}) {
    const value = { type: data.type ?? this.value.type };
    if ( value.type && (data.type !== value.type) ) await this.reverse(level);

    if ( options.initial ) {
      if ( Object.values(this.configuration.fixed).some(v => v) ) {
        data.assignments = this.toObject().configuration.fixed;
      }
      if ( data.assignments || !this.allowFeat ) value.type = "asi";
      else value.type = null;
    }

    if ( (value.type === "asi") && !foundry.utils.isEmpty(data.assignments) ) {
      const updates = {};
      value.assignments = {};
      for ( let [key, delta] of Object.entries(data.assignments) ) {
        const ability = this.actor.system.abilities[key];
        const source = this.actor.system._source.abilities[key] ?? {};
        if ( !ability || !this.canImprove(key) ) continue;
        const max = Math.max(ability.max, this.configuration.max ?? -Infinity);
        delta = Math.min(delta, max - source.value);
        if ( delta ) {
          updates[`system.abilities.${key}.value`] = source.value + delta;
          value.assignments[key] = (this.value.assignments?.[key] ?? 0) + delta;
        }
      }
      if ( foundry.utils.isEmpty(value.assignments) ) delete value.assignments;
      this.actor.updateSource(updates);
    }

    else if ( (value.type === "feat") && data.uuid ) {
      if ( this.actor.items.get(Object.keys(this.value.feat ?? {})[0]) ) await this.reverse(this.level);

      let itemData = data.retainedItems?.[data.uuid];
      if ( !itemData ) itemData = await this.createItemData(data.uuid);
      if ( itemData ) {
        value.feat = { [itemData._id]: data.uuid };
        this.actor.updateSource({ items: [itemData] });
      }
    }

    this.updateSource({ value });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  restore(level, data) {
    data.uuid = Object.values(data.feat ?? {})[0];
    this.apply(level, data);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  reverse(level, options={}) {
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
      if ( item ) source.retainedItems = { [uuid]: item.toObject() };
      this.actor.items.delete(id);
      this.actor.reset();
    }

    this.updateSource({
      value: { assignments: null, feat: null, type: null }
    });
    return source;
  }
}
