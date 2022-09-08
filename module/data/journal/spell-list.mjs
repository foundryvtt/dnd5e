export default class SpellListJournalPageData extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      type: new foundry.data.fields.StringField({initial: "class", choices: CONFIG.DND5E.spellListTypes}),
      identifier: new foundry.data.fields.StringField(),
      description: new foundry.data.fields.SchemaField({
        value: new foundry.data.fields.HTMLField()
      }),
      spells: new foundry.data.fields.SetField(new foundry.data.fields.SchemaField({
        identifier: new foundry.data.fields.StringField(),
        uuid: new foundry.data.fields.StringField()
      }))
    };
  }
}
