import DocumentSheet5e from "../api/document-sheet.mjs";

/**
 * Application for configuring a single unlinked spell in a spell list.
 */
export default class SpellsUnlinkedConfig extends DocumentSheet5e {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["unlinked-spell-config"],
    form: {
      submitOnChange: true
    },
    position: {
      width: 400
    },
    sheetConfig: false,
    unlinkedId: null
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    spell: {
      template: "systems/dnd5e/templates/journal/spell/unlinked-spell.hbs"
    },
    source: {
      template: "systems/dnd5e/templates/journal/spell/unlinked-source.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @inheritDoc */
  get title() {
    return game.i18n.localize("JOURNALENTRYPAGE.DND5E.SpellList.UnlinkedSpells.Configuration");
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = {
      ...await super._prepareContext(options),
      ...this.document.system.unlinkedSpells.find(u => u._id === this.options.unlinkedId),
      fields: this.document.system.schema.fields.unlinkedSpells.element.fields,
      spellLevelOptions: Object.entries(CONFIG.DND5E.spellLevels).map(([value, label]) => ({ value, label })),
      spellSchoolOptions: Object.entries(CONFIG.DND5E.spellSchools).map(([value, { label }]) => ({ value, label }))
    };
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _processFormData(event, form, formData) {
    const submitData = super._processFormData(event, form, formData);
    const unlinkedSpells = this.document.system.toObject().unlinkedSpells;
    const editing = unlinkedSpells.find(s => s._id === this.options.unlinkedId);
    foundry.utils.mergeObject(editing, submitData);
    return { system: { unlinkedSpells: unlinkedSpells } };
  }
}
