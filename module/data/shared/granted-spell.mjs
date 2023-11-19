import ActionTemplate from "../item/templates/action.mjs";
import ActivatedEffectTemplate from "../item/templates/activated-effect.mjs";

/**
 * A template for granted spells from equippable items.
 */
export default class GrantedSpellData extends foundry.abstract.DataModel {
  /** @inheritdoc */
  static defineSchema() {
    const fields = foundry.data.fields;
    const {attackBonus, save} = ActionTemplate.defineSchema();
    const {uses, consume} = ActivatedEffectTemplate.defineSchema();
    return {
      uuid: new fields.StringField({required: true}),
      changes: new fields.SchemaField({
        attackBonus,
        save,
        uses,
        consume
      })
    };
  }

  /* -------------------------------------------- */

  /**
   * Create the item data for the spell to be created.
   * @returns {Promise<object|null>}      Spell data.
   */
  async _createSpellData() {
    const item = await fromUuid(this.uuid || "");
    if ( !item || (item.type !== "spell") ) return null;
    const data = item.toObject();
    const itemId = this.parent.parent.id;

    const updates = {
      "system.ability": "none",
      "system.attackBonus": this.changes.attackBonus ? `${this.changes.attackBonus} - @prof` : "- @prof",
      "system.preparation.mode": "atwill",
      "system.-=material": null,
      "system.components.material": false,
      "flags.dnd5e.parentId": itemId,
      "flags.core.sourceId": this.uuid
    };
    if ( item.hasSave && this.changes.save.dc > 0 ) {
      updates["system.save.dc"] = this.changes.save.dc;
      updates["system.save.scaling"] = "flat";
    }
    if ( this.changes.uses.max && this.changes.uses.per ) {
      updates["system.uses.value"] = this.changes.uses.max;
      updates["system.uses.max"] = this.changes.uses.max;
      updates["system.uses.per"] = this.changes.uses.per;
    }
    if ( this.parent.hasLimitedUses && (this.changes.consume.amount > 0) ) {
      updates["system.consume.amount"] = this.changes.consume.amount;
      updates["system.consume.target"] = itemId;
      updates["system.consume.type"] = "charges";
      updates["system.consume.scale"] = this.changes.consume.scale;
    }
    return foundry.utils.mergeObject(data, updates, {performDeletions: true});
  }
}
