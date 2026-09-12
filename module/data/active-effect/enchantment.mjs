import Item5e from "../../documents/item.mjs";
import { bulkFromUuid, getHumanReadableAttributeLabel } from "../../utils.mjs";
import ActiveEffectDataModel from "../abstract/active-effect-data-model.mjs";
import { DamageData } from "../shared/damage-field.mjs";

const { BooleanField, DocumentIdField, DocumentUUIDField, SchemaField, SetField } = foundry.data.fields;

/**
 * @import { EnchantmentActiveEffectSystemData } from "./_types.mjs";
 */

/**
 * System data model for enchantment active effects.
 * @extends {ActiveEffectDataModel<EnchantmentActiveEffectSystemData>}
 * @mixes EnchantmentActiveEffectSystemData
 */
export default class EnchantmentData extends ActiveEffectDataModel {
  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = ["DND5E.EFFECT.BASE", "DND5E.ENCHANTMENT"];

  /* -------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      magical: new BooleanField({ initial: true }),
      rider: new SchemaField({
        activities: new SetField(new DocumentIdField()),
        effects: new SetField(new DocumentUUIDField({ type: "ActiveEffect" })),
        items: new SetField(new DocumentUUIDField({ type: "Item" }))
      })
    };
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @override */
  get applicableType() {
    return this.isApplied ? "Item" : "";
  }

  /* -------------------------------------------- */

  /**
   * Should this enchantment apply to its parent item?
   * @type {boolean}
   */
  get isApplied() {
    return this.parent.transfer && !!this.item;
  }

  /* -------------------------------------------- */

  /**
   * Item containing this enchantment.
   * @type {Item5e|void}
   */
  get item() {
    return this.parent.item;
  }

  /* -------------------------------------------- */

