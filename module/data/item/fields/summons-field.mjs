import { FormulaField } from "../../fields.mjs";

const {
  ArrayField, BooleanField, DocumentIdField, NumberField, SchemaField, StringField
} = foundry.data.fields;

/**
 * A field for storing summons data.
 *
 * @param {object} [options={}]  Options to configure this field's behavior.
 */
export default class SummonsField extends foundry.data.fields.EmbeddedDataField {
  constructor(options={}) {
    super(SummonsData, foundry.utils.mergeObject({ required: false, nullable: true, initial: null }, options));
  }
}

/**
 * Information for a single summoned creature.
 *
 * @typedef {object} SummonsProfile
 * @property {string} _id    Unique ID for this profile.
 * @property {number} count  Number of creatures to summon.
 * @property {string} name   Display name for this profile if it differs from actor's name.
 * @property {string} uuid   UUID of the actor to summon.
 */

/**
 * Data model for summons configuration.
 *
 * @property {string} ac                  Formula used to calculate the AC on summoned actors.
 * @property {string} hp                  Formula indicating bonus hit points to add to each summoned actor.
 * @property {object} match
 * @property {boolean} match.attacks      Match the to hit values on summoned actor's attack to the summoner.
 * @property {boolean} match.proficiency  Match proficiency on summoned actor to the summoner.
 * @property {boolean} match.saves        Match the save DC on summoned actor's abilities to the summoner.
 * @property {SummonsProfile[]} profiles  Information on creatures that can be summoned.
 * @property {boolean} prompt             Should the player be prompted to place the summons?
 */
