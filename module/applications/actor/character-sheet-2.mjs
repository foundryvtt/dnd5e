import ActorSheet5eCharacter from "./character-sheet.mjs";
import * as Trait from "../../documents/actor/trait.mjs";
import Tabs5e from "../tabs.mjs";

/**
 * An Actor sheet for player character type actors.
 */
export default class ActorSheet5eCharacter2 extends ActorSheet5eCharacter {
  constructor(object, options={}) {
    const { width, height } = game.user.getFlag("dnd5e", "sheetPrefs.character") ?? {};
    if ( width && !("width" in options) ) options.width = width;
    if ( height && !("height" in options) ) options.height = height;
    super(object, options);
  }

  /** @inheritDoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e2", "sheet", "actor", "character"],
      tabs: [{ navSelector: ".tabs", contentSelector: ".tab-body", initial: "details" }],
      dragDrop: [
        { dragSelector: ".item-list .item", dropSelector: null },
        { dragSelector: ".containers .container", dropSelector: null }
      ],
      scrollY: [".main-content"],
      width: 800,
      height: 1000,
      resizable: true
    });
  }

  /**
   * Available sheet modes.
   * @enum {number}
   */
  static MODES = {
    PLAY: 1,
    EDIT: 2
  };

  /**
   * Proficiency class names.
   * @enum {string}
   */
  static PROFICIENCY_CLASSES = {
    "0": "none",
    "0.5": "half",
    "1": "full",
    "2": "double"
  };

  /**
   * @typedef {object} SheetTabDescriptor5e
   * @property {string} tab     The tab key.
   * @property {string} label   The tab label's localization key.
   * @property {string} [icon]  A font-awesome icon.
   * @property {string} [svg]   An SVG icon.
   */

  /**
   * Sheet tabs.
   * @type {SheetTabDescriptor5e[]}
   */
  static TABS = [
    { tab: "details", label: "DND5E.Details", icon: "fas fa-cog" },
    { tab: "inventory", label: "DND5E.Inventory", svg: "backpack" },
    { tab: "features", label: "DND5E.Features", icon: "fas fa-list" },
    { tab: "spells", label: "TYPES.Item.spellPl", icon: "fas fa-book" },
    { tab: "effects", label: "DND5E.Effects", icon: "fas fa-bolt" },
    { tab: "biography", label: "DND5E.Biography", icon: "fas fa-feather" }
  ];

  /**
   * The mode the sheet is currently in.
   * @type {ActorSheet5eCharacter2.MODES}
   * @protected
   */
  _mode = this.constructor.MODES.PLAY;

  /**
   * Whether the user has manually opened the death save tray.
   * @type {boolean}
   * @protected
   */
  _deathTrayOpen = false;

  /* -------------------------------------------- */

