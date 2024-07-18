import * as Trait from "../../documents/actor/trait.mjs";
import { formatNumber, simplifyBonus, staticID } from "../../utils.mjs";
import Tabs5e from "../tabs.mjs";

/**
 * Adds common V2 sheet functionality.
 * @param {typeof ActorSheet5e} Base  The base class being mixed.
 * @returns {typeof ActorSheetV2}
 */
export default function ActorSheetV2Mixin(Base) {
  return class ActorSheetV2 extends Base {
    constructor(object, options={}) {
      const key = `${object.type}${object.limited ? ":limited" : ""}`;
      const { width, height } = game.user.getFlag("dnd5e", `sheetPrefs.${key}`) ?? {};
      if ( width && !("width" in options) ) options.width = width;
      if ( height && !("height" in options) ) options.height = height;
      super(object, options);
    }

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
    static TABS = [];

    /**
     * Available sheet modes.
     * @enum {number}
     */
    static MODES = {
      PLAY: 1,
      EDIT: 2
    };

    /**
     * The mode the sheet is currently in.
     * @type {ActorSheetV2.MODES}
     * @protected
     */
    _mode = this.constructor.MODES.PLAY;

    /**
     * The cached concentration information for the character.
     * @type {{items: Set<Item5e>, effects: Set<ActiveEffect5e>}}
     * @internal
     */
    _concentration;

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    /** @inheritDoc */
    async _renderOuter() {
      const html = await super._renderOuter();
      const header = html[0].querySelector(".window-header");

      // Adjust header buttons.
      header.querySelectorAll(".header-button").forEach(btn => {
        const label = btn.querySelector(":scope > i").nextSibling;
        btn.dataset.tooltip = label.textContent;
        btn.setAttribute("aria-label", label.textContent);
        label.remove();
      });

      if ( !game.user.isGM && this.actor.limited ) {
        html[0].classList.add("limited");
        return html;
      }

      // Add edit <-> play slide toggle.
      if ( this.isEditable ) {
        const toggle = document.createElement("slide-toggle");
        toggle.checked = this._mode === this.constructor.MODES.EDIT;
        toggle.classList.add("mode-slider");
        toggle.dataset.tooltip = "DND5E.SheetModeEdit";
        toggle.setAttribute("aria-label", game.i18n.localize("DND5E.SheetModeEdit"));
        toggle.addEventListener("change", this._onChangeSheetMode.bind(this));
        toggle.addEventListener("dblclick", event => event.stopPropagation());
        header.insertAdjacentElement("afterbegin", toggle);
      }

      const idLink = header.querySelector(".document-id-link");
      if ( idLink ) {
        const firstButton = header.querySelector(".header-button");
        firstButton?.insertAdjacentElement("beforebegin", idLink);
        idLink.classList.add("header-button");
      }

      // Render tabs.
      const nav = document.createElement("nav");
      nav.classList.add("tabs", "tabs-right");
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
        if ( this._tabs?.[0]?.active !== t.initial ) t.initial = this._tabs?.[0]?.active ?? t.initial;
        return new Tabs5e(t);
      });

      return html;
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async getData(options) {
      this._concentration = this.actor.concentration; // Cache concentration so it's not called for every item.
      const context = await super.getData(options);
      context.editable = this.isEditable && (this._mode === this.constructor.MODES.EDIT);
      context.cssClass = context.editable ? "editable" : this.isEditable ? "interactable" : "locked";
      const activeTab = (game.user.isGM || !this.actor.limited)
        ? this._tabs?.[0]?.active ?? this.options.tabs[0].initial
        : "biography";
      const sheetPrefs = `sheetPrefs.${this.actor.type}.tabs.${activeTab}`;
      context.cssClass += ` tab-${activeTab}`;
      context.sidebarCollapsed = !!game.user.getFlag("dnd5e", `${sheetPrefs}.collapseSidebar`);
      if ( context.sidebarCollapsed ) context.cssClass += " collapsed";
      const { attributes } = this.actor.system;

      // Portrait
      const showTokenPortrait = this.actor.getFlag("dnd5e", "showTokenPortrait") === true;
      const token = this.actor.isToken ? this.actor.token : this.actor.prototypeToken;
      context.portrait = {
        token: showTokenPortrait,
        src: showTokenPortrait ? token.texture.src : this.actor.img,
        // TODO: Not sure the best way to update the parent texture from this sheet if this is a token actor.
        path: showTokenPortrait ? this.actor.isToken ? "" : "prototypeToken.texture.src" : "img"
      };

      // Death Saves
      const plurals = new Intl.PluralRules(game.i18n.lang, { type: "ordinal" });
      context.death = {};
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

      // Senses
      context.senses = Object.entries(CONFIG.DND5E.senses).reduce((obj, [k, label]) => {
        const value = attributes.senses[k];
        if ( value ) obj[k] = { label, value };
        return obj;
      }, {});

      if ( attributes.senses.special ) attributes.senses.special.split(";").forEach((v, i) => {
        context.senses[`custom${i + 1}`] = { label: v.trim() };
      });

      // Containers
      for ( const container of context.containers ?? [] ) {
        const ctx = context.itemContext[container.id];
        ctx.capacity = await container.system.computeCapacity();
        ctx.capacity.maxLabel = Number.isFinite(ctx.capacity.max) ? ctx.capacity.max : "&infin;";
      }

      // Effects & Conditions
      const conditionIds = new Set();
      context.conditions = Object.entries(CONFIG.DND5E.conditionTypes).reduce((arr, [k, c]) => {
        if ( c.pseudo ) return arr; // Filter out pseudo-conditions.
        const { label: name, icon, reference } = c;
        const id = staticID(`dnd5e${k}`);
        conditionIds.add(id);
        const existing = this.actor.effects.get(id);
        const { disabled, img } = existing ?? {};
        arr.push({
          name, reference,
          id: k,
          icon: img ?? icon,
          disabled: existing ? disabled : true
        });
        return arr;
      }, []);

      for ( const category of Object.values(context.effects) ) {
        category.effects = await category.effects.reduce(async (arr, effect) => {
          effect.updateDuration();
          if ( conditionIds.has(effect.id) && !effect.duration.remaining ) return arr;
          const { id, name, img, disabled, duration } = effect;
          const toggleable = !this._concentration?.effects.has(effect);
          let source = await effect.getSource();
          // If the source is an ActiveEffect from another Actor, note the source as that Actor instead.
          if ( (source instanceof dnd5e.documents.ActiveEffect5e) && (source.target !== this.object) ) {
            source = source.target;
          }
          arr = await arr;
          arr.push({
            id, name, img, disabled, duration, source, toggleable,
            parentId: effect.target === effect.parent ? null : effect.parent.id,
            durationParts: duration.remaining ? duration.label.split(", ") : [],
            hasTooltip: source instanceof dnd5e.documents.Item5e
          });
          return arr;
        }, []);
      }

      context.effects.suppressed.info = context.effects.suppressed.info[0];

      return context;
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
          if ( data.bypasses?.size && CONFIG.DND5E.damageTypes[key]?.isPhysical ) icons.push(...data.bypasses.map(p => {
            const type = CONFIG.DND5E.itemProperties[p]?.label;
            return { icon: p, label: game.i18n.format("DND5E.DamagePhysicalBypassesShort", { type }) };
          }));
          return value;
        });
        if ( data.custom ) data.custom.split(";").forEach(v => values.push({ label: v.trim() }));
        if ( values.length ) traits[trait] = values;
      }

      // If petrified, display "All Damage" instead of all damage types separately
      if ( this.document.hasConditionEffect("petrification") ) {
        traits.dr = [{ label: game.i18n.localize("DND5E.DamageAll") }];
      }

      // Combine damage & condition immunities in play mode.
      if ( (this._mode === this.constructor.MODES.PLAY) && traits.ci ) {
        traits.di ??= [];
        traits.di.push(...traits.ci);
        delete traits.ci;
      }

      // Prepare damage modifications
      const dm = this.actor.system.traits?.dm;
      if ( dm ) {
        const rollData = this.actor.getRollData({ deterministic: true });
        const values = Object.entries(dm.amount).map(([k, v]) => {
          const total = simplifyBonus(v, rollData);
          if ( !total ) return null;
          const value = {
            label: `${CONFIG.DND5E.damageTypes[k]?.label ?? k} ${formatNumber(total, { signDisplay: "always" })}`,
            color: total > 0 ? "maroon" : "green"
          };
          const icons = value.icons = [];
          if ( dm.bypasses.size && CONFIG.DND5E.damageTypes[k]?.isPhysical ) icons.push(...dm.bypasses.map(p => {
            const type = CONFIG.DND5E.itemProperties[p]?.label;
            return { icon: p, label: game.i18n.format("DND5E.DamagePhysicalBypassesShort", { type }) };
          }));
          return value;
        }).filter(f => f);
        if ( values.length ) traits.dm = values;
      }

      return traits;
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    _prepareItems(context) {
      super._prepareItems(context);

      // Spell slots
      const plurals = new Intl.PluralRules(game.i18n.lang, { type: "ordinal" });
      context.spellbook.forEach(section => {
        if ( !section.usesSlots ) return;
        const spells = foundry.utils.getProperty(this.actor.system.spells, section.prop);
        const max = spells.override ?? spells.max ?? 0;
        section.pips = Array.fromRange(max, 1).map(n => {
          const filled = spells.value >= n;
          const label = filled
            ? game.i18n.format(`DND5E.SpellSlotN.${plurals.select(n)}`, { n })
            : game.i18n.localize("DND5E.SpellSlotExpended");
          const classes = ["pip"];
          if ( filled ) classes.push("filled");
          return { n, label, filled, tooltip: label, classes: classes.join(" ") };
        });
      });
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
        }[system.activation.type];
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

        // Prepared
        const mode = system.preparation?.mode;
        const config = CONFIG.DND5E.spellPreparationModes[mode] ?? {};
        if ( config.prepares ) {
          const isAlways = mode === "always";
          const prepared = isAlways || system.preparation.prepared;
          ctx.preparation = {
            applicable: true,
            disabled: !item.isOwner || isAlways,
            cls: prepared ? "active" : "",
            icon: `<i class="fa-${prepared ? "solid" : "regular"} fa-${isAlways ? "certificate" : "sun"}"></i>`,
            title: isAlways
              ? CONFIG.DND5E.spellPreparationModes.always.label
              : prepared
                ? CONFIG.DND5E.spellPreparationModes.prepared.label
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

        // Subtitles
        ctx.subtitle = [system.type?.label, item.isActive ? item.labels.activation : null].filterJoin(" &bull; ");
      }

      // Concentration
      if ( this._concentration.items.has(item) ) ctx.concentration = true;

      // To Hit
      const toHit = parseInt(item.labels.modifier);
      ctx.toHit = item.hasAttack && !isNaN(toHit) ? toHit : null;
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    _getLabels() {
      const labels = super._getLabels();
      labels.damageAndHealing = { ...CONFIG.DND5E.damageTypes, ...CONFIG.DND5E.healingTypes };
      return labels;
    }

    /* -------------------------------------------- */
    /*  Event Listeners & Handlers                  */
    /* -------------------------------------------- */

    /** @inheritDoc */
    activateListeners(html) {
      super.activateListeners(html);
      html.find(".pips[data-prop]").on("click", this._onTogglePip.bind(this));
      html.find("proficiency-cycle").on("change", this._onChangeInput.bind(this));
      html.find(".rollable:is(.saving-throw, .ability-check)").on("click", this._onRollAbility.bind(this));
      html.find(".sidebar-collapser").on("click", this._onToggleSidebar.bind(this));
      html.find("[data-item-id][data-action]").on("click", this._onItemAction.bind(this));
      html.find("[data-toggle-description]").on("click", this._onToggleDescription.bind(this));
      this.form.querySelectorAll(".item-tooltip").forEach(this._applyItemTooltips.bind(this));
      this.form.querySelectorAll("[data-reference-tooltip]").forEach(this._applyReferenceTooltips.bind(this));

      // Prevent default middle-click scrolling when locking a tooltip.
      this.form.addEventListener("pointerdown", event => {
        if ( (event.button === 1) && document.getElementById("tooltip")?.classList.contains("active") ) {
          event.preventDefault();
        }
      });

      if ( this.isEditable ) {
        html.find(".meter > .hit-points").on("click", event => this._toggleEditHP(event, true));
        html.find(".meter > .hit-points > input").on("blur", event => this._toggleEditHP(event, false));
        html.find(".create-child").on("click", this._onCreateChild.bind(this));
      }

      // Play mode only.
      if ( this._mode === this.constructor.MODES.PLAY ) {
        html.find(".portrait").on("click", this._onShowPortrait.bind(this));
      }
    }

    /* -------------------------------------------- */

    /**
     * Handle the user toggling the sheet mode.
     * @param {Event} event  The triggering event.
     * @protected
     */
    async _onChangeSheetMode(event) {
      const { MODES } = this.constructor;
      const toggle = event.currentTarget;
      const label = game.i18n.localize(`DND5E.SheetMode${toggle.checked ? "Play" : "Edit"}`);
      toggle.dataset.tooltip = label;
      toggle.setAttribute("aria-label", label);
      this._mode = toggle.checked ? MODES.EDIT : MODES.PLAY;
      await this.submit();
      this.render();
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    _onChangeTab(event, tabs, active) {
      super._onChangeTab(event, tabs, active);
      this.form.className = this.form.className.replace(/tab-\w+/g, "");
      this.form.classList.add(`tab-${active}`);
      const sheetPrefs = `sheetPrefs.${this.actor.type}.tabs.${active}`;
      const sidebarCollapsed = game.user.getFlag("dnd5e", `${sheetPrefs}.collapseSidebar`);
      if ( sidebarCollapsed !== undefined ) this._toggleSidebar(sidebarCollapsed);
      const createChild = this.form.querySelector(".create-child");
      createChild.setAttribute("aria-label", game.i18n.format("SIDEBAR.Create", {
        type: game.i18n.localize(`DOCUMENT.${active === "effects" ? "ActiveEffect" : "Item"}`)
      }));
    }

    /* -------------------------------------------- */

    /**
     * Handle creating a new embedded child.
     * @returns {ActiveEffect5e|Item5e|void}
     * @protected
     */
    _onCreateChild() {
      const activeTab = this._tabs?.[0]?.active ?? this.options.tabs[0].initial;

      if ( activeTab === "effects" ) return ActiveEffect.implementation.create({
        name: game.i18n.localize("DND5E.EffectNew"),
        icon: "icons/svg/aura.svg"
      }, { parent: this.actor, renderSheet: true });

      if ( activeTab === "spells" ) return Item.implementation.create({
        name: game.i18n.format("DOCUMENT.New", { type: game.i18n.format(CONFIG.Item.typeLabels.spell) }),
        type: "spell",
        img: Item.implementation.getDefaultArtwork({ type: "spell" })?.img ?? Item.implementation.DEFAULT_ICON
      }, { parent: this.actor, renderSheet: true });

      const features = ["feat", "race", "background", "class", "subclass"];
      if ( this.actor.type === "npc" ) features.push("weapon");

      let types = {
        features,
        inventory: ["weapon", "equipment", "consumable", "tool", "container", "loot"]
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

    /** @inheritDoc */
    _onResize(event) {
      super._onResize(event);
      const { width, height } = this.position;
      const key = `${this.actor.type}${this.actor.limited ? ":limited": ""}`;
      game.user.setFlag("dnd5e", `sheetPrefs.${key}`, { width, height });
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
     * Handle toggling an Item's description.
     * @param {MouseEvent} event  The triggering event.
     * @protected
     */
    async _onToggleDescription(event) {
      const target = event.currentTarget;
      const icon = target.querySelector(":scope > i");
      const row = target.closest("[data-item-id]");
      const summary = row.querySelector(":scope > .item-description > .wrapper");
      const { itemId } = row.dataset;
      const expanded = this._expanded.has(itemId);
      const item = this.actor.items.get(itemId);
      if ( !item ) return;

      if ( expanded ) {
        summary.addEventListener("transitionend", () => {
          if ( row.classList.contains("collapsed") ) summary.replaceChildren();
        }, { once: true });
        this._expanded.delete(itemId);
      } else {
        const context = await item.getChatData({ secrets: item.isOwner });
        summary.innerHTML = await renderTemplate("systems/dnd5e/templates/items/parts/item-summary.hbs", context);
        await new Promise(resolve => requestAnimationFrame(resolve));
        this._expanded.add(itemId);
      }

      row.classList.toggle("collapsed", expanded);
      icon.classList.toggle("fa-compress", !expanded);
      icon.classList.toggle("fa-expand", expanded);
    }

    /* -------------------------------------------- */

    /**
     * Handle toggling a pip on the character sheet.
     * @param {PointerEvent} event  The triggering event.
     * @returns {Promise<Actor5e>|void}
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
     * Handle the user toggling the sidebar collapsed state.
     * @protected
     */
    _onToggleSidebar() {
      const collapsed = this._toggleSidebar();
      const activeTab = this._tabs?.[0]?.active ?? "details";
      game.user.setFlag("dnd5e", `sheetPrefs.${this.actor.type}.tabs.${activeTab}.collapseSidebar`, collapsed);
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
      const collapser = this.form.querySelector(".sidebar-collapser");
      const icon = collapser.querySelector("i");
      collapser.dataset.tooltip = `JOURNAL.View${collapsed ? "Expand" : "Collapse"}`;
      collapser.setAttribute("aria-label", game.i18n.localize(collapser.dataset.tooltip));
      icon.classList.remove("fa-caret-left", "fa-caret-right");
      icon.classList.add(`fa-caret-${collapsed ? "right" : "left"}`);
      return collapsed;
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
      if ( abilityId === "concentration" ) this.actor.rollConcentration({ event });
      else if ( isSavingThrow ) this.actor.rollAbilitySave(abilityId, { event });
      else this.actor.rollAbilityTest(abilityId, { event });
    }

    /* -------------------------------------------- */

    /**
     * Initialize item tooltips on an element.
     * @param {HTMLElement} element  The tooltipped element.
     * @protected
     */
    _applyItemTooltips(element) {
      if ( "tooltip" in element.dataset ) return;
      const target = element.closest("[data-item-id], [data-effect-id], [data-uuid]");
      let uuid = target.dataset.uuid;
      if ( !uuid && target.dataset.itemId ) {
        const item = this.actor.items.get(target.dataset.itemId);
        uuid = item?.uuid;
      } else if ( !uuid && target.dataset.effectId ) {
        const { effectId, parentId } = target.dataset;
        const collection = parentId ? this.actor.items.get(parentId).effects : this.actor.effects;
        uuid = collection.get(effectId)?.uuid;
      }
      if ( !uuid ) return;
      element.dataset.tooltip = `
        <section class="loading" data-uuid="${uuid}"><i class="fas fa-spinner fa-spin-pulse"></i></section>
      `;
      element.dataset.tooltipClass = "dnd5e2 dnd5e-tooltip item-tooltip";
      element.dataset.tooltipDirection ??= "LEFT";
    }

    /* -------------------------------------------- */

    /**
     * Initialize a rule tooltip on an element.
     * @param {HTMLElement} element  The tooltipped element.
     * @protected
     */
    _applyReferenceTooltips(element) {
      if ( "tooltip" in element.dataset ) return;
      const uuid = element.dataset.referenceTooltip;
      element.dataset.tooltip = `
        <section class="loading" data-uuid="${uuid}"><i class="fas fa-spinner fa-spin-pulse"></i></section>
      `;
    }
  };
}