  /** @override */
  get trackRiders() {
    return !this.isApplied && (!!this.rider?.activities?.size || !!this.rider?.effects?.size);
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareDerivedData() {
    super.prepareDerivedData();
    if ( this.isApplied && this.parent.uuid && this.parent.origin ) {
      dnd5e.registry.enchantments.track(this.parent.origin, this.parent.uuid);
    }
  }

  /* -------------------------------------------- */
  /*  Effect Application                          */
  /* -------------------------------------------- */

  /**
   * Handle enchantment-specific changes to the item.
   * @param {Item5e} item                The Item to whom this effect should be applied.
   * @param {EffectChangeData} change    The change data being applied.
   * @param {Record<string, *>} changes  The aggregate update paths and their updated values.
   * @returns {boolean|void}             Return false to prevent normal application from occurring.
   */
  _applyLegacy(item, change, changes) {
    const applyField = (model, c) => ActiveEffect.implementation.applyChangeField(model, c);
    let key = change.key.replace("system.", "");
    switch ( change.key ) {
      case "system.ability":
        for ( const activity of item.system.activities?.getByTypes("attack") ?? [] ) {
          changes[`system.activities.${activity.id}.attack.abilities`] = applyField(
            activity, { ...change, key: "attack.abilities" }
          );
        }
        return false;
      case "system.attack.bonus":
      case "system.attack.flat":
        for ( const activity of item.system.activities?.getByTypes("attack") ?? [] ) {
          changes[`system.activities.${activity.id}.${key}`] = applyField(
            activity, { ...change, key }
          );
        }
        return false;
      case "system.damageBonus":
        change.key = "system.damage.bonus";
        break;
      case "system.damage.parts":
        try {
          let damage;
          const parsed = typeof change.value === "string" ? JSON.parse(change.value) : change.value;
          if ( foundry.utils.getType(parsed) === "Object" ) damage = new DamageData(parsed);
          else damage = new DamageData({ custom: { enabled: true, formula: parsed[0][0] }, types: [parsed[0][1]] });
          for ( const activity of item.system.activities?.getByTypes("attack", "damage", "save") ?? [] ) {
            const value = damage.clone();
            value.enchantment = true;
            value.locked = true;
            changes[`system.activities.${activity.id}.damage.parts`] = applyField(
              activity, { ...change, key, value }
            );
          }
          for ( const activity of item.system.activities?.getByTypes("heal") ?? [] ) {
            const value = damage.formula;
            const keyPath = `healing.${activity.healing.custom.enabled ? "custom.formula" : "bonus"}`;
            changes[`system.activities.${activity.id}.${keyPath}`] = applyField(
              activity, { ...change, key: keyPath, value }
            );
          }
        } catch {}
        return false;
      case "system.damage.types":
        const adjust = (damage, keyPath) =>
          applyField(damage, { ...change, key: "types", value: change.value });
        if ( item.system.damage?.base ) {
          changes["system.damage.base.types"] = adjust(item.system.damage.base, "system.damage.base");
        }
        for ( const activity of item.system.activities?.getByTypes("attack", "damage", "save") ?? [] ) {
          for ( const part of activity.damage.parts ) adjust(part);
          changes[`system.activities.${activity.id}.damage.parts`] = activity.damage.parts;
        }
        return false;
      case "system.save.dc":
      case "system.save.scaling":
        let value = change.value;
        if ( key === "save.dc" ) key = "save.dc.formula";
        else {
          key = "save.dc.calculation";
          if ( value === "flat" ) value = "";
          else if ( (value === "") && (item.type === "spell") ) value = "spellcasting";
        }
        for ( const activity of item.system.activities?.getByTypes("save") ?? [] ) {
          changes[`system.activities.${activity.id}.${key}`] = applyField(
            activity, { ...change, key, value }
          );
        }
        return false;
    }
  }

  /* -------------------------------------------- */
  /*  Event Listeners & Handlers                  */
  /* -------------------------------------------- */

  /** @override */
  onRenderActiveEffectConfig(app, html, context) {
    const toRemove = html.querySelectorAll('.form-group:has([name="statuses"], [name="showIcon"])');
    toRemove.forEach(f => f.remove());
    const transferFormGroup = html.querySelector('.form-group:has([name="transfer"])');
    if ( transferFormGroup ) {
      const transferLabel = transferFormGroup.querySelector("label");
      const transferHint = transferFormGroup.querySelector(".hint");
      if ( transferLabel ) transferLabel.innerText = _loc("DND5E.ENCHANTMENT.Transfer.Label");
      if ( transferHint ) transferHint.innerText = _loc("DND5E.ENCHANTMENT.Transfer.Hint");
      if ( this.isOnActivity ) {
        const transferCheckbox = transferFormGroup.querySelector('dnd5e-checkbox[name="transfer"]');
        if ( transferCheckbox ) {
          if ( app.isEditable ) transferCheckbox.dataset.tooltip = "DND5E.ENCHANTMENT.Transfer.DisabledTooltip";
          transferCheckbox.disabled = true;
          transferCheckbox.checked = false;
        }
      }
    }
  }

  /* -------------------------------------------- */
  /*  Socket Event Handlers                       */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preCreate(data, options, user) {
    if ( (await super._preCreate(data, options, user)) === false ) return false;

    // Enchantments cannot be added directly to actors
    if ( this.parent.parent instanceof Actor ) {
      ui.notifications.error("DND5E.ENCHANTMENT.Warning.NotOnActor", { localize: true });
      return false;
    }

    if ( this.isApplied ) {
      const origin = await fromUuid(this.parent.origin);
      const errors = origin?.canEnchant?.(this.item);
      if ( errors?.length ) {
        errors.forEach(err => console.error(err));
        return false;
      }
      const start = this.parent.constructor.getEffectStart();
      for ( const key of Object.keys(start) ) {
        if ( data.start?.[key] !== undefined ) delete start[key]; // Prefer user-defined duration data
      }
      this.parent.updateSource({ start, disabled: false });
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onCreate(data, options, userId) {
    super._onCreate(data, options, userId);
    if ( options.chatMessageOrigin ) {
      document.body.querySelectorAll(`[data-message-id="${options.chatMessageOrigin}"] enchantment-application`)
        .forEach(element => element.buildItemList());
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onDelete(options, userId) {
    super._onDelete(options, userId);
    if ( this.isApplied ) dnd5e.registry.enchantments.untrack(this.parent.origin, this.parent.uuid);
    document.body.querySelectorAll(`enchantment-application:has([data-enchantment-uuid="${this.parent.uuid}"]`)
      .forEach(element => element.buildItemList());
  }

  /* -------------------------------------------- */
  /*  Importing and Exporting                     */
  /* -------------------------------------------- */

  /**
   * Can an active effect of this type be added to the provided document?
   * @param {Actor5e|Item5e} [doc]  Candidate document to which the active effect might be added.
   * @returns {boolean}             Should this active effect be available?
   */
  static availableForItem(doc) {
    return !doc || (doc instanceof Item);
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /** @override */
  async collectRiders(options={}) {
    const operations = [];
    let item;
    let profile;
    const { chatMessageOrigin } = options;
    const { enchantmentProfile, activityId } = options.dnd5e ?? {};

    if ( chatMessageOrigin ) {
      const message = game.messages.get(chatMessageOrigin);
      item = message?.getAssociatedItem();
      const activity = message?.getAssociatedActivity();
      profile = activity?.effects.find(e => e._id === message?.getFlag("dnd5e", "use.enchantmentProfile"));
    } else if ( enchantmentProfile && activityId ) {
      let activity;
      const origin = await fromUuid(this.parent.origin);
      if ( origin instanceof dnd5e.documents.activity.EnchantActivity ) {
        activity = origin;
        item = activity.item;
      } else if ( origin instanceof Item ) {
        item = origin;
        activity = item.system.activities?.get(activityId);
      }
      profile = activity?.effects.find(e => e._id === enchantmentProfile);
    } else {
      item = (await fromUuid(this.parent._stats.compendiumSource))?.item;
    }

    const documents = await bulkFromUuid([...this.rider.effects, ...this.rider.items, ...(profile?.riders.item ?? [])]);

    // Create Activities
    const riderActivities = {};
    let riderEffects = [];
    for ( const id of [...this.rider.activities, ...(profile?.riders.activity ?? [])] ) {
      const activity = item?.system.activities.get(id);
      if ( !activity ) continue;
      const activityData = activity.toObject();
      activityData._id = foundry.utils.randomID();
      foundry.utils.setProperty(activityData, "flags.dnd5e.dependentOn", this.parent.id);
      riderActivities[activityData._id] = activityData;
      riderEffects.push(...(activity.effects
        ?.map(e => e.uuid ? null : activity.item.effects.get(e._id)?.toObject())
        .filter(e => e && !this.item.effects.has(e._id)) ?? []));
    }
    if ( !foundry.utils.isEmpty(riderActivities) ) operations.push({
      action: "update", documentName: "Item", parent: this.item.actor,
      updates: [{ _id: this.item.id, "system.activities": riderActivities }]
    });

    // Create Effects
    const effectIds = [...this.rider.effects, ...(profile?.riders.effect ?? [])];
    riderEffects.push(...effectIds.map(id => {
      const effectData = (documents.get(id) ?? item?.effects.get(id))?.toObject();
      if ( effectData ) {
        delete effectData._id;
        delete effectData.flags?.dnd5e?.rider;
        foundry.utils.setProperty(effectData, "system.origin", { ...this.origin });
      }
      return effectData;
    }));
    riderEffects = riderEffects.filter(_ => _);
    riderEffects.forEach(e => foundry.utils.setProperty(e, "flags.dnd5e.dependentOn", this.parent.id));
    operations.push({
      action: "create", documentName: "ActiveEffect", data: riderEffects, parent: this.item, keepId: true
    });

    // Create Items
    if ( this.item.isEmbedded ) {
      const riderItems = await Item5e.createWithContents(
        itemUuids.map(uuid => documents.get(uuid)).filter(_ => _), {
          transformAll: item => {
            const itemData = item.clone({}, { keepId: true }).toObject();
            foundry.utils.setProperty(itemData, "flags.dnd5e.dependentOn", this.parent.uuid);
            foundry.utils.setProperty(itemData, "flags.dnd5e.enchantment.origin", this.parent.uuid);
            return itemData;
          }
        }
      );
      operations.push({
        action: "create", documentName: "Item", data: riderItems, parent: this.item.actor, keepId: true
      });
    }

    return operations;
  }

  /* -------------------------------------------- */

  /** @override */
  async getSheetChangeContext(change) {
    return {
      name: getHumanReadableAttributeLabel(change.key, {
        item: this.isApplied ? this.item : true, prefixItemName: false
      })
    };
  }

  /* -------------------------------------------- */

  /** @override */
  async getSheetData(context) {
    if ( this.isApplied ) return;

    context.additionalChangesFields.unshift({
      field: context.systemFields.rider.fields.effects,
      value: context.source.system.rider.effects
    }, {
      field: context.systemFields.rider.fields.items,
      value: context.source.system.rider.items
    });

    if ( this.item?.system.activities ) context.additionalChangesFields.unshift({
      field: context.systemFields.rider.fields.activities,
      options: this.item.system.activities.map(a => ({ value: a.id, label: a.name })),
      value: context.source.system.rider.activities
    });
  }
}
