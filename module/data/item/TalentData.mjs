import FeatData from "./feat.mjs";
import { AdvancementField } from "../fields.mjs";

export default class TalentData extends FeatData {
  /** @inheritdoc */
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      advancement: new foundry.data.fields.ArrayField(new AdvancementField(), {label: "DND5E.AdvancementTitle"})
    });
  }
}
