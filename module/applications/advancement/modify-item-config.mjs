import AdvancementConfig from "./advancement-config-v2.mjs";

/**
 * Configuration application for modify item advancement.
 */
export default class ModifyItemConfig extends AdvancementConfig {
  /** @override */
  static DEFAULT_OPTIONS = {
    actions: {
      addChange: ModifyItemConfig.#addChange,
      deleteChange: ModifyItemConfig.#deleteChange,
      dissociateEffect: ModifyItemConfig.#dissociateEffect
    },
    classes: ["modify-item"],
    position: {
      width: 500
    }
  };

  /* -------------------------------------------- */

  /** @inheritDoc */
  static PARTS = {
    ...super.PARTS,
    changes: {
      template: "systems/dnd5e/templates/advancement/modify-item-config-changes.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    const appliedChanges = new Set(this.advancement.configuration.changes.map(c => c._id));
    context.allEnchantments = this.item.effects
      .filter(e => e.type === "enchantment")
      .map(effect => ({ value: effect.id, label: effect.name, selected: appliedChanges.has(effect.id) }));
    context.changes = context.configuration.data.changes.reduce((arr, data, index) => {
      const effect = this.item.effects.get(data._id);
      if ( effect ) arr.push({
        data, effect,
        contentLink: effect.toAnchor().outerHTML,
        fields: context.configuration.fields.changes.element.fields,
        prefix: `configuration.changes.${index}.`
      });
      return arr;
    }, []);

    context.hasEffectsTab = !!this.item.system.metadata?.hasEffects;

    return context;
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle creating a new effect and associating with a change.
   * @this {ModifyItemConfig}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static async #addChange(event, target) {
    const effectData = {
      name: this.advancement.title,
      img: this.advancement.icon,
      origin: this.item.uuid,
      type: "enchantment"
    };
    const [created] = await this.item.createEmbeddedDocuments("ActiveEffect", [effectData], { render: false });
    this.advancement.update({
      "configuration.changes": [...this.advancement.configuration.toObject().changes, { _id: created.id }]
    });
  }

  /* -------------------------------------------- */

  /**
   * Handle removing a change and deleting it associated effect.
   * @this {ModifyItemConfig}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static async #deleteChange(event, target) {
    const effectId = target.closest("[data-effect-id]")?.dataset.effectId;
    const result = await this.item.effects.get(effectId)?.deleteDialog({}, { render: false });
    if ( result instanceof ActiveEffect ) {
      const changes = this.advancement.configuration.toObject().changes.filter(e => e._id !== effectId);
      this.advancement.update({ "configuration.changes": changes });
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle dissociate an effect from a change without deleting it.
   * @this {ModifyItemConfig}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static async #dissociateEffect(event, target) {
    const effectId = target.closest("[data-effect-id]")?.dataset.effectId;
    if ( !effectId ) return;
    const changes = this.advancement.configuration.toObject().changes.filter(e => e._id !== effectId);
    this.advancement.update({ "configuration.changes": changes });
  }

  /* -------------------------------------------- */
  /*  Form Handling                               */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _prepareSubmitData(event, formData) {
    const submitData = super._prepareSubmitData(event, formData);
    let changes = submitData.configuration?.changes ? Object.values(submitData.configuration.changes)
      : this.advancement.configuration.toObject().changes;
    if ( foundry.utils.hasProperty(submitData, "selectedEnchantments") ) {
      changes = changes.filter(e => submitData.selectedEnchantments.includes(e._id));
      for ( const _id of submitData.selectedEnchantments ) {
        if ( changes.find(e => e._id === _id) ) continue;
        changes.push({ _id });
      }
    }
    foundry.utils.setProperty(submitData, "configuration.changes", changes);
    return submitData;
  }
}
