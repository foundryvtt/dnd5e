import BaseConfigSheet from "./base-config.mjs";

/**
 * An application class which provides advanced configuration for special character flags which modify an Actor.
 */
export default class ActorSheetFlags extends BaseConfigSheet {

  /** @inheritDoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "actor-flags",
      classes: ["dragonstar-dnd5e"],
      template: "systems/dnd5e/templates/apps/actor-flags.hbs",
      width: 500,
      closeOnSubmit: true
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  get title() {
    return `${game.i18n.localize("DND5E.FlagsTitle")}: ${this.object.name}`;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  getData() {
    const data = {};
    data.actor = this.object;
    data.classes = this._getClasses();
    data.flags = this._getFlags();
    data.bonuses = this._getBonuses();
    return data;
  }

  /* -------------------------------------------- */

  /**
   * Prepare an object of sorted classes.
   * @returns {object}
   * @private
   */
  _getClasses() {
    const classes = this.object.items.filter(i => i.type === "class");
    return classes.sort((a, b) => a.name.localeCompare(b.name)).reduce((obj, i) => {
      obj[i.id] = i.name;
      return obj;
    }, {});
  }

  /* -------------------------------------------- */

  /**
   * Prepare an object of flags data which groups flags by section
   * Add some additional data for rendering
   * @returns {object}
   * @private
   */
  _getFlags() {
    const flags = {};
    const baseData = this.document.toJSON();
    for ( let [k, v] of Object.entries(CONFIG.DND5E.characterFlags) ) {
      if ( !flags.hasOwnProperty(v.section) ) flags[v.section] = {};
      let flag = foundry.utils.deepClone(v);
      flag.type = v.type.name;
      flag.isCheckbox = v.type === Boolean;
      flag.isSelect = v.hasOwnProperty("choices");
      flag.value = foundry.utils.getProperty(baseData.flags, `dnd5e.${k}`);
      flags[v.section][`flags.dnd5e.${k}`] = flag;
    }
    return flags;
  }

  /* -------------------------------------------- */

  /**
   * Get the bonuses fields and their localization strings
   * @returns {Array<object>}
   * @private
   */
  _getBonuses() {
    const src = this.object.toObject();
    const bonuses = [
      {name: "system.bonuses.mwak.attack", label: "DND5E.BonusMWAttack"},
      {name: "system.bonuses.mwak.damage", label: "DND5E.BonusMWDamage"},
      {name: "system.bonuses.rwak.attack", label: "DND5E.BonusRWAttack"},
      {name: "system.bonuses.rwak.damage", label: "DND5E.BonusRWDamage"},
      {name: "system.bonuses.msak.attack", label: "DND5E.BonusMSAttack"},
      {name: "system.bonuses.msak.damage", label: "DND5E.BonusMSDamage"},
      {name: "system.bonuses.rsak.attack", label: "DND5E.BonusRSAttack"},
      {name: "system.bonuses.rsak.damage", label: "DND5E.BonusRSDamage"},
      {name: "system.bonuses.abilities.check", label: "DND5E.BonusAbilityCheck"},
      {name: "system.bonuses.abilities.save", label: "DND5E.BonusAbilitySave"},
      {name: "system.bonuses.abilities.skill", label: "DND5E.BonusAbilitySkill"},
      {name: "system.bonuses.spell.dc", label: "DND5E.BonusSpellDC"}
    ];
    for ( let b of bonuses ) {
      b.value = foundry.utils.getProperty(src, b.name) || "";
    }
    return bonuses;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _updateObject(event, formData) {
    const actor = this.object;
    let updateData = foundry.utils.expandObject(formData);
    const src = actor.toObject();

    // Unset any flags which are "false"
    const flags = updateData.flags.dnd5e;
    for ( let [k, v] of Object.entries(flags) ) {
      if ( [undefined, null, "", false, 0].includes(v) ) {
        delete flags[k];
        if ( foundry.utils.hasProperty(src.flags, `dnd5e.${k}`) ) flags[`-=${k}`] = null;
      }
    }

    // Clear any bonuses which are whitespace only
    for ( let b of Object.values(updateData.system.bonuses ) ) {
      for ( let [k, v] of Object.entries(b) ) {
        b[k] = v.trim();
      }
    }

    // Diff the data against any applied overrides and apply
    await actor.update(updateData, {diff: false});
  }
}
