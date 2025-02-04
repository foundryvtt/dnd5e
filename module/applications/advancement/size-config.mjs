import { filteredKeys } from "../../utils.mjs";
import AdvancementConfig from "./advancement-config-v2.mjs";

const { BooleanField } = foundry.data.fields;

/**
 * Configuration application for size advancement.
 */
export default class SizeConfig extends AdvancementConfig {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["size"]
  };

  /* -------------------------------------------- */

  /** @inheritDoc */
  static PARTS = {
    ...super.PARTS,
    details: {
      template: "systems/dnd5e/templates/advancement/size-config-details.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    return foundry.utils.mergeObject(context, {
      default: {
        hint: this.advancement.automaticHint
      },
      showLevelSelector: false,
      sizes: Object.entries(CONFIG.DND5E.actorSizes).reduce((obj, [key, { label }]) => {
        obj[key] = {
          field: new BooleanField({ label }),
          input: context.inputs.createCheckboxInput,
          value: this.advancement.configuration.sizes.has(key)
        };
        return obj;
      }, {})
    });
  }

  /* -------------------------------------------- */
  /*  Form Handling                               */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async prepareConfigurationUpdate(configuration) {
    configuration.sizes = filteredKeys(configuration.sizes ?? {});
    return configuration;
  }
}
