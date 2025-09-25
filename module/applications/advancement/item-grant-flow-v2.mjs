import AdvancementFlow from "./advancement-flow-v2.mjs";

const { StringField } = foundry.data.fields;

/**
 * Inline application that presents the player with a list of items to be added.
 */
export default class ItemGrantFlow extends AdvancementFlow {

  /** @override */
  static PARTS = {
    ...super.PARTS,
    content: {
      template: "systems/dnd5e/templates/advancement/item-grant-flow-v2.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override */
  async _prepareContentContext(context, options) {
    context.abilities = this.getSelectAbilities();
    context.optional = this.advancement.configuration.optional;

    const config = this.advancement.configuration;
    const added = this.retainedData?.items.map(i => foundry.utils.getProperty(i, "flags.dnd5e.sourceId"))
      ?? this.advancement.value.added;
    const checked = new Set(Object.values(added ?? {}));
    context.items = config.items.map(i => {
      const item = foundry.utils.deepClone(fromUuidSync(i.uuid));
      if ( !item ) return null;
      item.checked = checked.has(item.uuid);
      item.optional = config.optional || i.optional;
      return item;
    }, []).filter(i => i);

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Get the context information for selected spell abilities.
   * @returns {object}
   */
  getSelectAbilities() {
    const config = this.advancement.configuration;
    return config.spell?.ability.size > 1 ? {
      field: new StringField({ required: true, blank: false }),
      options: config.spell?.ability.size > 1 ? config.spell.ability.map(value => ({
        value, label: CONFIG.DND5E.abilities[value]?.label
      })) : null,
      value: this.advancement.value.ability
    } : null;
  }

  /* -------------------------------------------- */
  /*  Form Handling                               */
  /* -------------------------------------------- */

  /** @override */
  async _handleForm(event, form, formData) {
    if ( event.target?.name === "ability" ) {
      await this.advancement.apply(this.level, { ability: event.target.value });
    } else if ( event.target?.tagName === "DND5E-CHECKBOX" ) {
      if ( event.target.checked ) await this.advancement.apply(this.level, { selected: [event.target.name] });
      else await this.advancement.reverse(this.level, { uuid: event.target.name });
    }
  }
}
