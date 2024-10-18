import Actor5e from "../../documents/actor/actor.mjs";
import BaseConfigSheet from "../actor/api/base-config-sheet.mjs";

/**
 * Configuration application for an actor's creature type.
 */
export default class CreatureTypeConfig extends BaseConfigSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["creature-type"],
    keyPath: "details.type",
    position: {
      width: 420
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    config: {
      template: "systems/dnd5e/templates/shared/config/creature-type-config.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @override */
  get title() {
    return game.i18n.localize("DND5E.CreatureType");
  }

  /* -------------------------------------------- */

  /**
   * Return a reference to the Actor. Either the NPCs themselves if they are being edited, otherwise the parent Actor
   * if a race Item is being edited.
   * @returns {Actor5e}
   */
  get actor() {
    return this.object.actor ?? this.object;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    const source = this.document.system._source;

    context.data = foundry.utils.getProperty(source, this.options.keyPath) ?? {};
    context.fields = this.document.system.schema.getField(this.options.keyPath).fields;
    context.keyPath = `system.${this.options.keyPath}`;

    context.swarmOptions = [
      { value: "", label: "" },
      ...Object.entries(CONFIG.DND5E.actorSizes).map(([value, { label }]) => ({ value, label })).reverse()
    ];
    context.typeOptions = Object.entries(CONFIG.DND5E.creatureTypes)
      .map(([value, { label }]) => ({ value, label, selected: context.data.value === value }));
    if ( context.fields.custom ) context.custom = {
      enabled: true,
      selected: context.data.value === "custom"
    };
    context.rows = Math.ceil((context.typeOptions.length + (context.custom.enabled ? 1 : 0)) / 2);
    context.preview = Actor5e.formatCreatureType(context.data);

    return context;
  }
}
