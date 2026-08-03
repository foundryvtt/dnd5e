import { defaultUnits, formatLength, formatNumber, formatWeight } from "../../utils.mjs";
import ActivationField from "./activation-field.mjs";
import DurationField from "./duration-field.mjs";
import RangeField from "./range-field.mjs";
import TargetField from "./target-field.mjs";

const { BooleanField, NumberField, StringField, TypedSchemaField } = foundry.data.fields;

/**
 * @import { UsageData } from "./_types.mjs";
 */

/**
 * Field for storing some salient property of an item.
 */
export default class PropertyField extends TypedSchemaField {
  constructor(options={}, context={}) {
    super({
      ability: { ability: new StringField() },
      ac: { value: new NumberField({ integer: true }) },
      activation: {},
      attunement: { attuned: new BooleanField(), attunement: new StringField() },
      charges: { max: new NumberField(), value: new NumberField() },
      components: { materials: new StringField() },
      duration: {},
      label: { label: new StringField() },
      level: { level: new NumberField({ integer: true }) },
      mastery: { mastery: new StringField() },
      price: { denomination: new StringField(), value: new NumberField() },
      proficiency: { proficiency: new NumberField({ integer: true }) },
      property: { property: new StringField() },
      range: {},
      reach: {},
      target: {},
      text: { text: new StringField() },
      weight: {
        units: new StringField({ blank: false, initial: () => defaultUnits("weight"), required: true }),
        value: new NumberField()
      }
    }, options, context);
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /**
   * Build the display labels for a list of property descriptors.
   * @param {object[]} props     Descriptors to render.
   * @param {UsageData} [usage]  Usage data the empty descriptors read.
   * @returns {string[]}
   */
  static getLabels(props, { activation, duration, properties, range, target }={}) {
    return props.map(p => {
      switch ( p.type ) {
        case "ability": return CONFIG.DND5E.abilities[p.ability]?.label;
        case "ac": return `${p.value} ${_loc("DND5E.AC")}`;
        case "activation": return ActivationField.getLabels({ activation, properties }).simple;
        case "attunement": return p.attuned
          ? _loc("DND5E.AttunementAttuned")
          : CONFIG.DND5E.attunementTypes[p.attunement];
        case "charges": return `${p.value}/${p.max} ${_loc("DND5E.Charges")}`;
        case "components": {
          const components = game.i18n.getListFormatter({ style: "narrow" }).format(
            Array.from(properties ?? []).reduce((arr, p) => {
              const { abbreviation, isTag } = CONFIG.DND5E.itemProperties[p] ?? {};
              if ( abbreviation && !isTag ) arr.push(abbreviation);
              return arr;
            }, [])
          );
          return p.materials ? `${components} (${p.materials})` : components;
        }
        case "duration": return DurationField.getLabels({ duration, properties }).simple;
        case "label": return _loc(p.label);
        case "level": return CONFIG.DND5E.spellLevels[p.level];
        case "mastery": return CONFIG.DND5E.weaponMasteries[p.mastery]?.label;
        case "price": return (p.value && (p.denomination in CONFIG.DND5E.currencies))
          ? `${p.value} ${CONFIG.DND5E.currencies[p.denomination].label}`
          : null;
        case "proficiency": return CONFIG.DND5E.proficiencyLevels[p.proficiency];
        case "property": return CONFIG.DND5E.itemProperties[p.property]?.label;
        case "range": return (range.long && (range.long !== range.value))
          ? `${formatNumber(range.value)}/${formatLength(range.long, range.units)}`
          : RangeField.getLabels({ range }).simple;
        case "reach": return _loc("DND5E.RANGE.Formatted.Reach", { reach: formatLength(range.reach, range.units) });
        case "target": {
          const labels = TargetField.getLabels({ target });
          return labels.template.statblock || labels.affects.sheet;
        }
        case "text": return p.text;
        case "weight": return formatWeight(p.value, p.units);
        default: return null;
      }
    }).filter(_ => _);
  }

  /* -------------------------------------------- */

  /**
   * Build the descriptors for the properties that describe how an item or activity is used.
   * @param {UsageData} [usage]  Usage data to describe.
   * @returns {object[]}
   */
  static getUsageProperties({ activation, duration, range, target }={}) {
    const properties = [];
    if ( !activation?.type ) return properties;
    properties.push({ type: "activation" });
    if ( duration?.units ) properties.push({ type: "duration" });
    if ( range?.units ) properties.push({ type: "range" });
    if ( range?.reach ) properties.push({ type: "reach" });
    if ( target?.template.type || target?.affects.type ) properties.push({ type: "target" });
    return properties;
  }
}
