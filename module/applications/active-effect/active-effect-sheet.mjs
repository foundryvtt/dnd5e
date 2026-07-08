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

  /** @override */
  async _renderChange(context) {}

  /* -------------------------------------------- */
  /*  Life-Cycle Handlers                         */
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
    const index = Number(target.closest("[data-index]")?.dataset.index || 0);
    return this.submit({
      updateData: {
        system: {
          changes: this.document.system.toObject().changes.toSpliced(index, 1)
        }
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * Open the config application for editing a change.
   * @this {ActiveEffectSheet5e}
   * @type {ApplicationClickAction}
   */
  static async #onEditChange(event, target) {
    const { changeId } = target.closest("[data-change-id]")?.dataset ?? {};
    const app = new EffectChangeConfig({ changeId, document: this.document });
    this._renderChild(app);
  }

  // TODO: Add context options to changes
}
