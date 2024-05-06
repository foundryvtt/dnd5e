import ActorSheet5eNPC from "./npc-sheet.mjs";
import ActorSheetV2Mixin from "./sheet-v2-mixin.mjs";

/**
 * An Actor sheet for NPCs.
 * @mixes ActorSheetV2
 */
export default class ActorSheet5eNPC2 extends ActorSheetV2Mixin(ActorSheet5eNPC) {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e2", "sheet", "actor", "npc"],
      width: 700,
      height: 700,
      resizable: true
    });
  }

  /* -------------------------------------------- */

  get template() {
    if ( !game.user.isGM && this.actor.limited ) return "systems/dnd5e/templates/actors/limited-sheet-2.hbs";
    return "systems/dnd5e/templates/actors/npc-sheet-2.hbs";
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async getData(options) {
    const context = await super.getData(options);
    const { attributes, details, resources } = this.actor.system;

    // Sidebar
    context.sidebarCollapsed = !!game.user.getFlag("dnd5e", "sheetPrefs.npc.tabs.details.collapseSidebar");
    if ( context.sidebarCollapsed ) context.cssClass += " collapsed";

    // CR
    context.labels.cr = {
      "0.125": "&frac18;",
      "0.25": "&frac14;",
      "0.5": "&frac12;"
    }[details.cr] ?? details.cr;

    // Ability Scores
    Object.entries(context.abilities).forEach(([k, ability]) => {
      ability.key = k;
      ability.abbr = CONFIG.DND5E.abilities[k]?.abbreviation ?? "";
      ability.sign = ability.mod < 0 ? "-" : "+";
      ability.mod = Math.abs(ability.mod);
      ability.baseValue = context.source.abilities[k]?.value ?? 0;
      ability.icon = CONFIG.DND5E.abilities[k]?.icon;
    });

    // Saving Throws
    context.saves = {};
    for ( const ability of Object.values(context.abilities) ) {
      const save = context.saves[ability.key] = {};
      save.sign = ability.save < 0 ? "-" : "+";
      save.mod = Math.abs(ability.save);
    }

    // Show Death Saves
    context.showDeathSaves = this.actor.getFlag("dnd5e", "showDeathSaves");

    // Proficiency
    context.prof = {
      mod: attributes.prof,
      sign: attributes.prof < 0 ? "-" : "+"
    };

    // Speed
    context.speed = Object.entries(CONFIG.DND5E.movementTypes).reduce((obj, [k, label]) => {
      const value = attributes.movement[k];
      if ( value ) obj[k] = { label, value };
      return obj;
    }, {});

    // Skills & Tools
    context.skills = Object.fromEntries(Object.entries(context.skills).filter(([, v]) => v.value));

    // Senses
    context.senses.passivePerception = {
      label: game.i18n.localize("DND5E.PassivePerception"), value: context.skills.prc.passive
    };

    // Legendary Actions & Resistances
    const plurals = new Intl.PluralRules(game.i18n.lang, { type: "ordinal" });
    ["legact", "legres"].forEach(res => {
      const { max, value } = resources[res];
      context[res] = Array.fromRange(max, 1).map(n => {
        const i18n = res === "legact" ? "LegAct" : "LegRes";
        const filled = value >= n;
        const classes = ["pip"];
        if ( filled ) classes.push("filled");
        return {
          n, filled,
          tooltip: `DND5E.${i18n}`,
          label: game.i18n.format(`DND5E.${i18n}N.${plurals.select(n)}`, { n }),
          classes: classes.join(" ")
        };
      });
    });

    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".short-rest").on("click", this._onShortRest.bind(this));
    html.find(".long-rest").on("click", this._onLongRest.bind(this));
  }

  /* -------------------------------------------- */

  /** @override */
  _prepareItem(item, ctx) {
    const { system } = item;

    // To Hit
    const toHit = parseInt(item.labels.modifier);
    if ( item.hasAttack && !isNaN(toHit) ) {
      ctx.toHit = {
        sign: toHit < 0 ? "-" : "+",
        abs: Math.abs(toHit)
      };
    }

    ctx.subtitle = [system.type?.label, item.isActive ? item.labels.activation : null].filterJoin(" &bull; ");
  }

  /* -------------------------------------------- */

  /**
   * Take a short rest, calling the relevant function on the Actor instance.
   * @param {Event} event             The triggering click event.
   * @returns {Promise<RestResult>}  Result of the rest action.
   * @private
   */
  async _onShortRest(event) {
    event.preventDefault();
    await this._onSubmit(event);
    return this.actor.shortRest();
  }

  /* -------------------------------------------- */

  /**
   * Take a long rest, calling the relevant function on the Actor instance.
   * @param {Event} event             The triggering click event.
   * @returns {Promise<RestResult>}  Result of the rest action.
   * @private
   */
  async _onLongRest(event) {
    event.preventDefault();
    await this._onSubmit(event);
    return this.actor.longRest();
  }

  /* -------------------------------------------- */

  /** @override */
  _onToggleSidebar() {
    const collapsed = this._toggleSidebar();
    game.user.setFlag("dnd5e", "sheetPrefs.npc.tabs.details.collapseSidebar", collapsed);
  }
}
