import { defaultUnits } from "../../utils.mjs";
import BaseConfigSheet from "../actor/api/base-config-sheet.mjs";

/**
 * Configuration application for an actor or species's movement & senses.
 */
export default class MovementSensesConfig extends BaseConfigSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    type: null,
    keyPath: null,
    position: {
      width: 420
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    config: {
      template: "systems/dnd5e/templates/shared/config/movement-senses-config.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Path to the movement or senses data on the document.
   * @type {string}
   */
  get keyPath() {
    let keyPath = this.options.keyPath ?? `${this.document instanceof Actor ? "attributes." : ""}${this.options.type}`;
    if ( keyPath.startsWith("system.") ) keyPath = keyPath.slice(7);
    return keyPath;
  }

  /* -------------------------------------------- */

  /** @override */
  get title() {
    return game.i18n.localize(this.options.type === "movement" ? "DND5E.Movement" : "DND5E.Senses");
  }

  /* -------------------------------------------- */

  /**
   * Specific types measured, depending on trait type and actor type.
   * @type {Record<string, string>}
   */
  get types() {
    if ( this.options.type === "senses" ) return Object.keys(CONFIG.DND5E.senses);
    if ( this.document.type === "group" ) return ["land", "water", "air"];
    return Object.keys(CONFIG.DND5E.movementTypes);
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _initializeApplicationOptions(options) {
    options = super._initializeApplicationOptions(options);
    options.uniqueId = `${options.type}-${options.document.uuid}`.replace(/\./g, "-");
    return options;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    const source = this.document.system._source;
    const placeholderData = this.document.system.details?.race?.system?.[this.options.type] ?? null;

    context.data = foundry.utils.getProperty(source, this.keyPath) ?? {};
    context.fields = this.document.system.schema.getField(this.keyPath).fields;
    context.extras = this._prepareExtraFields(context);
    context.types = this.types.map(key => ({
      field: context.fields[key],
      value: context.data[key],
      placeholder: placeholderData?.[key] ?? ""
    }));

    context.unitsOptions = Object.entries(CONFIG.DND5E.movementUnits).map(([value, { label }]) => ({ value, label }));
    context.unitsOptions.blank = false;
    if ( (this.document.type === "character") || ((this.document.type === "npc") && placeholderData) ) {
      const automaticUnit = CONFIG.DND5E.movementUnits[placeholderData?.units ?? defaultUnits("length")]?.label ?? "";
      context.unitsOptions.blank = true;
      context.unitsOptions.unshift(
        { value: "", label: game.i18n.format("DND5E.AutomaticValue", { value: automaticUnit.toLowerCase() }) },
        { rule: true }
      );
    }

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare the additional fields listed in the form.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @returns {object[]}
   * @protected
   */
  _prepareExtraFields(context) {
    const extras = [];
    if ( context.fields.hover ) context.hover = {
      field: context.fields.hover,
      input: context.inputs.createCheckboxInput,
      value: context.data.hover,
      localize: true
    };
    if ( context.fields.ignoredDifficultTerrain ) extras.push({
      field: context.fields.ignoredDifficultTerrain,
      value: context.data.ignoredDifficultTerrain,
      options: [
        { value: "all", label: game.i18n.localize("DND5E.REGIONBEHAVIORS.DIFFICULTTERRAIN.Type.All") },
        { value: "magical", label: game.i18n.localize("DND5E.REGIONBEHAVIORS.DIFFICULTTERRAIN.Type.Magical") },
        { value: "nonmagical", label: game.i18n.localize("DND5E.REGIONBEHAVIORS.DIFFICULTTERRAIN.Type.Nonmagical") },
        { rule: true },
        ...Object.entries(CONFIG.DND5E.difficultTerrainTypes).map(([value, { label }]) => ({ value, label }))
      ],
      localize: true
    });
    if ( context.fields.pace ) extras.push({
      field: context.fields.pace,
      value: context.data.pace,
      options: Object.entries(CONFIG.DND5E.travelPace).map(([value, { label }]) => ({ value, label })),
      localize: true
    });
    return extras;
  }
}
