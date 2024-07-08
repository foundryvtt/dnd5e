import ActorSheet5eNPC from "./npc-sheet.mjs";
import ActorSheetV2Mixin from "./sheet-v2-mixin.mjs";
import { simplifyBonus } from "../../utils.mjs";

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
      resizable: true,
      scrollY: [".sheet-body"],
      tabs: [{ navSelector: ".tabs", contentSelector: ".tab-body", initial: "features" }]
    });
  }

  /** @override */
  static TABS = [
    { tab: "features", label: "DND5E.Features", icon: "fas fa-list" },
    { tab: "inventory", label: "DND5E.Inventory", svg: "backpack" },
    { tab: "spells", label: "TYPES.Item.spellPl", icon: "fas fa-book" },
    { tab: "effects", label: "DND5E.Effects", icon: "fas fa-bolt" },
    { tab: "biography", label: "DND5E.Biography", icon: "fas fa-feather" }
  ];

  /* -------------------------------------------- */

  get template() {
    if ( !game.user.isGM && this.actor.limited ) return "systems/dnd5e/templates/actors/limited-sheet-2.hbs";
    return "systems/dnd5e/templates/actors/npc-sheet-2.hbs";
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _renderOuter() {
    const html = await super._renderOuter();
    const source = document.createElement("div");
    source.classList.add("source-book");
    source.innerHTML = `
      <span></span>
      <a class="config-button" data-action="source" data-tooltip="DND5E.SourceConfig"
         aria-label="${game.i18n.localize("DND5E.SourceConfig")}">
        <i class="fas fa-cog"></i>
      </a>
    `;
    html[0].querySelector(".window-title")?.insertAdjacentElement("afterend", source);
    source.querySelector(".config-button").addEventListener("click", this._onConfigMenu.bind(this));
    return html;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _render(force=false, options={}) {
    await super._render(force, options);
    const [source] = this.element.find(".source-book");
    if ( !source ) return;
    const sourceEditable = this.isEditable && (this._mode === this.constructor.MODES.EDIT);
    source.querySelector(".config-button")?.toggleAttribute("hidden", !sourceEditable);
    source.querySelector(":scope > span").innerText = this.actor.system.details.source.label;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async getData(options) {
    const context = await super.getData(options);
    const { attributes, resources } = this.actor.system;
    context.encumbrance = attributes.encumbrance;

    // Ability Scores
    Object.entries(context.abilities).forEach(([k, ability]) => {
      ability.key = k;
      ability.abbr = CONFIG.DND5E.abilities[k]?.abbreviation ?? "";
      ability.baseValue = context.source.abilities[k]?.value ?? 0;
      ability.icon = CONFIG.DND5E.abilities[k]?.icon;
    });

    // Show Death Saves
    context.showDeathSaves = !foundry.utils.isEmpty(this.actor.classes)
      || this.actor.getFlag("dnd5e", "showDeathSaves");

    // Speed
    context.speed = Object.entries(CONFIG.DND5E.movementTypes).reduce((obj, [k, label]) => {
      const value = attributes.movement[k];
      if ( value ) {
        obj[k] = { label, value };
        if ( (k === "fly") && attributes.movement.hover ) obj.fly.icons = [{
          icon: "fas fa-cloud", label: game.i18n.localize("DND5E.MovementHover")
        }];
      }
      return obj;
    }, {});

    // Skills & Tools
    context.skills = Object.fromEntries(Object.entries(context.skills).filter(([, v]) => v.value));

    // Senses
    context.senses.passivePerception = {
      label: game.i18n.localize("DND5E.PassivePerception"), value: this.actor.system.skills.prc.passive
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
    context.hasLegendaries = resources.legact.max || resources.legres.max || resources.lair.initiative;

    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _prepareItems(context) {
    super._prepareItems(context);
    const classes = [];
    const inventory = {};
    const inventoryTypes = Object.entries(CONFIG.Item.dataModels)
      .filter(([, model]) => model.metadata?.inventoryItem)
      .sort(([, lhs], [, rhs]) => (lhs.metadata.inventoryOrder - rhs.metadata.inventoryOrder));
    for ( const [type] of inventoryTypes ) {
      inventory[type] = { label: `${CONFIG.Item.typeLabels[type]}Pl`, items: [], dataset: { type } };
      if ( type === "container" ) context.containers = inventory.container.items;
    }
    const features = context.features.filter(section => {
      if ( section.dataset.type === "loot" ) {
        section.items.forEach(i => inventory[i.type]?.items.push(i));
        return false;
      }
      if ( (section.dataset.type === "feat") ) {
        if ( !("activation.type" in section.dataset) ) section.dataset.type = "passive";
        for ( let i = section.items.length; i--; ) {
          const item = section.items[i];
          if ( (item.type === "class") || (item.type === "subclass") ) {
            classes.push(item);
            section.items.splice(i, 1);
            context.itemContext[item.id].prefixedImage = item.img ? foundry.utils.getRoute(item.img) : null;
          }
        }
      }
      if ( section.dataset.type === "weapon" ) inventory.weapon.items = section.items;
      return true;
    });
    // TODO: These labels should be pluralised.
    Object.entries(CONFIG.DND5E.abilityActivationTypes).forEach(([type, label]) => features.push({
      label, items: [], hasActions: true, dataset: { type }
    }));
    context.features = {
      sections: features,
      filters: [
        { key: "action", label: "DND5E.Action" },
        { key: "bonus", label: "DND5E.BonusAction" },
        { key: "reaction", label: "DND5E.Reaction" },
        { key: "legendary", label: "DND5E.LegendaryActionLabel" },
        { key: "lair", label: "DND5E.LairActionLabel" }
      ]
    };
    features.forEach(section => {
      section.categories = [
        { classes: "item-uses", label: "DND5E.Uses", partial: "dnd5e.column-uses" },
        { classes: "item-roll", label: "DND5E.SpellHeader.Roll", partial: "dnd5e.column-roll" },
        { classes: "item-formula", label: "DND5E.SpellHeader.Formula", partial: "dnd5e.column-formula" },
        { classes: "item-controls", partial: "dnd5e.column-feature-controls" }
      ];
    });
    context.inventory = Object.values(inventory);
    context.inventory.push({ label: "DND5E.Contents", items: [], dataset: { type: "all" } });
    context.classes = classes;
    context.hasClasses = classes.length;
  }

  /* -------------------------------------------- */
  /*  Event Listeners & Handlers                  */
  /* -------------------------------------------- */

  /** @inheritDoc */
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".short-rest").on("click", this._onShortRest.bind(this));
    html.find(".long-rest").on("click", this._onLongRest.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * Take a short rest, calling the relevant function on the Actor instance.
   * @param {Event} event             The triggering click event.
   * @returns {Promise<RestResult>}  Result of the rest action.
   * @protected
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
   * @protected
   */
  async _onLongRest(event) {
    event.preventDefault();
    await this._onSubmit(event);
    return this.actor.longRest();
  }
}
