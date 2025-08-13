import UsesField from "../../data/shared/uses-field.mjs";
import * as Trait from "../../documents/actor/trait.mjs";
import { filteredKeys } from "../../utils.mjs";
import AdvancementManager from "../advancement/advancement-manager.mjs";
import AdvancementMigrationDialog from "../advancement/advancement-migration-dialog.mjs";
import DocumentSheet5e from "../api/document-sheet.mjs";
import PrimarySheetMixin from "../api/primary-sheet-mixin.mjs";
import EffectsElement from "../components/effects.mjs";
import ContextMenu5e from "../context-menu.mjs";
import CreatureTypeConfig from "../shared/creature-type-config.mjs";
import MovementSensesConfig from "../shared/movement-senses-config.mjs";
import SourceConfig from "../shared/source-config.mjs";
import StartingEquipmentConfig from "./config/starting-equipment-config.mjs";

const TextEditor = foundry.applications.ux.TextEditor.implementation;

/**
 * Base item sheet built on ApplicationV2.
 */
export default class ItemSheet5e extends PrimarySheetMixin(DocumentSheet5e) {
  /** @override */
  static DEFAULT_OPTIONS = {
    actions: {
      addRecovery: ItemSheet5e.#addRecovery,
      deleteCraft: ItemSheet5e.#deleteCraft,
      deleteDocument: ItemSheet5e.#deleteDocument,
      deleteRecovery: ItemSheet5e.#deleteRecovery,
      editDescription: ItemSheet5e.#editDescription,
      modifyAdvancementChoices: ItemSheet5e.#modifyAdvancementChoices,
      showConfiguration: ItemSheet5e.#showConfiguration,
      showDocument: ItemSheet5e.#showDocument,
      showIcon: ItemSheet5e.#showIcon,
      toggleState: ItemSheet5e.#toggleState
    },
    classes: ["item"],
    editingDescriptionTarget: null,
    elements: {
      effects: "dnd5e-effects"
    },
    form: {
      submitOnChange: true
    },
    position: {
      width: 500
    },
    window: {
      resizable: false
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    header: {
      template: "systems/dnd5e/templates/items/header.hbs"
    },
    tabs: {
      template: "systems/dnd5e/templates/shared/horizontal-tabs.hbs",
      templates: ["templates/generic/tab-navigation.hbs"]
    },
    activities: {
      template: "systems/dnd5e/templates/items/activities.hbs",
      scrollable: [""]
    },
    advancement: {
      template: "systems/dnd5e/templates/items/advancement.hbs",
      scrollable: [""]
    },
    description: {
      template: "systems/dnd5e/templates/items/description.hbs",
      scrollable: [""]
    },
    details: {
      template: "systems/dnd5e/templates/items/details.hbs",
      scrollable: [""]
    },
    effects: {
      template: "systems/dnd5e/templates/items/effects.hbs",
      scrollable: [""]
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static TABS = [
    { tab: "description", label: "DND5E.ITEM.SECTIONS.Description" },
    { tab: "details", label: "DND5E.ITEM.SECTIONS.Details", condition: this.isItemIdentified.bind(this) },
    { tab: "activities", label: "DND5E.ITEM.SECTIONS.Activities", condition: this.itemHasActivities.bind(this) },
    { tab: "effects", label: "DND5E.ITEM.SECTIONS.Effects", condition: this.itemHasEffects.bind(this) },
    { tab: "advancement", label: "DND5E.ITEM.SECTIONS.Advancement", condition: this.itemHasAdvancement.bind(this) }
  ];

  /* -------------------------------------------- */

  /** @override */
  tabGroups = {
    primary: "description"
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * The Actor owning the item, if any.
   * @type {Actor5e}
   */
  get actor() {
    return this.document.actor;
  }

  /* -------------------------------------------- */

  /**
   * Additional toggles added to header buttons.
   * @type {Record<string, HTMLElement>}
   */
  _headerToggles = {};

  /* -------------------------------------------- */

  /**
   * Description currently being edited for items types with multiple descriptions.
   * @type {string|null}
   */
  editingDescriptionTarget = null;

  /* -------------------------------------------- */

  /** @override */
  _filters = {
    effects: { name: "", properties: new Set() }
  };

  /* -------------------------------------------- */

  /**
   * The Item document managed by this sheet.
   * @type {Item5e}
   */
  get item() {
    return this.document;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _configureRenderOptions(options) {
    await super._configureRenderOptions(options);
    if ( options.isFirstRender ) {
      this.expandedSections.set("system.description.value", true);
      if ( !game.user.isGM ) this.expandedSections.set("system.unidentified.description", true);
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _disableFields() {
    this.element.querySelectorAll(":is(document-embed, secret-block) button").forEach(el => {
      el.classList.add("always-interactive");
    });
    super._disableFields();
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = {
      ...await super._prepareContext(options),
      concealDetails: !game.user.isGM && (this.item.system.identified === false),
      elements: this.options.elements,
      fields: this.item.system.schema.fields,
      isEmbedded: this.item.isEmbedded,
      isIdentifiable: "identified" in this.item.system,
      isIdentified: this.item.system.identified !== false,
      isPhysical: "quantity" in this.item.system,
      item: this.item,
      labels: this.item.labels,
      system: this.item.system,
      user: game.user
    };
    context.source = context.editable ? this.item.system._source : this.item.system;

    context.properties = {
      active: [],
      object: Object.fromEntries((context.system.properties ?? []).map(p => [p, true])),
      options: (this.item.system.validProperties ?? []).reduce((arr, k) => {
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
    if ( game.user.isGM || context.isIdentified ) context.properties.active.push(
      ...this.item.system.cardProperties ?? [],
      ...Object.values(this.item.labels.activations?.[0] ?? {}),
      ...this.item.system.equippableItemCardProperties ?? []
    );

    await this.item.system.getSheetData?.(context);

    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    switch ( partId ) {
      case "activities": context = await this._prepareActivitiesContext(context, options); break;
      case "advancement": context = await this._prepareAdvancementContext(context, options); break;
      case "description": context = await this._prepareDescriptionContext(context, options); break;
      case "details": context = await this._prepareDetailsContext(context, options); break;
      case "effects": context = await this._prepareEffectsContext(context, options); break;
      case "header": context = await this._prepareHeaderContext(context, options); break;
    }

    if ( context.properties?.active ) context.properties.active = context.properties.active.filter(_ => _);

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the activities tab.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {ApplicationRenderContext}
   * @protected
   */
  async _prepareActivitiesContext(context, options) {
    context.activities = (this.item.system.activities ?? [])
      .filter(a => CONFIG.DND5E.activityTypes[a.type]?.configurable !== false)
      .map(activity => {
        const { _id: id, name, img, sort } = activity.prepareSheetContext();
        return {
          id, name, sort,
          img: { src: img, svg: img?.endsWith(".svg") },
          uuid: activity.uuid
        };
      });

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the advancement tab.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {ApplicationRenderContext}
   * @protected
   */
  async _prepareAdvancementContext(context, options) {
    context.advancement = this._getAdvancement();
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the description tab.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {ApplicationRenderContext}
   * @protected
   */
  async _prepareDescriptionContext(context, options) {
    context.expanded = this.expandedSections.entries().reduce((obj, [k, v]) => {
      obj[k] = v;
      return obj;
    }, {});

    const enrichmentOptions = {
      secrets: this.item.isOwner, relativeTo: this.item, rollData: this.item.getRollData()
    };
    context.enriched = {
      description: await TextEditor.enrichHTML(this.item.system.description.value, enrichmentOptions),
      unidentified: await TextEditor.enrichHTML(this.item.system.unidentified?.description, enrichmentOptions),
      chat: await TextEditor.enrichHTML(this.item.system.description.chat, enrichmentOptions)
    };
    if ( this.editingDescriptionTarget ) context.editingDescription = {
      target: this.editingDescriptionTarget,
      value: foundry.utils.getProperty(this.item._source, this.editingDescriptionTarget)
    };

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the details tab.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {ApplicationRenderContext}
   * @protected
   */
  async _prepareDetailsContext(context, options) {
    context.tab = context.tabs.details;
    context.parts ??= [];

    context.baseItemOptions = await this._getBaseItemOptions();
    context.coverOptions = Object.entries(CONFIG.DND5E.cover).map(([value, label]) => ({ value, label }));

    // If using modern rules, do not show redundant artificer progression unless it is already selected.
    context.spellProgression = { ...CONFIG.DND5E.spellProgression };
    if ( (game.settings.get("dnd5e", "rulesVersion") === "modern")
      && (this.item.system.spellcasting?.progression !== "artificer") ) delete context.spellProgression.artificer;
    context.spellProgression = Object.entries(context.spellProgression).map(([value, config]) => {
      const group = CONFIG.DND5E.spellcasting[config.type]?.label ?? "";
      return { group, value, label: config.label };
    });
    const { progression } = this.item.system.spellcasting ?? {};
    if ( progression && !(progression in CONFIG.DND5E.spellProgression) ) {
      context.spellProgression.push({ value: progression, label: progression });
    }

    // Limited Uses
    context.data = { uses: context.source.uses };
    context.hasLimitedUses = this.item.system.hasLimitedUses;
    context.recoveryPeriods = CONFIG.DND5E.limitedUsePeriods.recoveryOptions;
    context.recoveryTypes = [
      { value: "recoverAll", label: "DND5E.USES.Recovery.Type.RecoverAll" },
      { value: "loseAll", label: "DND5E.USES.Recovery.Type.LoseAll" },
      { value: "formula", label: "DND5E.USES.Recovery.Type.Formula" }
    ];
    context.usesRecovery = (context.source.uses?.recovery ?? []).map((data, index) => ({
      data,
      fields: context.fields.uses.fields.recovery.element.fields,
      prefix: `system.uses.recovery.${index}.`,
      source: context.source.uses.recovery[index] ?? data,
      formulaOptions: data.period === "recharge" ? UsesField.rechargeOptions : null
    }));

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the effects tab.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {ApplicationRenderContext}
   * @protected
   */
  async _prepareEffectsContext(context, options) {
    context.tab = context.tabs.effects;

    context.effects = EffectsElement.prepareCategories(this.item.effects, { parent: this.item });
    for ( const category of Object.values(context.effects) ) {
      category.effects = await category.effects.reduce(async (arr, effect) => {
        effect.updateDuration();
        const { id, name, img, disabled, duration } = effect;
        const source = await effect.getSource();
        arr = await arr;
        arr.push({
          id, name, img, disabled, duration, source,
          parent,
          durationParts: duration.remaining ? duration.label.split(", ") : [],
          hasTooltip: true
        });
        return arr;
      }, []);
    }

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the header.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {ApplicationRenderContext}
   * @protected
   */
  async _prepareHeaderContext(context, options) {
    if ( ("identified" in this.item.system) && !context.isIdentified ) context.name = {
      value: this.item.system.unidentified.name,
      editable: this.item.system._source.unidentified.name,
      field: this.item.system.schema.getField("unidentified.name")
    };
    else context.name = {
      value: this.item.name,
      editable: this.item._source.name,
      field: this.item.schema.getField("name")
    };
    context.img = {
      value: this.item.img,
      editable: this.item._source.img
    };

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Get the display object used to show the advancement tab.
   * @returns {object}     Object with advancement data grouped by levels.
   */
  _getAdvancement() {
    if ( !this.item.system.advancement ) return {};

    const advancement = {};
    const configMode = !this.item.parent || (this._mode === ItemSheet5e.MODES.EDIT);
    const legacyDisplay = this.options.legacyDisplay;
    const maxLevel = this.item.parent ? (this.item.system.levels ?? this.item.class?.system.levels
      ?? this.item.parent.system.details?.level ?? -1) : -1;

    // Improperly configured advancements
    if ( this.item.advancement.needingConfiguration.length ) {
      advancement.unconfigured = {
        items: this.item.advancement.needingConfiguration.map(a => ({
          id: a.id,
          uuid: a.uuid,
          order: a.constructor.order,
          title: a.title,
          icon: a.icon,
          classRestriction: a.classRestriction,
          configured: false,
          tags: this._getAdvancementTags(a),
          classes: [a.icon?.endsWith(".svg") ? "svg" : ""].filterJoin(" ")
        })),
        configured: "partial"
      };
    }

    // All other advancements by level
    for ( let [level, advancements] of Object.entries(this.item.advancement.byLevel) ) {
      if ( !configMode ) advancements = advancements.filter(a => a.appliesToClass);
      const items = advancements.map(advancement => ({
        id: advancement.id,
        uuid: advancement.uuid,
        order: advancement.sortingValueForLevel(level),
        title: advancement.titleForLevel(level, { configMode, legacyDisplay }),
        icon: advancement.icon,
        classRestriction: advancement.classRestriction,
        summary: advancement.summaryForLevel(level, { configMode, legacyDisplay }),
        configured: advancement.configuredForLevel(level),
        tags: this._getAdvancementTags(advancement),
        value: advancement.valueForLevel?.(level),
        classes: [advancement.icon?.endsWith(".svg") ? "svg" : ""].filterJoin(" ")
      }));
      if ( !items.length ) continue;
      advancement[level] = {
        items: items.sort((a, b) => a.order.localeCompare(b.order, game.i18n.lang)),
        configured: (level > maxLevel) ? false : items.some(a => !a.configured) ? "partial" : "full"
      };
    }
    return advancement;
  }

  /* -------------------------------------------- */

  /**
   * Prepare tags for an Advancement.
   * @param {Advancement} advancement  The Advancement.
   * @returns {{ label: string, icon: string }[]}
   * @protected
   */
  _getAdvancementTags(advancement) {
    if ( this.item.isEmbedded && (this._mode !== this.constructor.MODES.EDIT) ) return [];
    const tags = [];
    if ( advancement.classRestriction === "primary" ) {
      tags.push({
        label: "DND5E.AdvancementClassRestrictionPrimary",
        icon: "systems/dnd5e/icons/svg/original-class.svg"
      });
    } else if ( advancement.classRestriction === "secondary" ) {
      tags.push({
        label: "DND5E.AdvancementClassRestrictionSecondary",
        icon: "systems/dnd5e/icons/svg/multiclass.svg"
      });
    }
    return tags;
  }

  /* -------------------------------------------- */

  /**
   * Get the base weapons and tools based on the selected type.
   * @returns {Promise<FormSelectOptions[]|null>}
   * @protected
   */
  async _getBaseItemOptions() {
    const baseIds = this.item.type === "equipment" ? {
      ...CONFIG.DND5E.armorIds,
      ...CONFIG.DND5E.shieldIds
    } : CONFIG.DND5E[`${this.item.type}Ids`];
    if ( baseIds === undefined ) return null;

    const baseType = this.item.system._source.type.value ?? this.item.system.type.value;
    const options = [];
    for ( const [value, id] of Object.entries(baseIds) ) {
      const baseItem = await Trait.getBaseItem(id);
      if ( baseType !== baseItem?.system?.type?.value ) continue;
      options.push({ value, label: baseItem.name });
    }

    return options.length ? [
      { value: "", label: "" },
      ...options.sort((lhs, rhs) => lhs.label.localeCompare(rhs.label, game.i18n.lang))
    ] : null;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _renderFrame(options) {
    const html = await super._renderFrame(options);

    if ( this.isEditable ) {
      const classes = ["fa-solid", "icon"];
      const buttons = [];
      if ( "identified" in this.item.system ) buttons.push({
        id: "identified", property: "system.identified", classes: [...classes, "fa-wand-sparkles", "toggle-identified"]
      });
      if ( "equipped" in this.item.system ) buttons.push({
        id: "equipped", property: "system.equipped", classes: [...classes, "fa-shield-halved", "toggle-equipped"]
      });

      const sibling = html.querySelector('[data-action="copyUuid"], [data-action="close"]');
      for ( const { id, property, classes } of buttons ) {
        const button = document.createElement("button");
        button.type = "button";
        button.classList.add("header-control", "pseudo-header-control", "state-toggle", ...classes);
        Object.assign(button.dataset, { action: "toggleState", property, tooltipDirection: "DOWN" });
        sibling.before(button);
        this._headerToggles[id] = button;
      }
    }

    this._renderSourceFrame(html);
    return html;
  }

  /* -------------------------------------------- */
  /*  Life-Cycle Handlers                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _attachFrameListeners() {
    super._attachFrameListeners();
    new ContextMenu5e(this.element, ".advancement-item[data-id]", [], {
      onOpen: target => dnd5e.documents.advancement.Advancement.onContextMenu(this.item, target), jQuery: false
    });
    new ContextMenu5e(this.element, ".activity[data-activity-id]", [], {
      onOpen: target => dnd5e.documents.activity.UtilityActivity.onContextMenu(this.item, target), jQuery: false
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options);

    new CONFIG.ux.DragDrop({
      dragSelector: ":is(.advancement-item, [data-activity-id], [data-effect-id], [data-item-id])",
      dropSelector: null,
      callbacks: {
        dragstart: this._onDragStart.bind(this),
        dragover: this._onDragOver.bind(this),
        drop: this._onDrop.bind(this)
      }
    }).bind(this.element);

    if ( this._mode === this.constructor.MODES.PLAY ) this._disableFields();

    this.element.querySelectorAll(".editor-content[data-edit]").forEach(div => this._activateEditor(div));

    if ( this._headerToggles.identified ) {
      const isIdentified = this.item.system.identified;
      const label = isIdentified ? "DND5E.Identified" : "DND5E.Unidentified.Title";
      this._headerToggles.identified.setAttribute("aria-label", game.i18n.localize(label));
      this._headerToggles.identified.dataset.tooltip = label;
      this._headerToggles.identified.classList.toggle("active", isIdentified);
    }

    if ( this._headerToggles.equipped ) {
      const isEquipped = this.item.system.equipped;
      const label = isEquipped ? "DND5E.Equipped" : "DND5E.Unequipped";
      this._headerToggles.equipped.setAttribute("aria-label", game.i18n.localize(label));
      this._headerToggles.equipped.dataset.tooltip = label;
      this._headerToggles.equipped.classList.toggle("active", isEquipped);
    }

    if ( this.editingDescriptionTarget ) {
      this.element.querySelectorAll("prose-mirror").forEach(editor => editor.addEventListener("save", () => {
        this.editingDescriptionTarget = null;
        this.render();
      }));
    }

    this._renderSource();
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /** @override */
  _addDocument() {
    if ( this.tabGroups.primary === "activities" ) {
      return dnd5e.documents.activity.UtilityActivity.createDialog({}, {
        parent: this.item,
        types: Object.entries(CONFIG.DND5E.activityTypes).filter(([, { configurable }]) => {
          return configurable !== false;
        }).map(([k]) => k)
      });
    }

    if ( this.tabGroups.primary === "advancement" ) {
      return dnd5e.documents.advancement.Advancement.createDialog({}, { parent: this.item });
    }

    if ( this.tabGroups.primary === "effects" ) {
      return ActiveEffect.implementation.create({
        name: this.document.name,
        img: this.document.img,
        origin: this.document.uuid
      }, { parent: this.document, renderSheet: true });
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle adding a recovery option.
   * @this {ItemSheet5e}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   * @returns {any}
   */
  static #addRecovery(event, target) {
    return this.submit({ updateData: { "system.uses.recovery": [...this.item.system.toObject().uses.recovery, {}] } });
  }

  /* -------------------------------------------- */

  /**
   * Handle removing an document.
   * @this {ItemSheet5e}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static async #deleteDocument(event, target) {
    const uuid = target.closest("[data-uuid]").dataset?.uuid;
    const doc = await fromUuid(uuid);
    doc?.deleteDialog();
  }

  /* -------------------------------------------- */

  /**
   * Handle removing an item currently being crafted.
   * @this {ItemSheet5e}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static #deleteCraft(event, target) {
    this.submit({ updateData: { "system.craft": null } });
  }

  /* -------------------------------------------- */

  /**
   * Handle removing a recovery option.
   * @this {ItemSheet5e}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static #deleteRecovery(event, target) {
    const recovery = this.item.system.toObject().uses.recovery;
    recovery.splice(target.closest("[data-index]").dataset.index, 1);
    this.submit({ updateData: { "system.uses.recovery": recovery } });
  }

  /* -------------------------------------------- */

  /**
   * Handle expanding the description editor.
   * @this {ItemSheet5e}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static #editDescription(event, target) {
    if ( target.ariaDisabled ) return;
    this.editingDescriptionTarget = target.dataset.target;
    this.render();
  }

  /* -------------------------------------------- */

  /**
   * Handle modifying the choices for an advancement level.
   * @this {ItemSheet5e}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static #modifyAdvancementChoices(event, target) {
    const level = target.closest("[data-level]")?.dataset.level;
    const manager = AdvancementManager.forModifyChoices(this.actor, this.item.id, Number(level));
    if ( manager.steps.length ) manager.render({ force: true });
  }

  /* -------------------------------------------- */

  /**
   * Handle opening a configuration application.
   * @this {ItemSheet5e}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   * @returns {any}
   */
  static #showConfiguration(event, target) {
    switch ( target.dataset.config ) {
      case "movement":
      case "senses":
        return new MovementSensesConfig({ document: this.item, type: target.dataset.config }).render({ force: true });
      case "source":
        return new SourceConfig({ document: this.item, keyPath: "system.source" }).render({ force: true });
      case "starting-equipment":
        return new StartingEquipmentConfig({ document: this.item }).render({ force: true });
      case "type":
        return new CreatureTypeConfig({ document: this.item, keyPath: "type" }).render({ force: true });
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle opening a document sheet.
   * @this {ItemSheet5e}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static async #showDocument(event, target) {
    const uuid = target.closest("[data-uuid]")?.dataset.uuid;
    const doc = await fromUuid(uuid);
    doc?.sheet?.render({ force: true });
  }

  /* -------------------------------------------- */

  /**
   * Handle showing the Item's art.
   * @this {ItemSheet5e}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static #showIcon(event, target) {
    const title = this.item.system.identified === false ? this.item.system.unidentified.name : this.item.name;
    new foundry.applications.apps.ImagePopout({
      src: this.item.img,
      uuid: this.item.uuid,
      window: { title }
    }).render({ force: true });
  }

  /* -------------------------------------------- */

  /**
   * Handle toggling Item state.
   * @this {ItemSheet5e}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static #toggleState(event, target) {
    const state = target.classList.contains("active");
    this.submit({ updateData: { [target.dataset.property]: !state } });
  }

  /* -------------------------------------------- */
  /*  Form Handling                               */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _processFormData(event, form, formData) {
    const submitData = super._processFormData(event, form, formData);

    // Handle properties
    if ( foundry.utils.hasProperty(submitData, "system.properties") ) {
      submitData.system.properties = filteredKeys(submitData.system.properties);
    }

    return submitData;
  }

  /* -------------------------------------------- */
  /*  Drag & Drop                                 */
  /* -------------------------------------------- */

  /**
   * Handle beginning drag events on the sheet.
   * @param {DragEvent} event  The initiating drag start event.
   * @protected
   */
  _onDragStart(event) {
    const li = event.currentTarget;
    if ( event.target.classList.contains("content-link") ) return;

    // Create drag data
    let dragData;

    // Active Effect
    if ( li.dataset.effectId ) {
      const effect = this.item.effects.get(li.dataset.effectId);
      dragData = effect.toDragData();
    }

    // Activity
    else if ( li.closest("[data-activity-id]") ) {
      const { activityId } = event.target.closest(".activity[data-activity-id]")?.dataset ?? {};
      const activity = this.item.system.activities?.get(activityId);
      dragData = activity.toDragData();
    }

    // Advancement
    else if ( li.classList.contains("advancement-item") ) {
      dragData = this.item.advancement.byId[li.dataset.id]?.toDragData();
    }

    if ( !dragData ) return;

    // Set data transfer
    event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  }

  /* -------------------------------------------- */

  /**
   * Handle dropping items onto the sheet.
   * @param {DragEvent} event  The concluding drag event.
   * @returns {any}
   * @protected
   */
  _onDrop(event) {
    const data = TextEditor.getDragEventData(event);
    const item = this.item;

    /**
     * A hook event that fires when some useful data is dropped onto an ItemSheet5e.
     * @function dnd5e.dropItemSheetData
     * @memberof hookEvents
     * @param {Item5e} item                  The Item5e.
     * @param {ItemSheet5e} sheet            The ItemSheet5e application.
     * @param {object} data                  The data that has been dropped onto the sheet.
     * @returns {boolean}                    Explicitly return `false` to prevent normal drop handling.
     */
    const allowed = Hooks.call("dnd5e.dropItemSheetData", item, this, data);
    if ( allowed === false ) return;
    event.stopPropagation();

    switch ( data.type ) {
      case "ActiveEffect":
        return this._onDropActiveEffect(event, data);
      case "Activity":
        return this._onDropActivity(event, data);
      case "Item":
        return this._onDropItem(event, data);
      case "Advancement":
        return this._onDropAdvancement(event, data);
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle the dropping of ActiveEffect data onto an Item Sheet
   * @param {DragEvent} event                  The concluding DragEvent which contains drop data
   * @param {object} data                      The data transfer extracted from the event
   * @returns {Promise<ActiveEffect|boolean>}  The created ActiveEffect object or false if it couldn't be created.
   * @protected
   */
  async _onDropActiveEffect(event, data) {
    const effect = await ActiveEffect.implementation.fromDropData(data);
    if ( !this.item.isOwner || !effect
      || (this.item.uuid === effect.parent?.uuid)
      || (this.item.uuid === effect.origin) ) return false;
    const effectData = effect.toObject();
    const options = { parent: this.item, keepOrigin: false };

    if ( effect.type === "enchantment" ) {
      effectData.origin ??= effect.parent.uuid;
      options.keepOrigin = true;
      options.dnd5e = {
        enchantmentProfile: effect.id,
        activityId: data.activityId ?? effect.parent?.system.activities?.getByType("enchant").find(a =>
          a.effects.some(e => e._id === effect.id)
        )?.id
      };
    }

    return ActiveEffect.create(effectData, options);
  }

  /* -------------------------------------------- */

  /**
   * Handle dropping an Activity onto the sheet.
   * @param {DragEvent} event       The drag event.
   * @param {object} transfer       The dropped data.
   * @param {object} transfer.data  The Activity data.
   * @protected
   */
  _onDropActivity(event, { data }) {
    const { _id: id, type } = data;
    const source = this.item.system.activities.get(id);

    // Reordering
    if ( source ) {
      const targetId = event.target.closest(".activity[data-activity-id]")?.dataset.activityId;
      const target = this.item.system.activities.get(targetId);
      if ( !target || (target === source) ) return;
      const siblings = this.item.system.activities.filter(a => a._id !== id);
      const sortUpdates = foundry.utils.performIntegerSort(source, { target, siblings });
      const updateData = Object.fromEntries(sortUpdates.map(({ target, update }) => {
        return [target._id, { sort: update.sort }];
      }));
      this.item.update({ "system.activities": updateData });
    }

    // Copying
    else {
      delete data._id;
      this.item.createActivity(type, data, { renderSheet: false });
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle the dropping of an advancement or item with advancements onto the advancements tab.
   * @param {DragEvent} event                  The concluding DragEvent which contains drop data.
   * @param {object} data                      The data transfer extracted from the event.
   * @returns {Promise}
   */
  async _onDropAdvancement(event, data) {
    if ( !this.item.system.advancement ) return;

    let advancements;
    let showDialog = false;
    if ( data.type === "Advancement" ) {
      advancements = [await fromUuid(data.uuid)];
    } else if ( data.type === "Item" ) {
      const item = await Item.implementation.fromDropData(data);
      if ( !item?.system.advancement ) return false;
      advancements = Object.values(item.advancement.byId);
      showDialog = true;
    } else {
      return false;
    }
    advancements = advancements.filter(a => {
      const validItemTypes = CONFIG.DND5E.advancementTypes[a.constructor.typeName]?.validItemTypes
        ?? a.metadata.validItemTypes;
      return !this.item.advancement.byId[a.id]
        && validItemTypes.has(this.item.type)
        && a.constructor.availableForItem(this.item);
    });

    // Display dialog prompting for which advancements to add
    if ( showDialog ) {
      try {
        advancements = await AdvancementMigrationDialog.createDialog(this.item, advancements);
      } catch(err) {
        return false;
      }
    }

    if ( !advancements.length ) return false;
    if ( this.item.actor?.system.metadata?.supportsAdvancement && !game.settings.get("dnd5e", "disableAdvancements") ) {
      const manager = AdvancementManager.forNewAdvancement(this.item.actor, this.item.id, advancements);
      if ( manager.steps.length ) return manager.render(true);
    }

    // If no advancements need to be applied, just add them to the item
    const advancementArray = this.item.system.toObject().advancement;
    advancementArray.push(...advancements.map(a => a.toObject()));
    this.item.update({"system.advancement": advancementArray});
  }

  /* -------------------------------------------- */

  /**
   * Handle dropping another item onto this item.
   * @param {DragEvent} event  The drag event.
   * @param {object} data      The dropped data.
   */
  async _onDropItem(event, data) {
    const item = await Item.implementation.fromDropData(data);
    if ( (item?.type === "spell") && this.item.system.activities ) this._onDropSpell(event, item);
    else this._onDropAdvancement(event, data);
  }

  /* -------------------------------------------- */

  /**
   * Handle creating a "Cast" activity when dropping a spell.
   * @param {DragEvent} event  The drag event.
   * @param {Item5e} item      The dropped item.
   */
  _onDropSpell(event, item) {
    this.item.createActivity("cast", { spell: { uuid: item.uuid } });
  }

  /* -------------------------------------------- */
  /*  Filtering                                   */
  /* -------------------------------------------- */

  /**
   * Filter child documents based on the current set of filters.
   * @param {string} collection    The embedded collection name.
   * @param {Set<string>} filters  Filters to apply to the children.
   * @returns {Document[]}
   * @protected
   */
  _filterChildren(collection, filters) {
    if ( collection === "effects" ) return Array.from(this.item.effects);
    return [];
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Determine whether an Item is considered identified.
   * @param {Item5e} item  The Item.
   * @returns {boolean}
   */
  static isItemIdentified(item) {
    return game.user.isGM || (item.system.identified !== false);
  }

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
   * Determine if an Item support Advancement.
   * @param {Item5e} item  The Item.
   * @returns {boolean}
   */
  static itemHasAdvancement(item) {
    return "advancement" in item.system;
  }

  /* -------------------------------------------- */

  /**
   * Determine if an Item should show an effects tab.
   * @param {Item5e} item  The Item.
   * @returns {boolean}
   */
  static itemHasEffects(item) {
    return this.isItemIdentified(item) && item.system.constructor.metadata.hasEffects;
  }
}
