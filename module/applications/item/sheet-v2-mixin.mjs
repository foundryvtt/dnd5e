import DocumentSheetV2Mixin from "../mixins/sheet-v2-mixin.mjs";
import EffectsElement from "../components/effects.mjs";

/**
 * Adds common V2 Item sheet functionality.
 * @param {typeof ItemSheet5e} Base  The base class being mixed.
 * @returns {typeof ItemSheetV2}
 */
export default function ItemSheetV2Mixin(Base) {
  return class ItemSheetV2 extends DocumentSheetV2Mixin(Base) {
    /** @override */
    static TABS = [
      { tab: "contents", label: "DND5E.Contents", condition: this.itemHasContents.bind(this) },
      { tab: "description", label: "DND5E.Description" },
      { tab: "details", label: "DND5E.Details", condition: this.isItemIdentified.bind(this) },
      { tab: "activities", label: "DND5E.ACTIVITY.Title.other", condition: this.itemHasActivities.bind(this) },
      { tab: "effects", label: "DND5E.Effects", condition: this.itemHasEffects.bind(this) },
      { tab: "advancement", label: "DND5E.AdvancementTitle", condition: this.itemHasAdvancements.bind(this) }
    ];

    /**
     * Store the collapsed state of the description boxes.
     * @type {Record<string, boolean>}
     * @protected
     */
    _collapsed = {};

    /**
     * Track the set of filters which are applied.
     * @type {Record<string, FilterState5e>}
     * @protected
     */
    _filters = {
      effects: { name: "", properties: new Set() },
      inventory: { name: "", properties: new Set() }
    };

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    /** @inheritDoc */
    async _renderOuter() {
      const html = await super._renderOuter();

      // Equipped & Identified
      if ( this.isEditable ) {
        const buttons = [];
        if ( "identified" in this.item.system ) buttons.push({
          property: "system.identified", icon: "fas fa-wand-sparkles", classes: "state-toggle toggle-identified"
        });
        if ( "equipped" in this.item.system ) buttons.push({
          property: "system.equipped", icon: "fas fa-shield-halved", classes: "state-toggle toggle-equipped"
        });

        const title = html[0].querySelector(".window-title");
        for ( const { property, icon, classes } of buttons ) {
          const anchor = document.createElement("a");
          anchor.className = `pseudo-header-button ${classes}`;
          Object.assign(anchor.dataset, { property, tooltipDirection: "DOWN" });
          anchor.innerHTML = `<i class="${icon}" inert></i>`;
          title.insertAdjacentElement("afterend", anchor);
          anchor.addEventListener("click", this._onToggleState.bind(this), { passive: true });
          anchor.addEventListener("dblclick", event => event.stopPropagation());
        }
      }

      this._renderSourceOuter(html);
      return html;
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async _render(force=false, options={}) {
      await super._render(force, options);

      const [identified] = this.element.find(".toggle-identified");
      if ( identified ) {
        const isIdentified = this.item.system.identified;
        const label = isIdentified ? "DND5E.Identified" : "DND5E.Unidentified.Title";
        identified.setAttribute("aria-label", game.i18n.localize(label));
        identified.dataset.tooltip = label;
        identified.classList.toggle("active", isIdentified);
      }

      const [equipped] = this.element.find(".toggle-equipped");
      if ( equipped ) {
        const isEquipped = this.item.system.equipped;
        const label = isEquipped ? "DND5E.Equipped" : "DND5E.Unequipped";
        equipped.setAttribute("aria-label", game.i18n.localize(label));
        equipped.dataset.tooltip = label;
        equipped.classList.toggle("active", isEquipped);
      }

      this._renderSource();
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async getData(options) {
      const { system, labels, isEmbedded } = this.item;
      const context = {
        system, labels, isEmbedded,
        source: this.item.system.toObject(),
        item: this.item,
        owner: this.item.isOwner,
        config: CONFIG.DND5E,
        CONFIG: CONFIG.DND5E,
        user: game.user,

        // Physical items
        isPhysical: "quantity" in this.item.system,

        // Identified state
        isIdentifiable: "identified" in this.item.system,
        isIdentified: this.item.system.identified !== false,

        // Armor
        hasDexModifier: this.item.isArmor && (this.item.system.type.value !== "shield"),

        // Advancement
        advancement: this._getItemAdvancement(this.item),

        // Active Effects
        effects: EffectsElement.prepareCategories(this.item.effects, { parent: this.item }),
        elements: this.options.elements
      };

      context.editable = this.isEditable && (this._mode === this.constructor.MODES.EDIT);
      context.cssClass = context.editable ? "editable" : this.isEditable ? "interactable" : "locked";
      context.inputs = { ...foundry.applications.fields, ...dnd5e.applications.fields };
      const { description, identified, schema, unidentified, validProperties } = this.item.system;
      context.fields = schema.fields;
      if ( !context.editable ) context.source = context.system;

      // Physical items
      context.baseItems = await this._getItemBaseTypes(context);

      // Set some default collapsed states on first open.
      if ( foundry.utils.isEmpty(this._collapsed) ) Object.assign(this._collapsed, {
        "system.description.chat": true,
        "system.unidentified.description": game.user.isGM
      });
      context.collapsed = this._collapsed;

      // Tabs
      const activeTab = this._tabs?.[0]?.active ?? this.options.tabs[0].initial;
      context.cssClass += ` tab-${activeTab}`;
      context.tabs = this.constructor.TABS.reduce((tabs, { tab, label, condition }) => {
        if ( !condition || condition(this.item) ) tabs.push({
          tab, label,
          classes: ["item", "interface-only", activeTab === tab ? "active" : null].filterJoin(" ")
        });
        return tabs;
      }, []);

      // Name
      context.name = {
        value: this.item.name,
        editable: this.item._source.name,
        field: this.item.schema.getField("name")
      };

      if ( ("identified" in this.item.system) && (identified === false) ) {
        context.name = {
          value: unidentified.name,
          editable: this.item.system._source.unidentified.name,
          field: schema.getField("unidentified.name")
        };
      }

      // Properties
      context.properties = {
        active: [],
        object: Object.fromEntries((context.system.properties ?? []).map(p => [p, true])),
        options: (validProperties ?? []).reduce((arr, k) => {
          const { label } = CONFIG.DND5E.itemProperties[k];
          arr.push({
            label,
            value: k,
            selected: context.source.properties?.includes?.(k) ?? context.source.properties?.has?.(k)
          });
          return arr;
        }, [])
      };
      if ( this.item.type !== "spell" ) {
        context.properties.options.sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang));
      }
      if ( game.user.isGM || (identified !== false) ) {
        context.properties.active.push(
          ...this.item.system.cardProperties ?? [],
          ...Object.values(this.item.labels.activations?.[0] ?? {}),
          ...this.item.system.equippableItemCardProperties ?? []
        );
      }

      // Item sub-types
      if ( ["feat", "loot", "consumable"].includes(this.item.type) ) {
        const name = this.item.type === "feat" ? "feature" : this.item.type;
        const itemTypes = CONFIG.DND5E[`${name}Types`][this.item.system.type.value];
        if ( itemTypes ) context.itemSubtypes = itemTypes.subtypes;
      }

      // Enrich HTML description
      const enrichmentOptions = {
        secrets: this.item.isOwner, relativeTo: this.item, rollData: this.item.getRollData()
      };
      context.enriched = {
        description: await TextEditor.enrichHTML(description.value, enrichmentOptions),
        unidentified: await TextEditor.enrichHTML(unidentified?.description, enrichmentOptions),
        chat: await TextEditor.enrichHTML(description.chat, enrichmentOptions)
      };
      if ( this.editingDescriptionTarget ) {
        context.editingDescriptionTarget = this.editingDescriptionTarget;
        context.enriched.editing = await TextEditor.enrichHTML(
          foundry.utils.getProperty(context, this.editingDescriptionTarget), enrichmentOptions
        );
      }

      // Sub-type context
      await this.item.system.getSheetData?.(context);

      context.properties.active = context.properties.active.filter(_ => _);

      return context;
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    setPosition(position={}) {
      const newPosition = super.setPosition(position);
      // TODO: Unneeded in AppV2.
      this.element[0].style.height = "";
      return newPosition;
    }

    /* -------------------------------------------- */
    /*  Event Listeners & Handlers                  */
    /* -------------------------------------------- */

    /** @inheritDoc */
    activateListeners(html) {
      super.activateListeners(html);
      html.find(".description.collapsible > .header").on("click", this._onToggleOwnDescription.bind(this));

      // Play mode only.
      if ( this._mode === this.constructor.MODES.PLAY ) {
        html.find(".sheet-header .item-image").on("click", this._onShowIcon.bind(this));
        this._disableFields(this.form);
      }
    }

    /* -------------------------------------------- */

    /**
     * Disable form fields that aren't marked with the `interface-only` class.
     * @param {HTMLElement} form  The form element whose fields are being disabled.
     */
    _disableFields(form) {
      const selector = `:is(${[
        "INPUT", "SELECT", "TEXTAREA", "BUTTON", "DND5E-CHECKBOX", "COLOR-PICKER", "DOCUMENT-TAGS",
        "FILE-PICKER", "HUE-SLIDER", "MULTI-SELECT", "PROSE-MIRROR", "RANGE-PICKER", "STRING-TAGS"
      ].join(", ")}):not(.interface-only, .description-edit, .secret > button)`;
      for ( const element of form.querySelectorAll(selector) ) {
        if ( element.tagName === "TEXTAREA" ) element.readOnly = true;
        else element.disabled = true;
      }
    }

    /* -------------------------------------------- */

    /** @override */
    _disableOverriddenFields(html) {
      // When in edit mode, field values will be the base value, rather than the derived value, so it should not be
      // necessary to disable them anymore.
    }

    /* -------------------------------------------- */

    /**
     * Handle toggling one of the item's description categories.
     * @param {PointerEvent} event  The triggering event.
     * @protected
     */
    _onToggleOwnDescription(event) {
      const description = event.currentTarget.closest("[data-target]");
      if ( !description ) return;
      const { target } = description.dataset;
      description.classList.toggle("collapsed");
      this._collapsed[target] = description.classList.contains("collapsed");
    }

    /* -------------------------------------------- */

    /**
     * Handle toggling Item state.
     * @param {PointerEvent} event  The triggering event.
     * @protected
     */
    _onToggleState(event) {
      const { property } = event.currentTarget.dataset;
      const state = event.currentTarget.classList.contains("active");
      this.item.update({ [property]: !state });
    }

    /* -------------------------------------------- */

    /**
     * Handle showing the Item's art.
     * @protected
     */
    _onShowIcon() {
      const title = this.item.system.identified === false ? this.item.system.unidentified.name : this.item.name;
      new ImagePopout(this.item.img, { title, uuid: this.item.uuid }).render(true);
    }

    /* -------------------------------------------- */

    /** @override */
    _onCreateChild() {
      const activeTab = this._tabs?.[0]?.active ?? this.options.tabs[0].initial;

      if ( activeTab === "effects" ) {
        return ActiveEffect.implementation.create({
          name: this.document.name,
          img: this.document.img,
          origin: this.document.uuid
        }, { parent: this.item, renderSheet: true });
      }

      if ( activeTab === "advancement" ) {
        return game.dnd5e.applications.advancement.AdvancementSelection.createDialog(this.item);
      }

      if ( activeTab === "activities" ) {
        return dnd5e.documents.activity.UtilityActivity.createDialog({}, {
          parent: this.item,
          types: Object.entries(CONFIG.DND5E.activityTypes).filter(([, { configurable }]) => {
            return configurable !== false;
          }).map(([k]) => k)
        });
      }
    }

    /* -------------------------------------------- */
    /*  Helpers                                     */
    /* -------------------------------------------- */

    /**
     * Determine if an Item support Activities.
     * @param {Item5e} item  The Item.
     * @returns {boolean}
     */
    static itemHasActivities(item) {
      return this.isItemIdentified(item) && ("activities" in item.system);
    }

    /* -------------------------------------------- */

    /**
     * Determine if an Item support Advancements.
     * @param {Item5e} item  The Item.
     * @returns {boolean}
     */
    static itemHasAdvancements(item) {
      return "advancement" in item.system;
    }

    /* -------------------------------------------- */

    /**
     * Determine if an Item has contents.
     * @param {Item5e} item  The Item.
     * @returns {boolean}
     */
    static itemHasContents(item) {
      return item.system instanceof dnd5e.dataModels.item.ContainerData;
    }

    /* -------------------------------------------- */

    /**
     * Determine if an Item should show an effects tab.
     * @param {Item5e} item  The Item.
     * @returns {boolean}
     */
    static itemHasEffects(item) {
      return this.isItemIdentified(item) && ("activation" in item.system);
    }

    /* -------------------------------------------- */

    /**
     * Determine whether an Item is considered identified.
     * @param {Item5e} item  The Item.
     * @returns {boolean}
     */
    static isItemIdentified(item) {
      return game.user.isGM || (item.system.identified !== false);
    }
  };
}
