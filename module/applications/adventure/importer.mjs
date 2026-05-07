import { filteredKeys } from "../../utils.mjs";
import ApplicationV2Mixin from "../api/application-v2-mixin.mjs";

const { AdventureImporterV2 } = foundry.applications.sheets;
const { BooleanField, SchemaField } = foundry.data.fields;

/**
 * Extension of the default adventure importer with system-specific design and pre/post action support.
 */
export default class AdventureImporter5e extends ApplicationV2Mixin(AdventureImporterV2, { handlebars: false }) {

  /** @inheritDoc */
  static PARTS = {
    ...super.PARTS,
    body: {
      template: "systems/dnd5e/templates/adventure/importer.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @override */
  get title() {
    return this.document.name;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override */
  _prepareImportOptionsSchema(options) {
    const importActions = this.adventure.importActions;
    if ( !importActions.length ) return;
    const selected = game.settings.get("core", "adventureImports")[this.adventure.uuid]?.options?.actions ?? {};
    const fields = {};
    for ( const action of importActions ) {
      fields[`actions.${action.id}`] = new BooleanField({
        initial: selected[action.id] ?? action.default, label: action.label
      });
    }
    return new SchemaField(fields);
  }

  /* -------------------------------------------- */
  /*  Import Workflows                            */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _configureImport(importOptions) {
    await super._configureImport(importOptions);
    importOptions.actions = filteredKeys(importOptions.actions);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preImport(importData, importOptions) {
    await super._preImport(importData, importOptions);
    const actions = this.adventure.importActions
      .filter(o => o.lifecycle === "pre" && importOptions.actions?.includes(o.id));
    for ( const action of actions ) {
      await action.handler.call(this.adventure, action, importData, importOptions);
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onImport(importResult, importOptions) {
    await super._onImport(importResult, importOptions);
    const actions = this.adventure.importActions
      .filter(o => o.lifecycle === "post" && importOptions.actions?.includes(o.id));
    for ( const action of actions ) {
      await action.handler.call(this.adventure, action, importResult, importOptions);
    }
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _onChangeForm(formConfig, event) {
    if ( (event.target.name === "importFields") && (event.target.getAttribute("value") === "all") ) {
      this._onToggleImportAll(event);
    }
    super._onChangeForm(formConfig, event);
  }

  /* -------------------------------------------- */

  /** @override */
  _onToggleImportAll(event) {
    const target = event.target;
    const section = target.closest(".import-controls");
    const checked = target.checked;
    section.querySelectorAll("dnd5e-checkbox").forEach(input => {
      if ( input === target ) return;
      if ( input.value !== "folders" ) input.disabled = checked;
      if ( checked ) input.checked = true;
    });
  }
}
