import { Filter } from "../../filter.mjs";

/**
 * A field for storing filters configuration that initializes to a `Filter` instance.
 */
export default class FiltersField extends foundry.data.fields.JSONField {
  static get _defaults() {
    return Object.assign(super._defaults, {
      initial: "{}"
    });
  }

  /* -------------------------------------------- */

  /** @override */
  initialize(value, model, options={}) {
    try {
      return new Filter(JSON.parse(value));
    } catch(err) {
      return null;
    }
  }
}