  /** @override */
  get template() {
    return "systems/dnd5e/templates/actors/character-sheet-2.hbs";
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _renderOuter() {
    const html = await super._renderOuter();
    const header = html[0].querySelector(".window-header");

    // Add edit <-> play slide toggle.
    if ( this.actor.isOwner ) {
      const toggle = document.createElement("slide-toggle");
      toggle.checked = this._mode === this.constructor.MODES.EDIT;
      toggle.classList.add("mode-slider");
      toggle.dataset.tooltip = "DND5E.SheetModeEdit";
      toggle.setAttribute("aria-label", game.i18n.localize("DND5E.SheetModeEdit"));
      toggle.addEventListener("change", this._onChangeSheetMode.bind(this));
      toggle.addEventListener("dblclick", event => event.stopPropagation());
      header.insertAdjacentElement("afterbegin", toggle);
    }

    // Adjust header buttons.
    header.querySelectorAll(".header-button").forEach(btn => {
      const label = btn.querySelector(":scope > i").nextSibling;
      btn.dataset.tooltip = label.textContent;
      btn.setAttribute("aria-label", label.textContent);
      label.remove();
    });

    // Render tabs.
    const nav = document.createElement("nav");
    nav.classList.add("tabs");
    nav.dataset.group = "primary";
    nav.append(...this.constructor.TABS.map(({ tab, label, icon, svg }) => {
      const item = document.createElement("a");
      item.classList.add("item", "control");
      item.dataset.group = "primary";
      item.dataset.tab = tab;
      item.dataset.tooltip = label;
      item.setAttribute("aria-label", label);
      if ( icon ) item.innerHTML = `<i class="${icon}"></i>`;
      else if ( svg ) item.innerHTML = `<dnd5e-icon src="systems/dnd5e/icons/svg/${svg}.svg"></dnd5e-icon>`;
      return item;
    }));
    html[0].insertAdjacentElement("afterbegin", nav);
    this._tabs = this.options.tabs.map(t => {
      t.callback = this._onChangeTab.bind(this);
      return new Tabs5e(t);
    });

    return html;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _render(force=false, options={}) {
    await super._render(force, options);
    const context = options.renderContext ?? options.action;
    const data = options.renderData ?? options.data;
    const isUpdate = (context === "update") || (context === "updateActor");
    const hp = foundry.utils.getProperty(data ?? {}, "system.attributes.hp.value");
    if ( isUpdate && (hp === 0) ) this._toggleDeathTray(true);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async getData(options) {
    const context = await super.getData(options);
    context.editable = this.isEditable && (this._mode === this.constructor.MODES.EDIT);
    context.cssClass = context.editable ? "editable" : this.isEditable ? "interactable" : "locked";
    const activeTab = this.element.length ? this._tabs?.[0]?.active ?? "details" : "details";
    context.cssClass += ` tab-${activeTab}`;
    const sidebarCollapsed = game.user.getFlag("dnd5e", `sheetPrefs.character.tabs.${activeTab}.collapseSidebar`);
    if ( sidebarCollapsed ) {
      context.cssClass += " collapsed";
      context.sidebarCollapsed = true;
    }
    const { attributes, details, traits } = this.actor.system;

    // Class
    context.labels.class = Object.values(this.actor.classes).sort((a, b) => {
      return b.system.levels - a.system.levels;
    }).map(c => `${c.name} ${c.system.levels}`).join(" / ");

    // Portrait
    const showTokenPortrait = this.actor.getFlag("dnd5e", "showTokenPortrait") === true;
    const token = this.actor.isToken ? this.actor.token : this.actor.prototypeToken;
    context.portrait = {
      token: showTokenPortrait,
      src: showTokenPortrait ? token.texture.src : this.actor.img,
      // TODO: Not sure the best way to update the parent texture from this sheet if this is a token actor.
      path: showTokenPortrait ? this.actor.isToken ? "" : "prototypeToken.texture.src" : "img"
    };

    // Exhaustion
    context.exhaustion = Array.fromRange(6, 1).map(n => {
      const label = game.i18n.format("DND5E.ExhaustionLevel", { n });
      const classes = ["pip"];
      const filled = attributes.exhaustion >= n;
      if ( filled ) classes.push("filled");
      if ( n === 6 ) classes.push("death");
      return { n, label, filled, tooltip: label, classes: classes.join(" ") };
    });

    // Speed
    context.speed = Object.entries(CONFIG.DND5E.movementTypes).reduce((obj, [k, label]) => {
      const value = attributes.movement[k];
      if ( value > obj.value ) Object.assign(obj, { value, label });
      return obj;
    }, { value: 0, label: CONFIG.DND5E.movementTypes.walk });

    // Hit Dice
    context.hd = { value: attributes.hd, max: this.actor.system.details.level };
    context.hd.pct = Math.clamped(context.hd.max ? (context.hd.value / context.hd.max) * 100 : 0, 0, 100);

    // Death Saves
    const plurals = new Intl.PluralRules(game.i18n.lang, { type: "ordinal" });
    context.death = { open: this._deathTrayOpen };
    ["success", "failure"].forEach(deathSave => {
      context.death[deathSave] = [];
      for ( let i = 1; i < 4; i++ ) {
        const n = deathSave === "failure" ? i : 4 - i;
        const i18nKey = `DND5E.DeathSave${deathSave.titleCase()}Label`;
        const filled = attributes.death[deathSave] >= n;
        const classes = ["pip"];
        if ( filled ) classes.push("filled");
        if ( deathSave === "failure" ) classes.push("failure");
        context.death[deathSave].push({
          n, filled,
          tooltip: i18nKey,
          label: game.i18n.localize(`${i18nKey}N.${plurals.select(n)}`),
          classes: classes.join(" ")
        });
      }
    });

    // Ability Scores
    context.abilityRows = Object.entries(context.abilities).reduce((obj, [k, ability]) => {
      ability.key = k;
      ability.abbr = CONFIG.DND5E.abilities[k]?.abbreviation ?? "";
      ability.sign = Math.sign(ability.mod) < 0 ? "-" : "+";
      ability.mod = Math.abs(ability.mod);
      ability.baseValue = context.source.abilities[k]?.value ?? 0;
      if ( obj.bottom.length > 5 ) obj.top.push(ability);
      else obj.bottom.push(ability);
      return obj;
    }, { top: [], bottom: [] });
    context.abilityRows.optional = Object.keys(CONFIG.DND5E.abilities).length - 6;

    // Saving Throws
    context.saves = {};
    for ( let ability of Object.values(context.abilities) ) {
      ability = context.saves[ability.key] = { ...ability };
      ability.class = this.constructor.PROFICIENCY_CLASSES[context.editable ? ability.baseProf : ability.proficient];
      ability.hover = CONFIG.DND5E.proficiencyLevels[ability.proficient];
      ability.sign = Math.sign(ability.save) < 0 ? "-" : "+";
      ability.mod = Math.abs(ability.save);
    }

    // Size
    context.size = {
      label: CONFIG.DND5E.actorSizes[traits.size].label,
      abbr: CONFIG.DND5E.actorSizes[traits.size].abbreviation,
      mod: attributes.encumbrance.mod
    };

    // Skills & Tools
    for ( const entry of Object.values(context.skills).concat(Object.values(context.tools)) ) {
      entry.class = this.constructor.PROFICIENCY_CLASSES[context.editable ? entry.baseValue : entry.value];
      entry.sign = Math.sign(entry.total) < 0 ? "-" : "+";
      entry.mod = Math.abs(entry.total);
    }

    // Creature Type
    context.creatureType = {
      class: details.type.value === "custom" ? "none" : "",
      icon: CONFIG.DND5E.creatureTypes[details.type.value]?.icon ?? "/icons/svg/mystery-man.svg",
      title: details.type.value === "custom"
        ? details.type.custom
        : CONFIG.DND5E.creatureTypes[details.type.value].label,
      subtitle: details.type.subtype
    };

    // Senses
    context.senses = Object.entries(CONFIG.DND5E.senses).reduce((obj, [k, label]) => {
      const value = attributes.senses[k];
      if ( value ) obj[k] = { label, value };
      return obj;
    }, {});

    if ( attributes.senses.special ) attributes.senses.special.split(";").forEach((v, i) => {
      context.senses[`custom${i + 1}`] = { label: v.trim() };
    });
    if ( foundry.utils.isEmpty(context.senses) ) delete context.senses;

    // Inventory
    this._prepareItems(context);

    // Containers
    for ( const container of context.containers ) {
      const ctx = context.itemContext[container.id];
      ctx.capacity = await container.system.computeCapacity();
    }

    return context;
  }

  /* -------------------------------------------- */

  _getLabels() {
    const labels = super._getLabels();
    labels.damageAndHealing = { ...CONFIG.DND5E.damageTypes, ...CONFIG.DND5E.healingTypes };
    return labels;
  }

  /* -------------------------------------------- */

  /** @override */
  _prepareTraits() {
    const traits = {};
    for ( const [trait, config] of Object.entries(CONFIG.DND5E.traits) ) {
      const key = config.actorKeyPath ?? `system.traits.${trait}`;
      const data = foundry.utils.deepClone(foundry.utils.getProperty(this.actor, key));
      if ( !data ) continue;
      let values = data.value;
      if ( !values ) values = [];
      else if ( values instanceof Set ) values = Array.from(values);
      else if ( !Array.isArray(values) ) values = [values];
      values = values.map(key => {
        const value = { label: Trait.keyLabel(key, { trait }) ?? key };
        const icons = value.icons = [];
        if ( data.bypasses?.size && (key in CONFIG.DND5E.physicalDamageTypes) ) icons.push(...data.bypasses);
        return value;
      });
      if ( data.custom ) data.custom.split(";").forEach(v => values.push({ label: v.trim() }));
      if ( values.length ) traits[trait] = values;
    }
    // Combine damage & condition immunities in play mode.
    if ( (this._mode === this.constructor.MODES.PLAY) && traits.ci ) {
      traits.di ??= [];
      traits.di.push(...traits.ci);
      delete traits.ci;
    }
    return traits;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _prepareItems(context) {
    super._prepareItems(context);
    context.containers = context.inventory
      .findSplice(entry => entry.dataset.type === "container")
      ?.items?.sort((a, b) => a.sort - b.sort);
    context.inventory = context.inventory.filter(entry => entry.items.length);
    context.inventory.push({ label: "DND5E.Contents", items: [], dataset: { type: "all" } });

    // Remove races & background as they are shown on the details tab instead.
    context.features = context.features.filter(f => (f.dataset.type !== "background") && (f.dataset.type !== "race"));
    context.features.forEach(f => {
      if ( f.hasActions ) f.dataset.type = "active";
      else f.dataset.type = "passive";
    });

    // Add extra categories for features grouping.
    Object.values(this.actor.classes ?? {}).sort((a, b) => b.system.levels - a.system.levels).forEach(cls => {
      context.features.push({
        label: game.i18n.format("DND5E.FeaturesClass", { class: cls.name }),
        items: [],
        dataset: { type: cls.identifier }
      });
    });

    if ( this.actor.system.details.race instanceof dnd5e.documents.Item5e ) {
      context.features.push({ label: "DND5E.FeaturesRace", items: [], dataset: { type: "race" } });
    }

    if ( this.actor.system.details.background instanceof dnd5e.documents.Item5e ) {
      context.features.push({ label: "DND5E.FeaturesBackground", items: [], dataset: { type: "background" } });
    }

    context.features.push({ label: "DND5E.FeaturesOther", items: [], dataset: { type: "other" } });
    context.classes = context.features.findSplice(f => f.isClass)?.items;
  }

  /* -------------------------------------------- */

  /** @override */
  _prepareItem(item, ctx) {
    const { system } = item;

    // Spells
    if ( item.type === "spell" ) {

      // Activation
      const cost = system.activation?.cost;
      const abbr = {
        action: "DND5E.ActionAbbr",
        bonus: "DND5E.BonusActionAbbr",
        reaction: "DND5E.ReactionAbbr",
        minute: "DND5E.TimeMinuteAbbr",
        hour: "DND5E.TimeHourAbbr",
        day: "DND5E.TimeDayAbbr"
      }[system.activation.type]
      ctx.activation = cost && abbr ? `${cost}${game.i18n.localize(abbr)}` : item.labels.activation;

      // Range
      const units = system.range?.units;
      if ( units && (units !== "none") ) {
        if ( units in CONFIG.DND5E.movementUnits ) {
          ctx.range = {
            distance: true,
            value: system.range.value,
            unit: game.i18n.localize(`DND5E.Dist${units.capitalize()}Abbr`)
          };
        }
        else ctx.range = { distance: false };
      }

      // To Hit
      const toHit = parseInt(item.labels.toHit?.replace(/\s+/g, ""));
      if ( item.hasAttack && !isNaN(toHit) ) {
        ctx.toHit = {
          sign: Math.sign(toHit) < 0 ? "-" : "+",
          abs: Math.abs(toHit)
        };
      }

      // Prepared
      const mode = system.preparation?.mode;
      if ( (mode === "always") || (mode === "prepared") ) {
        const isAlways = mode === "always";
        const prepared = isAlways || system.preparation.prepared;
        ctx.preparation = {
          applicable: true,
          disabled: !item.isOwner || isAlways,
          cls: prepared ? "active" : "",
          title: isAlways
            ? CONFIG.DND5E.spellPreparationModes.always
            : prepared
              ? CONFIG.DND5E.spellPreparationModes.prepared
              : game.i18n.localize("DND5E.SpellUnprepared")
        };
      }
      else ctx.preparation = { applicable: false };
    }

    // Gear
    else {

      // Attuned
      if ( ctx.attunement ) {
        ctx.attunement.applicable = true;
        ctx.attunement.disabled = !item.isOwner;
        ctx.attunement.cls = ctx.attunement.cls === "attuned" ? "active" : "";
      }
      else ctx.attunement = { applicable: false };

      // Equipped
      if ( "equipped" in system ) {
        ctx.equip = {
          applicable: true,
          cls: system.equipped ? "active" : "",
          title: `DND5E.${system.equipped ? "Equipped" : "Unequipped"}`,
          disabled: !item.isOwner
        };
      }
      else ctx.equip = { applicable: false };
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".pips[data-prop]").on("click", this._onTogglePip.bind(this));
    html.find(".death-tab").on("click", () => this._toggleDeathTray());
    html.find("[data-action]").on("click", this._onAction.bind(this));
    html.find("[data-item-id][data-action]").on("click", this._onItemAction.bind(this));
    html.find(".rollable:is(.saving-throw, .ability-check)").on("click", this._onRollAbility.bind(this));
    html.find("proficiency-cycle").on("change", this._onChangeInput.bind(this));
    html.find(".sidebar .collapser").on("click", this._onToggleSidebar.bind(this));
    this.form.querySelectorAll(".item-tooltip").forEach(this._applyItemTooltips.bind(this));

    if ( this.isEditable ) {
      html.find(".meter > .hit-points").on("click", event => this._toggleEditHP(event, true));
      html.find(".meter > .hit-points > input").on("blur", event => this._toggleEditHP(event, false));
      html.find(".create-item").on("click", this._onCreateItem.bind(this));
    }

    // Edit mode only.
    if ( this._mode === this.constructor.MODES.EDIT ) {
      html.find(".tab.details .item-action").on("click", this._onItemAction.bind(this));
    }

    // Play mode only.
    else {
      html.find(".portrait").on("click", this._onShowPortrait.bind(this));
    }
  }

  /* -------------------------------------------- */

  /** @override */
  _disableOverriddenFields(html) {
    // When in edit mode, field values will be the base value, rather than the derived value, so it should not be
    // necessary to disable them anymore.
  }

  /* -------------------------------------------- */

  /** @override */
  _getSubmitData(updateData={}) {
    // Skip over ActorSheet#_getSubmitData to allow for editing overridden values.
    return FormApplication.prototype._getSubmitData.call(this, updateData);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _disableFields(form) {
    super._disableFields(form);
    form.querySelectorAll(".interface-only").forEach(input => input.disabled = false);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onChangeTab(event, tabs, active) {
    super._onChangeTab(event, tabs, active);
    this.form.className = this.form.className.replace(/tab-\w+/g, "");
    this.form.classList.add(`tab-${active}`);
    const sidebarCollapsed = game.user.getFlag("dnd5e", `sheetPrefs.character.tabs.${active}.collapseSidebar`);
    if ( sidebarCollapsed !== undefined ) this._toggleSidebar(sidebarCollapsed);
  }

  /* -------------------------------------------- */

  /**
   * Handle the user toggling the sheet mode.
   * @param {Event} event  The triggering event.
   * @protected
   */
  _onChangeSheetMode(event) {
    const { MODES } = this.constructor;
    const toggle = event.currentTarget;
    const label = game.i18n.localize(`DND5E.SheetMode${toggle.checked ? "Play" : "Edit"}`);
    toggle.dataset.tooltip = label;
    toggle.setAttribute("aria-label", label);
    this._mode = toggle.checked ? MODES.EDIT : MODES.PLAY;
    this.render();
  }

  /* -------------------------------------------- */

  /**
   * Handle toggling a pip on the character sheet.
   * @param {PointerEvent} event  The triggering event.
   * @protected
   */
  _onTogglePip(event) {
    const n = Number(event.target.closest("[data-n]")?.dataset.n);
    if ( !n || isNaN(n) ) return;
    const prop = event.currentTarget.dataset.prop;
    let value = foundry.utils.getProperty(this.actor, prop);
    if ( value === n ) value--;
    else value = n;
    return this.actor.update({ [prop]: value });
  }

  /* -------------------------------------------- */

  /**
   * Toggle editing hit points.
   * @param {PointerEvent} event  The triggering event.
   * @param {boolean} edit        Whether to toggle to the edit state.
   * @protected
   */
  _toggleEditHP(event, edit) {
    const target = event.currentTarget.closest(".hit-points");
    const label = target.querySelector(":scope > .label");
    const input = target.querySelector(":scope > input");
    label.hidden = edit;
    input.hidden = !edit;
    if ( edit ) input.focus();
  }

  /* -------------------------------------------- */

  /**
   * Toggle the death save tray.
   * @param {boolean} [open]  Force a particular open state.
   * @protected
   */
  _toggleDeathTray(open) {
    const tray = this.form.querySelector(".death-tray");
    const tab = tray.querySelector(".death-tab");
    tray.classList.toggle("open", open);
    this._deathTrayOpen = tray.classList.contains("open");
    tab.dataset.tooltip = `DND5E.DeathSave${this._deathTrayOpen ? "Hide" : "Show"}`
    tab.setAttribute("aria-label", game.i18n.localize(tab.dataset.tooltip));
  }

  /* -------------------------------------------- */

  /**
   * Handle the user toggling the sidebar collapsed state.
   * @protected
   */
  _onToggleSidebar() {
    const collapsed = this._toggleSidebar();
    const activeTab = this._tabs?.[0]?.active ?? "details";
    game.user.setFlag("dnd5e", `sheetPrefs.character.tabs.${activeTab}.collapseSidebar`, collapsed);
  }

  /* -------------------------------------------- */

  /**
   * Toggle the sidebar collapsed state.
   * @param {boolean} [collapsed]  Force a particular collapsed state.
   * @returns {boolean}            The new collapsed state.
   * @protected
   */
  _toggleSidebar(collapsed) {
    this.form.classList.toggle("collapsed", collapsed);
    collapsed = this.form.classList.contains("collapsed");
    const collapser = this.form.querySelector(".sidebar .collapser");
    const icon = collapser.querySelector("i");
    collapser.dataset.tooltip = `JOURNAL.View${collapsed ? "Expand" : "Collapse"}`;
    collapser.setAttribute("aria-label", game.i18n.localize(collapser.dataset.tooltip));
    icon.classList.remove("fa-caret-left", "fa-caret-right");
    icon.classList.add(`fa-caret-${collapsed ? "right" : "left"}`);
    return collapsed;
  }

  /* -------------------------------------------- */

  /**
   * Handle showing the character's portrait or token art.
   * @protected
   */
  _onShowPortrait() {
    const showTokenPortrait = this.actor.getFlag("dnd5e", "showTokenPortrait") === true;
    const token = this.actor.isToken ? this.actor.token : this.actor.prototypeToken;
    const img = showTokenPortrait ? token.texture.src : this.actor.img;
    new ImagePopout(img, { title: this.actor.name, uuid: this.actor.uuid }).render(true);
  }

  /* -------------------------------------------- */

  /**
   * Handle the user performing some sheet action.
   * @param {PointerEvent} event  The triggering event.
   * @protected
   */
  _onAction(event) {
    const { action } = event.currentTarget.dataset;
    switch ( action ) {
      case "findItem": this._onFindItem(event.currentTarget.dataset.itemType); break;
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle creating a new Item.
   * @protected
   */
  _onCreateItem() {
    const activeTab = this._tabs?.[0]?.active ?? "details";
    let types = {
      inventory: ["weapon", "equipment", "consumable", "tool", "container", "loot"],
      features: ["feat", "race", "background", "class", "subclass"],
      spells: ["spell"]
    }[activeTab] ?? [];

    types = types.filter(type => {
      const model = CONFIG.Item.dataModels[type];
      return !model.metadata?.singleton || !this.actor.itemTypes[type].length;
    });

    if ( types.length ) return Item.implementation.createDialog({}, {
      parent: this.actor, pack: this.actor.pack, types
    });
  }

  /* -------------------------------------------- */

  /**
   * Show available items of a given type.
   * @param {string} type  The item type.
   * @protected
   */
  _onFindItem(type) {
    switch ( type ) {
      case "class": game.packs.get("dnd5e.classfeatures").render(true); break;
      case "race": game.packs.get("dnd5e.races").render(true); break;
      case "background": game.packs.get("dnd5e.backgrounds").render(true); break;
    }
  }

  /* -------------------------------------------- */

  /**
   * Initialize item tooltips on an element.
   * @param {HTMLElement} element  The tooltipped element.
   * @protected
   */
  _applyItemTooltips(element) {
    const itemId = element.closest("[data-item-id]")?.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if ( !item || ("tooltip" in element.dataset) ) return;
    element.dataset.tooltip = `
      <section class="loading" data-uuid="${item.uuid}"><i class="fas fa-spinner fa-spin-pulse"></i></section>
    `;
    element.dataset.tooltipClass = "dnd5e2 item-tooltip";
    element.dataset.tooltipDirection = "LEFT";
  }

  /* -------------------------------------------- */

  /**
   * Handle performing some action on an owned Item.
   * @param {PointerEvent} event  The triggering event.
   * @protected
   */
  _onItemAction(event) {
    if ( event.target.closest("select") ) return;
    event.preventDefault();
    event.stopPropagation();
    const itemId = event.currentTarget.closest("[data-item-id]")?.dataset.itemId;
    const action = event.currentTarget.dataset.action;
    const item = this.actor.items.get(itemId);

    switch ( action ) {
      case "edit": item?.sheet.render(true); break;
      case "delete": item?.deleteDialog(); break;
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle rolling an ability check or saving throw.
   * @param {PointerEvent} event  The triggering event.
   * @protected
   */
  _onRollAbility(event) {
    const abilityId = event.currentTarget.closest("[data-ability]").dataset.ability;
    const isSavingThrow = event.currentTarget.classList.contains("saving-throw");
    if ( isSavingThrow ) this.actor.rollAbilitySave(abilityId, { event });
    else this.actor.rollAbilityTest(abilityId, { event })
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onResize(event) {
    super._onResize(event);
    const { width, height } = this.position;
    game.user.setFlag("dnd5e", "sheetPrefs.character", { width, height });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _filterItem(item) {
    if ( item.type === "container" ) return true;
  }
}
