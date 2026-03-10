import FiltersInputElement from "../../applications/components/filters-input.mjs";
import { Filter } from "../../filter.mjs";

/**
 * A field for storing filters configuration that initializes to a `Filter` instance.
 */
export default class FiltersField extends foundry.data.fields.JSONField {

  /** @override */
  static get _defaults() {
    return Object.assign(super._defaults, {
      initial: "{}"
    });
  }

  /* -------------------------------------------- */
  /*  Initialization and Updates                  */
  /* -------------------------------------------- */

  /** @override */
  initialize(value, model, options={}) {
    try {
      return new Filter(JSON.parse(value));
    } catch(err) {
      return null;
    }
  }

  /* -------------------------------------------- */
  /*  Form Field Integration                      */
  /* -------------------------------------------- */

  /** @override */
  _toInput(config) {
    config.value ??= this.initial;
    return FiltersInputElement.create(config);
  }
}