export class SummonsData extends foundry.abstract.DataModel {
  /** @inheritdoc */
  static defineSchema() {
    return {
      ac: new FormulaField({label: "DND5E.Summoning.ArmorClass.Label", hint: "DND5E.Summoning.ArmorClass.hint"}),
      hp: new FormulaField({label: "DND5E.Summoning.HitPoints.Label", hint: "DND5E.Summoning.HitPoints.hint"}),
      match: new SchemaField({
        attacks: new BooleanField({
          label: "DND5E.Summoning.Match.Attacks.Label", hint: "DND5E.Summoning.Match.Attacks.Hint"
        }),
        proficiency: new BooleanField({
          label: "DND5E.Summoning.Match.Proficiency.Label", hint: "DND5E.Summoning.Match.Proficiency.Hint"
        }),
        saves: new BooleanField({
          label: "DND5E.Summoning.Match.Saves.Label", hint: "DND5E.Summoning.Match.Saves.Hint"
        })
      }),
      profiles: new ArrayField(new SchemaField({
        _id: new DocumentIdField({initial: () => foundry.utils.randomID()}),
        count: new NumberField({integer: true, min: 1}),
        name: new StringField(),
        uuid: new StringField()
      })),
      prompt: new BooleanField({
        initial: true, label: "DND5E.Summoning.Prompt.Label", hint: "DND5E.Summoning.Prompt.Hint"
      })
    };
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Item to which this summoning information belongs.
   * @type {Item5e}
   */
  get item() {
    return this.parent.parent;
  }

  /* -------------------------------------------- */
  /*  Summoning                                   */
  /* -------------------------------------------- */

  /**
   * Process for summoning actor to the scene.
   * @param {string} profileId  ID of the summoning profile to use.
   */
  async summon(profileId) {
    const profile = this.profiles.find(p => p._id === profileId);
    if ( !profile ) throw new Error(`Cannot find summoning profile ${profileId} on ${this.item.id}.`);

    /**
     * A hook event that fires before summoning is performed.
     * @function dnd5e.preSummon
     * @memberof hookEvents
     * @param {Item5e} item             The item that is performing the summoning.
     * @param {SummonsProfile} profile  Profile used for summoning.
     * @returns {boolean}               Explicitly return `false` to prevent summoning.
     */
    if ( Hooks.call("dnd5e.preSummon", this.item, profile) === false ) return;

    // Fetch the actor that will be summoned
    let actor = await fromUuid(profile.uuid);

    // TODO: Import actor into world if inside compendium

    const tokensData = [];
    const minimized = !this.item.parent?.sheet._minimized;
    await this.item.parent?.sheet.minimize();
    try {
      // Figure out where to place the summons
      const placements = await this.getPlacement(actor.prototypeToken, profile);

      for ( const placement of placements ) {
        // Prepare changes to actor data, re-calculating per-token for potentially random values
        const tokenUpdateData = {
          actor,
          placement,
          tokenUpdates: {},
          actorUpdates: await this.getChanges(actor, profile)
        };

        /**
         * A hook event that fires before a specific token is summoned. After placement has been determined but before
         * the final token data is constructed.
         * @function dnd5e.preSummonToken
         * @memberof hookEvents
         * @param {Item5e} item             The item that is performing the summoning.
         * @param {SummonsProfile} profile  Profile used for summoning.
         * @param {TokenUpdateData} config  Configuration for creating a modified token.
         * @returns {boolean}               Explicitly return `false` to prevent this token from being summoned.
         */
        if ( Hooks.call("dnd5e.preSummonToken", this.item, profile, tokenUpdateData) === false ) continue;

        // Create a token document and apply updates
        const tokenData = await this.getTokenData(tokenUpdateData);

        /**
         * A hook event that fires after token creation data is prepared, but before summoning occurs.
         * @function dnd5e.summonToken
         * @memberof hookEvents
         * @param {Item5e} item             The item that is performing the summoning.
         * @param {SummonsProfile} profile  Profile used for summoning.
         * @param {object} tokenData        Data for creating a token.
         */
        Hooks.callAll("dnd5e.summonToken", this.item, profile, tokenData);

        tokensData.push(tokenData);
      }
    } finally {
      if ( minimized ) this.item.parent?.sheet.maximize();
    }

    const createdTokens = await canvas.scene.createEmbeddedDocuments("Token", tokensData);

    /**
     * A hook event that fires when summoning is complete.
     * @function dnd5e.postSummon
     * @memberof hookEvents
     * @param {Item5e} item             The item that is performing the summoning.
     * @param {SummonsProfile} profile  Profile used for summoning.
     * @param {Token5e[]} tokens        Tokens that have been created.
     */
    Hooks.callAll("dnd5e.postSummon", this.item, profile, createdTokens);
  }

  /* -------------------------------------------- */

  /**
   * Prepare the updates to apply to the summoned actor.
   * @param {Actor5e} actor           Actor that will be modified.
   * @param {SummonsProfile} profile  Summoning profile used to summon the actor.
   * @returns {object}                Changes that will be applied to the actor & its items.
   */
  async getChanges(actor, profile) {
    const updates = { actor: {}, effects: [], items: [] };
    const rollData = this.item.getRollData();
    const prof = rollData.attributes?.prof ?? 0;

    // Match proficiency
    if ( this.match.proficiency ) {
      const proficiencyEffect = new ActiveEffect({
        changes: [{
          key: "system.attributes.prof",
          mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
          value: prof
        }],
        disabled: false,
        icon: "icons/skills/targeting/crosshair-bars-yellow.webp",
        name: game.i18n.localize("DND5E.Summoning.Match.Proficiency.Label")
      });
      updates.effects.push(proficiencyEffect.toObject());
    }

    // Add bonus to AC
    const acBonus = new Roll(this.ac, rollData);
    await acBonus.evaluate();
    if ( acBonus.total ) {
      if ( actor.system.attributes.ac.calc === "flat" ) {
        updates["system.attributes.ac.flat"] = (actor.system.attributes.ac.flat ?? 0) + acBonus.total;
      } else {
        updates.effects.push((new ActiveEffect({
          changes: [{
            key: "system.attributes.ac.bonus",
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
            value: acBonus.total
          }],
          disabled: false,
          icon: "icons/magic/defensive/shield-barrier-blue.webp",
          name: game.i18n.localize("DND5E.Summoning.ArmorClass.Label")
        })).toObject());
      }
    }

    // Add bonus to HP
    const hpBonus = new Roll(this.hp, rollData);
    await hpBonus.evaluate();
    if ( hpBonus.total ) {
      if ( (actor.type === "pc") && !actor._source.system.attributes.hp.max ) {
        updates.effects.push((new ActiveEffect({
          changes: [{
            key: "system.attributes.hp.bonuses.overall",
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
            value: hpBonus.total
          }],
          disabled: false,
          icon: "icons/magic/life/heart-glowing-red.webp",
          name: game.i18n.localize("DND5E.Summoning.HitPoints.Label")
        })).toObject());
      } else {
        updates["system.attributes.hp.max"] = actor.system.attributes.hp.max + hpBonus.total;
      }
      updates["system.attributes.hp.value"] = actor.system.attributes.hp.value + hpBonus.total;
    }

    if ( !this.match.attacks && !this.match.saves ) return updates;

    for ( const item of actor.items ) {
      const itemUpdates = {};

      // Match attacks
      if ( this.match.attacks && item.hasAttack ) {
        const ability = this.item.abilityMod ?? rollData.attributes?.spellcasting;
        const typeMapping = { mwak: "msak", rwak: "rsak" };
        const parts = [
          rollData.abilities?.[ability]?.mod,
          prof,
          rollData.bonuses?.[typeMapping[item.system.actionType] ?? item.system.actionType]?.attack
        ].filter(p => p);
        itemUpdates["system.attack.bonus"] = parts.join(" + ");
        itemUpdates["system.attack.flat"] = true;
      }

      // Match saves
      if ( this.match.saves && item.hasSave ) {
        itemUpdates["system.save.dc"] = rollData.item.save.dc ?? rollData.attributes.spelldc;
        itemUpdates["system.save.scaling"] = "flat";
      }

      if ( !foundry.utils.isEmpty(itemUpdates) ) {
        itemUpdates._id = item.id;
        updates.items.push(itemUpdates);
      }
    }

    return updates;
  }

  /* -------------------------------------------- */

  /**
   * Data for token placement on the scene.
   *
   * @typedef {object} PlacementData
   * @property {number} x
   * @property {number} y
   * @property {number} rotation
   */

  /**
   * Determine where the summons should be placed on the scene.
   * @param {TokenDocument5e} token   Token to be placed.
   * @param {SummonsProfile} profile  Profile used for summoning.
   * @returns {PlacementData[]}
   */
  async getPlacement(token, profile) {
    // TODO: Query use for placement
    return [{x: 1000, y: 1000, rotation: 0}];
  }

  /* -------------------------------------------- */

  /**
   * Configuration for creating a modified token.
   *
   * @typedef {object} TokenUpdateData
   * @property {Actor5e} actor            Original actor from which the token will be created.
   * @property {PlacementData} placement  Information on the location to summon the token.
   * @property {object} tokenUpdates      Additional updates that will be applied to token data.
   * @property {object} actorUpdates      Updates that will be applied to actor delta.
   */

  /**
   * Create token data ready to be summoned.
   * @param {config} TokenUpdateData  Configuration for creating a modified token.
   * @returns {object}
   */
  async getTokenData({ actor, placement, tokenUpdates, actorUpdates }) {
    const tokenDocument = await actor.getTokenDocument(foundry.utils.mergeObject(placement, tokenUpdates));
    tokenDocument.delta.updateSource(actorUpdates);
    return tokenDocument.toObject();
  }
}
