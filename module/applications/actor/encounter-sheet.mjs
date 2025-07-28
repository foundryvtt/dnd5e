import Award from "../award.mjs";
import MultiActorSheet from "./api/multi-actor-sheet.mjs";
import { parseInputDelta } from "../../utils.mjs";

/**
 * Extension of the base actor sheet for encounter actors.
 */
export default class EncounterActorSheet extends MultiActorSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    actions: {
      award: EncounterActorSheet.#onAward,
      decrease: EncounterActorSheet.#onDecrease,
      increase: EncounterActorSheet.#onIncrease,
      rollQuantities: EncounterActorSheet.#onRollQuantities,
      rollQuantity: EncounterActorSheet.#onRollQuantity
    },
    classes: ["encounter"],
    position: {
      width: 500,
      height: "auto"
    },
    window: {
      resizable: false
    },
    tab: "members"
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    header: {
      template: "systems/dnd5e/templates/actors/encounter/header.hbs"
    },
    tabs: {
      template: "systems/dnd5e/templates/shared/horizontal-tabs.hbs",
      templates: ["templates/generic/tab-navigation.hbs"]
    },
    members: {
      container: { classes: ["tab-body"], id: "tabs" },
      template: "systems/dnd5e/templates/actors/encounter/members.hbs",
      scrollable: [""]
    },
    inventory: {
      container: { classes: ["tab-body"], id: "tabs" },
      template: "systems/dnd5e/templates/actors/tabs/actor-inventory.hbs",
      templates: ["systems/dnd5e/templates/inventory/inventory.hbs"],
      scrollable: [""]
    },
    description: {
      container: { classes: ["tab-body"], id: "tabs" },
      template: "systems/dnd5e/templates/actors/group/biography.hbs",
      scrollable: [""]
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static TABS = [
    { tab: "members", label: "DND5E.ENCOUNTER.Tab.Members" },
    { tab: "inventory", label: "DND5E.ENCOUNTER.Tab.Loot" },
    { tab: "description", label: "DND5E.ENCOUNTER.Tab.Description" }
  ];

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @override */
  tabGroups = {
    primary: "members"
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the header.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {ApplicationRenderContext}
   * @protected
   */
  async _prepareHeaderContext(context, options) {
    const difficulty = await this.actor.system.getDifficulty();
    context.subtitles = [];
    if ( difficulty ) context.subtitles.push(game.i18n.localize(`DND5E.ENCOUNTER.Difficulty.${difficulty}`));
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareInventoryContext(context, options) {
    context = await super._prepareInventoryContext(context, options);
    const Inventory = customElements.get(this.options.elements.inventory);
    const inventory = Object.values(CONFIG.Item.dataModels)
      .filter(model => "inventorySection" in model)
      .map(model => {
        const section = model.inventorySection;
        if ( foundry.utils.isSubclass(model, dnd5e.dataModels.item.ContainerData) ) return section;
        return { ...section, columns: ["price", "weight", "quantity", "controls"] };
      });
    inventory.push(foundry.utils.deepClone(Inventory.SECTIONS.contents));
    inventory.at(-1).items = context.itemCategories.inventory ?? [];
    inventory.forEach(s => s.minWidth = 190);
    context.sections = Inventory.prepareSections(inventory);
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare context for the members of the encounter.
   * @param {ApplicationRenderContext} context  Shared context provided by _prepareContext.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {Promise<ApplicationRenderContext>}
   * @protected
   */
  async _prepareMembersContext(context, options) {
    const formatter = new Intl.NumberFormat(game.i18n.lang);
    const members = await this.actor.system.getMembers();
    context.members = await Promise.all(members.map(async ({ actor, quantity }, index) => {
      if ( actor.type !== "npc" ) return null;
      const { name, system, uuid } = actor;
      const member = { index, name, quantity, uuid };
      member.cr = system.details.cr;
      member.subtitle = [
        CONFIG.DND5E.actorSizes[system.traits.size]?.label,
        system.details.type.label,
        game.i18n.format("DND5E.ExperiencePoints.Format", { value: formatter.format(system.details.xp.value) })
      ].filterJoin(" • ");
      member.underlay = `var(--underlay-npc-${system.details.type.value})`;
      member.showFormula = context.editable || (quantity.formula && !quantity.value);
      member.showQuantity = context.editable || quantity.value || !quantity.formula;
      member.showRoll = !context.editable && quantity.formula;
      await this._prepareMemberPortrait(actor, member);
      return member;
    }));
    context.members = context.members.filter(_ => _).sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));

    // Difficulty
    const { party } = game.actors;
    const { creatures, level } = party?.system ?? {};
    const [low, med, high] = (CONFIG.DND5E.ENCOUNTER_DIFFICULTY[level] ?? []).map(t => t * creatures.length);
    const xp = await this.actor.system.getXPValue();

    context.difficulty = {
      value: xp,
      max: high ?? Infinity,
      pct: high ? Math.min((xp / high) * 100, 100) : 0,
      stops: { low: high ? (low / high) * 100 : 0, high: high ? (med / high) * 100 : 0 }
    };

    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    switch ( partId ) {
      case "description": return this._prepareDescriptionContext(context, options);
      case "header": return this._prepareHeaderContext(context, options);
      case "inventory": return this._prepareInventoryContext(context, options);
      case "members": return this._prepareMembersContext(context, options);
    }
    return context;
  }

  /* -------------------------------------------- */
  /*  Item Preparation Helpers                    */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _prepareItem(item, ctx) {
    super._prepareItem(item, ctx);
    delete ctx.activities;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareItemPhysical(item, ctx) {
    await super._prepareItemPhysical(item, ctx);
    delete ctx.equip;
    delete ctx.attunement;
  }

  /* -------------------------------------------- */
  /*  Event Listeners & Handlers                  */
  /* -------------------------------------------- */

  /**
   * Handle incrementing or decrementing a numeric input.
   * @param {HTMLInputElement} input  The input.
   * @param {number} delta            The delta.
   * @protected
   */
  _onAdjustInput(input, delta) {
    const min = input.min ? Number(input.min) : -Infinity;
    const max = input.max ? Number(input.max) : Infinity;
    let value = Number(input.value);
    if ( Number.isNaN(value) ) return;
    value += delta;
    input.value = Math.clamp(value, min, max);
    input._debouncedChange ??= foundry.utils.debounce(() => {
      input.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
    }, 250);
    input._debouncedChange();
  }

  /* -------------------------------------------- */

  /**
   * Handle distributing XP & currency.
   * @this {MultiActorSheet}
   */
  static async #onAward() {
    new Award({
      award: {
        currency: { ...this.actor.system.currency },
        savedDestinations: this.actor.getFlag("dnd5e", "awardDestinations"),
        xp: await this.actor.system.getXPValue()
      }
    }).render({ force: true });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onChangeForm(formConfig, event) {
    const { name } = event.target.dataset;
    const index = Number(event.target.closest("[data-index]")?.dataset.index);
    if ( Number.isNaN(index) || !name ) return super._onChangeForm(formConfig, event);
    const members = this.actor.system.toObject().members;
    foundry.utils.setProperty(members[index], name, event.target.value);
    this.actor.update({ "system.members": members });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onChangeInputDelta(event) {
    super._onChangeInputDelta(event);
    const { name } = event.target.dataset;
    const index = Number(event.target.closest("[data-index]")?.dataset.index);
    if ( Number.isNaN(index) || !name ) return;
    const members = this.actor.system.toObject().members;
    const member = members[index];
    const result = parseInputDelta(event.target, member);
    if ( result !== undefined ) {
      foundry.utils.setProperty(member, name, result);
      this.actor.update({ "system.members": members });
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle the decrementing a member's quantity.
   * @this {EncounterActorSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static #onDecrease(event, target) {
    if ( !target.matches(".member .adjustment-button") ) return;
    this._onAdjustInput(target.parentElement.querySelector("input"), -1);
  }

  /* -------------------------------------------- */

  /**
   * Handle the incrementing a member's quantity.
   * @this {EncounterActorSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static #onIncrease(event, target) {
    if ( !target.matches(".member .adjustment-button") ) return;
    this._onAdjustInput(target.parentElement.querySelector("input"), 1);
  }

  /* -------------------------------------------- */

  /**
   * Handle rolling for all member quantities.
   */
  static async #onRollQuantities() {
    this.actor.system.rollQuantities();
  }

  /* -------------------------------------------- */

  /**
   * Handle rolling the quantity of a member.
   * @this {EncounterActorSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static async #onRollQuantity(event, target) {
    const index = Number(target.closest("[data-index]")?.dataset.index);
    if ( Number.isNaN(index) ) return;
    const members = this.actor.system.toObject().members;
    const member = members[index];
    if ( !member?.quantity?.formula ) return;
    const roll = new Roll(member.quantity.formula);
    await roll.evaluate();
    if ( roll.total ) {
      member.quantity.value = roll.total;
      this.actor.update({ "system.members": members });
    }
  }

  /* -------------------------------------------- */
  /*  Life-Cycle Handlers                         */
  /* -------------------------------------------- */

  /** @override */
  _saveSheetPosition() {}
}
