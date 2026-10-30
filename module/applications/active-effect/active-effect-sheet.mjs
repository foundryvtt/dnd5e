import { nextSortValue } from "../../utils.mjs";
import ApplicationV2Mixin from "../api/application-v2-mixin.mjs";
import DragDropApplicationMixin from "../api/drag-drop-mixin.mjs";
import EffectChangeConfig from "./effect-change-config.mjs";

const { ActiveEffectConfig } = foundry.applications.sheets;
const TextEditor = foundry.applications.ux.TextEditor.implementation;

/**
 * Extension of the default active effect sheet to add conditional fields & dnd5e styling.
 */
export default class ActiveEffectSheet5e extends DragDropApplicationMixin(
  ApplicationV2Mixin(ActiveEffectConfig, { handlebars: false })
) {

  /** @override */
  static DEFAULT_OPTIONS = {
    actions: {
      addChange: ActiveEffectSheet5e.#onAddChange,
      deleteChange: ActiveEffectSheet5e.#onDeleteChange,
      editChange: ActiveEffectSheet5e.#onEditChange
    },
    classes: ["standard-form", "titlebar", "hidden-title"],
    form: {
      closeOnSubmit: false,
      submitOnChange: true
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    header: {
      template: "systems/dnd5e/templates/effects/effect-header.hbs"
    },
    tabs: {
      template: "templates/generic/tab-navigation.hbs"
    },
    details: {
      template: "systems/dnd5e/templates/effects/effect-details.hbs",
      scrollable: [""]
    },
    duration: {
      template: "templates/sheets/active-effect/duration.hbs"
    },
    changes: {
      template: "systems/dnd5e/templates/effects/effect-changes.hbs",
      templates: [
        "systems/dnd5e/templates/effects/columns/value.hbs"
      ],
      scrollable: ["ol.changes"]
    }
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.systemFields = this.document.system.schema.fields;
    context.additionalChangesFields = [];
    await this.document.system.getSheetData?.(context);
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    switch ( partId ) {
      case "changes": return this._prepareChangesContext(context, options);
      case "details": return this._prepareDetailsContext(context, options);
      case "duration": return this._prepareDurationContext(context, options);
    }
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the changes tab.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {ApplicationRenderContext}
   * @protected
   */
  async _prepareChangesContext(context, options) {
    context.changes = (await Promise.all(
      context.document.system.changes.map(c => this.document.getSheetChangeContext(c))
    )).sort((lhs, rhs) => lhs.sort - rhs.sort);
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
    const { statuses, system } = context.document;
    if ( system.conditions ) {
      if ( statuses.size && system.conditions.some(f => f.k?.startsWith?.("statuses.")) ) {
        context.conditionsWarning = "DND5E.EFFECT.Warning.StatusCondition";
      } else if ( system.conditions.some(f => f.k?.startsWith?.("roll.")) ) {
        context.conditionsWarning = "DND5E.EFFECT.Warning.RollCondition";
      }
    }
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the duration tab.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {ApplicationRenderContext}
   * @protected
   */
  async _prepareDurationContext(context, options) {
    context.expiryEvents = Object.fromEntries(
      ActiveEffect.implementation.expiryOptions.map(({ value, ...data }) => [value, data])
    );
    return context;
  }

  /* -------------------------------------------- */

  /** @override */
  async _renderChange(context) {}

  /* -------------------------------------------- */

  /** @inheritDoc */
  _toggleDisabled(disabled) {
    super._toggleDisabled(disabled);
    this.element.querySelectorAll(".always-interactive").forEach(input => input.disabled = false);
  }

  /* -------------------------------------------- */
  /*  Life-Cycle Handlers                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _attachFrameListeners() {
    super._attachFrameListeners();
    new dnd5e.applications.ContextMenu5e(this.element, "[data-change-id]", this._getEntryContextOptions(), { jQuery: false });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    this.element.classList.add(`tab-${this.tabGroups.sheet}`);

    // Create child button
    if ( this.isEditable ) {
      const button = document.createElement("button");
      button.type = "button";
      button.ariaLabel = _loc("CONTROLS.CommonCreate");
      button.classList.add("create-child", "gold-button", "always-interactive");
      button.dataset.action = "addChange";
      button.innerHTML = '<i class="fas fa-plus" inert></i>';
      this.element.querySelector(".window-content").append(button);
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options);

    // Special durations imply their own value & units, so the normal duration fields are not configurable.
    const duration = this.element.querySelector("[data-duration]");
    if ( duration ) duration.hidden = !this.document.expirySupportsDuration();

    this.element.querySelectorAll("[data-context-menu]").forEach(control =>
      control.addEventListener("click", dnd5e.applications.ContextMenu5e.triggerEvent)
    );

    new CONFIG.ux.DragDrop({
      dragSelector: "[data-change-id]",
      dropSelector: null,
      callbacks: {
        dragstart: this._onDragStart.bind(this),
        dragover: this._onDragOver.bind(this),
        drop: this._onDrop.bind(this)
      }
    }).bind(this.element);
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /** @inheritDoc */
  changeTab(tab, group, options) {
    super.changeTab(tab, group, options);
    if ( group !== "sheet" ) return;
    this.element.className = this.element.className.replace(/tab-\w+/g, "");
    this.element.classList.add(`tab-${tab}`);
  }

  /* -------------------------------------------- */

  /**
   * Get context menu entries for changes.
   * @returns {ContextMenuEntry[]}
   * @protected
   */
  _getEntryContextOptions() {
    return [
      {
        label: "DND5E.ContextMenuActionView",
        icon: "fa-solid fa-eye",
        visible: () => !this.document.isOwner || this.document.compendium?.locked,
        onClick: (event, target) => this._onAction(target, "view", { event })
      },
      {
        label: "DND5E.ContextMenuActionEdit",
        icon: "fa-solid fa-pen-to-square",
        visible: () => this.document.isOwner && !this.document.compendium?.locked,
        onClick: (event, target) => this._onAction(target, "edit", { event })
      },
      {
        label: "DND5E.ContextMenuActionDuplicate",
        icon: "fa-solid fa-copy",
        visible: () => this.document.isOwner && !this.document.compendium?.locked,
        onClick: (event, target) => this._onAction(target, "duplicate", { event })
      },
      {
        label: "DND5E.ContextMenuActionDelete",
        icon: "fa-solid fa-trash",
        visible: () => this.document.isOwner && !this.document.compendium?.locked,
        onClick: (event, target) => this._onAction(target, "delete", { event })
      }
    ];
  }

  /* -------------------------------------------- */

  /**
   * Handle change actions.
   * @param {Element} target                Button or context menu entry that triggered this action.
   * @param {string} action                 Action being triggered.
   * @param {object} [options]
   * @param {PointerEvent} [options.event]  The triggering event.
   * @returns {Promise}
   * @protected
   */
  async _onAction(target, action, { event }={}) {
    const { changeId } = target.closest("[data-change-id]")?.dataset ?? {};
    switch ( action ) {
      case "delete":
        return foundry.applications.api.DialogV2.confirm({
          content: `<p><strong>${_loc("COMMON.AreYouSure")}</strong> ${_loc("SIDEBAR.DeleteWarning", {
            type: _loc("DND5E.EFFECT.Change.Label")
          })}</p>`,
          yes: {
            callback: () => {
              const changes = this.document.system.toObject().changes;
              changes.findSplice(c => c._id === changeId);
              this.submit({ updateData: { system: { changes } } });
            }
          },
          window: {
            icon: "fa-solid fa-trash",
            title: `${_loc("DOCUMENT.Delete", { type: _loc("DND5E.EFFECT.Change.Label") })}: ${changeId}`
          }
        });
      case "duplicate":
        const changeData = this.document.system.toObject().changes.find(c => c._id === changeId);
        delete changeData._id;
        return this.submit({
          updateData: {
            system: { changes: [...this.document.system.toObject().changes, changeData] }
          }
        });
      case "edit":
      case "view":
        this._renderChild(new EffectChangeConfig({ changeId, document: this.document }));
        break;
    }
  }

  /* -------------------------------------------- */

  /**
   * Add a change from the effect's changes array.
   * @this {ActiveEffectSheet5e}
   * @type {ApplicationClickAction}
   */
  static async #onAddChange(event, target) {
    await this.submit({
      updateData: {
        system: {
          changes: [
            ...this.document.system.toObject().changes,
            {
              ...this.document.system.schema.fields.changes.element.getInitialValue(),
              sort: nextSortValue(this.document.system.changes)
            }
          ]
        }
      }
    });
    const app = new EffectChangeConfig({ changeId: this.document.system.changes.at(-1)._id, document: this.document });
    this._renderChild(app);
  }

  /* -------------------------------------------- */

  /**
   * Delete a change from the effect's changes array.
   * @this {ActiveEffectSheet5e}
   * @type {ApplicationClickAction}
   */
  static async #onDeleteChange(event, target) {
    this._onAction(target, "delete", { event });
  }

  /* -------------------------------------------- */

  /**
   * Open the config application for editing a change.
   * @this {ActiveEffectSheet5e}
   * @type {ApplicationClickAction}
   */
  static async #onEditChange(event, target) {
    this._onAction(target, "edit", { event });
  }

  /* -------------------------------------------- */
  /*  Drag & Drop                                 */
  /* -------------------------------------------- */

  /** @override */
  _allowedDropBehaviors(event, data) {
    return new Set(["copy", "link", "move"]);
  }

  /* -------------------------------------------- */

  /** @override */
  _defaultDropBehavior(event, data) {
    return data.parent === this.document.uuid ? "move" : "copy";
  }

  /* -------------------------------------------- */

  /**
   * Handle beginning drag events on the sheet.
   * @param {DragEvent} event  The initiating drag start event.
   * @protected
   */
  _onDragStart(event) {
    const li = event.currentTarget;
    if ( event.target.classList.contains("content-link") ) return;

    const change = this.document.system._source.changes.find(c => c._id === li.dataset.changeId);
    if ( !change ) return;

    const dragData = {
      type: "ActiveEffectChange",
      data: change,
      parent: this.document.uuid
    };

    // Set data transfer
    event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
    if ( !this.document.isOwner || this.document.collection?.locked ) {
      event.dataTransfer.effectAllowed = "copyLink";
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle dropping items onto the sheet.
   * @param {DragEvent} event  The concluding drag event.
   * @returns {any}
   * @protected
   */
  async _onDrop(event) {
    event._behavior = this._dropBehavior(event);
    const data = TextEditor.getDragEventData(event);

    // Reorder changes when dragging on same effect document
    if ( (event._behavior === "move") && (data.parent === this.document.uuid) ) {
      const targetId = event.target.closest("[data-change-id]")?.dataset.changeId;
      const target = this.document.system.changes.find(c => c._id === targetId);
      if ( !target || (target._id === data.data._id) ) return;
      const siblings = this.document.system.changes.filter(c => c._id !== data.data._id);
      const sortUpdates = foundry.utils.performIntegerSort(data.data, { target, siblings });
      const updateData = this.document.system.toObject().changes.map(c => {
        const update = sortUpdates.find(u => u.target._id === c._id);
        if ( update ) c.sort = update.update.sort;
        return c;
      });
      await this.document.update({ "system.changes": updateData });
      return sortUpdates.length > 0 ? this.document : null;
    }

    // Create new change
    const change = { ...data.data, _id: foundry.utils.randomID(), sort: nextSortValue(this.document.system.changes) };
    await this.submit({
      updateData: {
        system: {
          changes: [...this.document.system.toObject().changes, change]
        }
      }
    });

    // Delete old change if moved
    if ( event._behavior === "move" ) {
      const parent = await fromUuid(data.parent);
      const changes = parent.system.toObject().changes;
      changes.findSplice(c => c._id === data.data._id);
      parent.update({ system: { changes } });
    }

    return this.document;
  }
}
