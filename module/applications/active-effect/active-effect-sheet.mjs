import ApplicationV2Mixin from "../api/application-v2-mixin.mjs";
import EffectChangeConfig from "./effect-change-config.mjs";

const { ActiveEffectConfig } = foundry.applications.sheets;

/**
 * Extension of the default active effect sheet to add conditional fields & dnd5e styling.
 */
export default class ActiveEffectSheet5e extends ApplicationV2Mixin(ActiveEffectConfig, { handlebars: false }) {

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
    context.changes = await Promise.all(
      context.document.system.changes.map(c => this.document.getSheetChangeContext(c))
    );
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
    const general = _loc("DND5E.ACTIVEEFFECT.Expiry.GROUPS.General");
    const specific = _loc("DND5E.ACTIVEEFFECT.Expiry.GROUPS.Specific");

    for ( const [expiry, label] of Object.entries(context.expiryEvents) ) {
      context.expiryEvents[expiry] = { group: general, label };
    }
    for ( const expiry of dnd5e.documents.ActiveEffect5e.PSEUDO_EXPIRIES ) {
      context.expiryEvents[expiry] = {
        group: specific,
        label: _loc(`DND5E.ACTIVEEFFECT.Expiry.${expiry.capitalize()}`)
      };
    }
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
            this.document.system.schema.fields.changes.element.getInitialValue()
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
}
