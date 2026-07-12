import ApplicationV2Mixin from "./api/application-v2-mixin.mjs";

const { RollTableSheet } = foundry.applications.sheets;

/**
 * Extension of the default roll table sheet to add dnd5e styling.
 */
export default class RollTableSheet5e extends ApplicationV2Mixin(RollTableSheet, { handlebars: false }) {

  /** @override */
  static DEFAULT_OPTIONS = {
    actions: {
      changeMode: RollTableSheet5e.#onChangeMode,
      editImage: RollTableSheet5e._onEditImage
    },
    classes: ["titlebar", "hidden-title"]
  };

  /* -------------------------------------------- */
  /*  Life-Cycle Handlers                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _attachFrameListeners() {
    super._attachFrameListeners();
    new dnd5e.applications.ContextMenu5e(this.element, "[data-result-id]", this._getEntryContextOptions(), { jQuery: false });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options);

    this._renderModeToggle();
    this.element.querySelector(".sheet-header img")?.classList.add("document-image");
    this.element.querySelector(".sheet-header [data-action=changeMode]")?.remove();
    this.element.querySelectorAll("tbody .inline-control").forEach(c => c.classList.add("unbutton", "control-button"));
    this._replaceElements("input[type=checkbox]", "dnd5e-checkbox");
    this._replaceElements('table td.image img[src$=".svg"]', "dnd5e-icon", {
      callback: icon => {
        if ( icon.src === "icons/svg/d20-black.svg" ) icon.src = "systems/dnd5e/icons/svg/dice/d20.svg";
      }
    });
    this.element.querySelectorAll("table td.image img").forEach(icon => icon.classList.add("gold-icon"));
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Change the sheet mode.
   * @param {PrimarySheetMixin.MODES} [mode]  Mode to set. If not provided, mode will be toggled.
   */
  async changeMode(mode) {
    this.mode = mode ? mode === dnd5e.applications.item.ItemSheet5e.MODES.PLAY ? "view" : "edit"
      : this.isEditMode ? "view" : "edit";
    const button = this.element?.querySelector('[data-action="changeMode"]');
    if ( button ) {
      const label = _loc(`DND5E.SheetMode${this.isEditMode ? "Edit" : "Play"}`);
      button.checked = this.isEditMode;
      button.dataset.tooltip = label;
      button.setAttribute("aria-label", label);
    }
    await this.submit();
    this.render();
  }

  /* -------------------------------------------- */

  /**
   * Handle changing the sheet mode.
   * @this {RollTableSheet5e}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static #onChangeMode(event, target) {
    this.changeMode();
  }

  /* -------------------------------------------- */

  /**
   * Get context menu entries for roll table entries.
   * @returns {ContextMenuEntry[]}
   * @protected
   */
  _getEntryContextOptions() {
    const getResult = target => this.document.results.get(target.closest("[data-result-id]")?.dataset?.resultId);
    return [
      {
        label: "DND5E.ContextMenuActionView",
        icon: "fa-solid fa-eye",
        visible: () => !this.document.isOwner || this.document.compendium?.locked,
        onClick: (event, target) => getResult(target)?.sheet.render({ force: true })
      },
      {
        label: "DND5E.ContextMenuActionEdit",
        icon: "fa-solid fa-pen-to-square",
        visible: () => this.document.isOwner && !this.document.compendium?.locked,
        onClick: (event, target) => getResult(target)?.sheet.render({ force: true })
      },
      {
        label: "DND5E.ContextMenuActionDuplicate",
        icon: "fa-solid fa-copy",
        visible: () => this.document.isOwner && !this.document.compendium?.locked,
        onClick: async (event, target) => {
          await this.submit();
          const createData = getResult(target)?.toObject() ?? {};
          delete createData._id;
          delete createData.range;
          delete createData.weight;
          this._createResult(createData);
        }
      },
      {
        label: "DND5E.ContextMenuActionDelete",
        icon: "fa-solid fa-trash",
        visible: () => this.document.isOwner && !this.document.compendium?.locked,
        onClick: (event, target) => getResult(target)?.deleteDialog()
      },
      {
        label: "TABLE.ACTIONS.DrawSpecificResult",
        icon: "fa-solid fa-up-from-bracket",
        onClick: (event, target) => this.document.draw({ results: [getResult(target)] }),
        group: "state"
      },
      {
        label: "TABLE.ACTIONS.ToggleDrawn",
        icon: "fa-solid fa-lock",
        visible: () => this.document.isOwner && !this.document.compendium?.locked,
        onClick: async (event, target) => {
          await this.submit();
          const result = getResult(target);
          result.update({ drawn: !result.drawn });
        },
        group: "state"
      }
    ];
  }
}
