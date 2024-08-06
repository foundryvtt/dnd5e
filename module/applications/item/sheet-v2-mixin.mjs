import DocumentSheetV2Mixin from "../mixins/sheet-v2-mixin.mjs";

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
      this._renderSourceOuter(html);
      return html;
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async _render(force=false, options={}) {
      await super._render(force, options);
      this._renderSource();
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async getData(options) {
      const context = await super.getData(options);
      context.inputs = { ...foundry.applications.fields, ...dnd5e.applications.fields };
      const { identified, schema, unidentified } = this.item.system;
      context.fields = schema.fields;

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
          classes: ["item", activeTab === tab ? "active" : null].filterJoin(" ")
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
        object: Object.fromEntries((context.source.properties ?? []).map(p => [p, true])),
        options: Object.entries(context.properties ?? {}).map(([k, v]) => ({ value: k, ...v }))
      };
      if ( game.user.isGM || (identified !== false) ) {
        context.properties.active.push(
          ...this.item.system.cardProperties ?? [],
          ...this.item.system.activatedEffectCardProperties ?? [],
          ...this.item.system.equippableItemCardProperties ?? []
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
        html.find(".item-image").on("click", this._onShowIcon.bind(this));
      }
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
     * Handle showing the Item's art.
     * @protected
     */
    _onShowIcon() {
      const title = this.item.system.identified === false ? this.item.system.unidentified.name : this.item.name;
      new ImagePopout(this.item.img, { title, uuid: this.item.uuid }).render(true);
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
