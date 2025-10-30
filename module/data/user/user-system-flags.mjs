import MappingField from "../fields/mapping-field.mjs";

const { BooleanField, ForeignDocumentField, NumberField, SchemaField, SetField, StringField } = foundry.data.fields;

/**
 * @import { UserSystemFlagsData } from "./_types.mjs";
 */

/**
 * A custom model to validate system flags on User Documents.
 * @extends {foundry.abstract.DataModel<UserSystemFlagsData>}
 * @mixes UserSystemFlagsData
 */
export default class UserSystemFlags extends foundry.abstract.DataModel {
  /** @override */
  static defineSchema() {
    return {
      awardDestinations: new SetField(
        new ForeignDocumentField(foundry.documents.BaseActor, { idOnly: true }), { required: false }
      ),
      creation: new SchemaField({
        scrollExplanation: new StringField({initial: "reference"})
      }),
      sheetPrefs: new MappingField(new SchemaField({
        width: new NumberField({ integer: true, positive: true }),
        height: new NumberField({ integer: true, positive: true }),
        tabs: new MappingField(new SchemaField({
          collapseSidebar: new BooleanField({ required: false }),
          group: new StringField({ required: false }),
          sort: new StringField({ required: false, initial: "m", choices: [...foundry.documents.BaseFolder.SORTING_MODES, "p"] })
        }))
      }))
    };
  }
}
