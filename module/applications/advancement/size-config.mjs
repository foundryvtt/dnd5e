import { filteredKeys } from "../../utils.mjs";
import AdvancementConfig from "./advancement-config.mjs";

/**
 * Configuration application for size advancement.
 */
export default class SizeConfig extends AdvancementConfig {

  /** @inheritDoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "advancement", "size"],
      template: "systems/dnd5e/templates/advancement/size-config.hbs"
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  getData() {
    return foundry.utils.mergeObject(super.getData(), {
      default: {
        hint: this.advancement.automaticHint
      },
      showLevelSelector: false,
      sizes: Object.entries(CONFIG.DND5E.actorSizes).reduce((obj, [key, { label }]) => {
        obj[key] = { label, chosen: this.advancement.configuration.sizes.has(key) };
        return obj;
      }, {})
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async prepareConfigurationUpdate(configuration) {
    configuration.sizes = filteredKeys(configuration.sizes ?? {});
    return configuration;
  }
}
