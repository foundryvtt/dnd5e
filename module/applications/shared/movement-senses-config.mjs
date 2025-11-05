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
   * @type {string}
   */
  get types() {
    if ( this.options.type === "senses" ) return Object.keys(CONFIG.DND5E.senses);
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
    context.fields = this.document.system.schema.getField(this.keyPath)?.fields;
    if ( context.fields ) {
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
    }

    if ( this.options.type === "movement" ) this._prepareTravelFields(context);

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
    return extras;
  }

  /* -------------------------------------------- */

  /**
   * Prepare travel-specific fields.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @protected
   */
  _prepareTravelFields(context) {
    const keyPath = this.keyPath.replace(".movement", ".travel");
    const data = foundry.utils.getProperty(this.document.system._source, keyPath);
    if ( !data ) return;
    const derived = foundry.utils.getProperty(this.document.system, keyPath);
    context.travel = {
      data,
      extras: [],
      fields: this.document.system.schema.getField(keyPath).fields,
      unitsOptions: Object.entries(CONFIG.DND5E.travelUnits).map(([value, { label }]) => ({ value, label }))
    };
    context.travel.types = Object.entries(CONFIG.DND5E.travelTypes).map(([key, config]) => ({
      label: config.label,
      pace: {
        field: context.travel.fields.paces.model,
        name: `system.${keyPath}.paces.${key}`,
        placeholder: derived.paces[key] && !data.paces[key] ? derived.paces[key] : "",
        value: data.paces[key]
      },
      speed: {
        field: context.travel.fields.speeds.model,
        name: `system.${keyPath}.speeds.${key}`,
        placeholder: derived.speeds[key] && !data.speeds[key] ? derived.speeds[key] : "",
        value: data.speeds[key]
      }
    }));
    if ( context.travel.fields.pace ) context.travel.extras.push({
      field: context.travel.fields.pace,
      localize: true,
      options: Object.entries(CONFIG.DND5E.travelPace).map(([value, { label }]) => ({ value, label })),
      value: data.pace
    });
    if ( context.travel.fields.time ) context.travel.extras.push({
      field: context.travel.fields.time,
      localize: true,
      value: data.time
    });
    if ( context.fields ) context.legend = game.i18n.localize("DND5E.MOVEMENT.Speed");
  }
}
