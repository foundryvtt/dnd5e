import * as fields from "/common/data/fields.mjs";


/**
 * An embedded data structure for configuring traits an Item can grant to an Actor.
 * @extends DocumentData
 *
 * @property {string[]} grants              List of traits that will always be granted.
 * @property {TraitChoicesData[]} choices   List of trait choices presented to the player.
 * @property {boolean} [allowReplacements]  If granted traits have already been assigned to the actor by something
 *                                          else, should replacements be offered?
 * @property {string[]} value               Traits selected to be assigned to actor.
 */
export class TraitData extends foundry.abstract.DocumentData {
  static defineSchema() {
    return {
      grants: {
        type: [String],
        required: true,
        nullable: false,
        default: []
      },
      choices: {
        type: [TraitChoicesData],
        required: true,
        nullable: false,
        default: []
      },
      allowReplacements: {
        type: Boolean,
        required: false,
        nullable: false
      },
      value: {
        type: [String],
        required: true,
        nullable: false,
        default: []
      }
    };
  }
}


/**
 * An embedded data structure for trait choices. If the `choices` parameters is present, user will be allowed
 * to choose up to `count` number of traits from that list. If no `choices` parameter is defined, user will be
 * allowed to choose up to `count` number of traits from list of all traits of this type.
 *
 * @property {string[]} [choices]  List of trait keys that can be chosen.
 * @property {number} count        Number of traits selectable with this choice.
 */
export class TraitChoicesData extends foundry.abstract.DocumentData {
  static defineSchema() {
    return {
      choices: {
        type: [String],
        required: false,
        nullable: false
      },
      count: fields.field(fields.POSITIVE_INTEGER_FIELD, {
        required: true,
        nullable: false,
        default: 1
      })
    };
  }
}
