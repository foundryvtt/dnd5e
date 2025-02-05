import BaseConfigSheet from "../api/base-config-sheet.mjs";

export default class HabitatConfig extends BaseConfigSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["habitat-config"],
    position: {
      width: 420
    }
  };

  /** @override */
  static PARTS = {
    config: {
      template: "systems/dnd5e/templates/actors/config/habitat-config.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @override */
  get title() {
    return game.i18n.localize("DND5E.Habitat.Configuration.Title");
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const config = CONFIG.DND5E.habitats;
    const { details } = this.document.system._source;
    const value = Object.fromEntries(details.habitat.value.map(({ type, subtype }) => [type, { type, subtype }]));
    const any = "any" in value;
    context.custom = {
      field: this.document.system.schema.fields.details.fields.habitat.fields.custom,
      value: details.habitat.custom,
      name: "custom"
    };
    context.habitats = [
      { label: config.any.label, id: "any", checked: any },
      ...Object.entries(config).reduce((arr, [key, { label, subtypes }]) => {
        if ( key === "any" ) return arr;
        const checked = any || (key in value);
        arr.push({
          checked, label,
          id: key,
          disabled: any,
          subtype: value[key]?.subtype,
          subtypes: !any && subtypes && checked
        });
        return arr;
      }, []).sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang))
    ];
    context.rows = Math.ceil(context.habitats.reduce((n, { subtypes }) => n + (subtypes ? 2 : 1), 0) / 2);
    return context;
  }

  /* -------------------------------------------- */
  /*  Form Submission                             */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _processFormData(event, form, formData) {
    const submitData = super._processFormData(event, form, formData);
    const value = Object.entries(submitData).reduce((arr, [id, data]) => {
      if ( id === "custom" ) return arr;
      const entry = { type: id };
      if ( data.subtype ) entry.subtype = data.subtype;
      if ( data.type ) arr.push(entry);
      return arr;
    }, []);
    return foundry.utils.expandObject({
      "system.details.habitat": { value, custom: submitData.custom }
    });
  }
}
