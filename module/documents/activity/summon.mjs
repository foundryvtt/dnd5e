import SummonSheet from "../../applications/activity/summon-sheet.mjs";
import SummonUsageDialog from "../../applications/activity/summon-usage-dialog.mjs";
import CompendiumBrowser from "../../applications/compendium-browser.mjs";
import TokenPlacement from "../../canvas/token-placement.mjs";
import SummonActivityData from "../../data/activity/summon-data.mjs";
import { simplifyBonus, staticID } from "../../utils.mjs";
import ActivityMixin from "./mixin.mjs";

/**
 * Activity for summoning creatures.
 */
export default class SummonActivity extends ActivityMixin(SummonActivityData) {
  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "DND5E.SUMMON"];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(
    foundry.utils.mergeObject(super.metadata, {
      type: "summon",
      img: "systems/dnd5e/icons/svg/activity/summon.svg",
      title: "DND5E.SUMMON.Title",
      sheetClass: SummonSheet,
      usage: {
        actions: {
          placeSummons: SummonActivity.#placeSummons
        },
        dialog: SummonUsageDialog
      }
    }, { inplace: false })
  );

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Does the user have permissions to summon?
   * @type {boolean}
   */
  get canSummon() {
    return game.user.can("TOKEN_CREATE") && (game.user.isGM || game.settings.get("dnd5e", "allowSummoning"));
  }

  /* -------------------------------------------- */
  /*  Activation                                  */
  /* -------------------------------------------- */

  /**
   * @typedef {ActivityUseConfiguration} SummonUseConfiguration
   * @property {object|false} create
   * @property {string} create.summons                    Should a summoned creature be created?
   * @property {Partial<SummoningConfiguration>} summons  Options for configuring summoning behavior.
   */

  /**
   * Configuration data for summoning behavior.
   *
   * @typedef {object} SummoningConfiguration
   * @property {string} profile         ID of the summoning profile to use.
   * @property {string} [creatureSize]  Selected creature size if multiple are available.
   * @property {string} [creatureType]  Selected creature type if multiple are available.
   */

  /**
   * @typedef {ActivityUsageResults} SummonUsageResults
   * @property {Token5e[]} summoned  Summoned tokens.
   */

  /** @inheritDoc */
  _prepareUsageConfig(config) {
    config = super._prepareUsageConfig(config);
    const summons = this.availableProfiles;
    if ( config.create !== false ) {
      config.create ??= {};
      config.create.summons ??= this.canSummon && canvas.scene && summons.length && this.summon.prompt;
    }
    config.summons ??= {};
    config.summons.profile ??= summons[0]?._id ?? null;
    config.summons.creatureSize ??= this.creatureSizes.first() ?? null;
    config.summons.creatureType ??= this.creatureTypes.first() ?? null;
    return config;
  }

  /* -------------------------------------------- */

  /** @override */
  _usageChatButtons(message) {
    if ( !this.availableProfiles.length ) return super._usageChatButtons(message);
    return [{
      label: game.i18n.localize("DND5E.SUMMON.Action.Summon"),
      icon: '<i class="fa-solid fa-spaghetti-monster-flying" inert></i>',
      dataset: {
        action: "placeSummons"
      }
    }].concat(super._usageChatButtons(message));
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  shouldHideChatButton(button, message) {
    if ( button.dataset.action === "placeSummons" ) return !this.canSummon;
    return super.shouldHideChatButton(button, message);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _finalizeUsage(config, results) {
    await super._finalizeUsage(config, results);
    if ( config.create?.summons ) {
      try {
        results.summoned = await this.placeSummons(config.summons);
      } catch(err) {
        results.summoned = [];
        Hooks.onError("SummonActivity#use", err, { log: "error", notify: "error" });
      }
    }
  }

  /* -------------------------------------------- */
  /*  Summoning                                   */
  /* -------------------------------------------- */

  /**
   * Process for summoning actor to the scene.
   * @param {SummoningConfiguration} options  Configuration data for summoning behavior.
   * @returns {Token5e[]|void}
   */
  async placeSummons(options) {
    if ( !this.canSummon || !canvas.scene ) return;

    const profile = this.profiles.find(p => p._id === options?.profile);
    if ( !profile ) throw new Error(
      game.i18n.format("DND5E.SUMMON.Warning.NoProfile", { profileId: options.profile, item: this.item.name })
    );

    /**
     * A hook event that fires before summoning is performed.
     * @function dnd5e.preSummon
     * @memberof hookEvents
     * @param {SummonActivity} activity         The activity that is performing the summoning.
     * @param {SummonsProfile} profile          Profile used for summoning.
     * @param {SummoningConfiguration} options  Additional summoning options.
     * @returns {boolean}                       Explicitly return `false` to prevent summoning.
     */
    if ( Hooks.call("dnd5e.preSummon", this, profile, options) === false ) return;

    // Fetch the actor that will be summoned
    const summonUuid = this.summon.mode === "cr" ? await this.queryActor(profile) : profile.uuid;
    if ( !summonUuid ) return;
    const actor = await dnd5e.documents.Actor5e.fetchExisting(summonUuid, {
      origin: { key: "flags.dnd5e.summon.origin", value: this.item?.uuid }
    });

    // Verify ownership of actor
    if ( !actor.isOwner ) {
      throw new Error(game.i18n.format("DND5E.SUMMON.Warning.NoOwnership", { actor: actor.name }));
    }

    const tokensData = [];
    const minimized = !this.actor?.sheet._minimized;
    await this.actor?.sheet.minimize();
    try {
      // Figure out where to place the summons
      const placements = await this.getPlacement(actor.prototypeToken, profile, options);

      for ( const placement of placements ) {
        // Prepare changes to actor data, re-calculating per-token for potentially random values
        const tokenUpdateData = {
          actor,
          placement,
          ...(await this.getChanges(actor, profile, options))
        };

        /**
         * A hook event that fires before a specific token is summoned. After placement has been determined but before
         * the final token data is constructed.
         * @function dnd5e.preSummonToken
         * @memberof hookEvents
         * @param {SummonActivity} activity         The activity that is performing the summoning.
         * @param {SummonsProfile} profile          Profile used for summoning.
         * @param {TokenUpdateData} config          Configuration for creating a modified token.
         * @param {SummoningConfiguration} options  Additional summoning options.
         * @returns {boolean}                       Explicitly return `false` to prevent this token from being summoned.
         */
        if ( Hooks.call("dnd5e.preSummonToken", this, profile, tokenUpdateData, options) === false ) continue;

        // Create a token document and apply updates
        const tokenData = await this.getTokenData(tokenUpdateData);

        /**
         * A hook event that fires after token creation data is prepared, but before summoning occurs.
         * @function dnd5e.summonToken
         * @memberof hookEvents
         * @param {SummonActivity} activity         The activity that is performing the summoning.
         * @param {SummonsProfile} profile          Profile used for summoning.
         * @param {object} tokenData                Data for creating a token.
         * @param {SummoningConfiguration} options  Additional summoning options.
         */
        Hooks.callAll("dnd5e.summonToken", this, profile, tokenData, options);

        tokensData.push(tokenData);
      }
    } finally {
      if ( minimized ) this.actor?.sheet.maximize();
    }

    const createdTokens = await canvas.scene.createEmbeddedDocuments("Token", tokensData);

    /**
     * A hook event that fires when summoning is complete.
     * @function dnd5e.postSummon
     * @memberof hookEvents
     * @param {SummonActivity} activity         The activity that is performing the summoning.
     * @param {SummonsProfile} profile          Profile used for summoning.
     * @param {Token5e[]} tokens                Tokens that have been created.
     * @param {SummoningConfiguration} options  Additional summoning options.
     */
    Hooks.callAll("dnd5e.postSummon", this, profile, createdTokens, options);

    return createdTokens;
  }

  /* -------------------------------------------- */

  /**
   * Request a specific actor to summon from the player.
   * @param {SummonsProfile} profile  Profile used for summoning.
   * @returns {Promise<string|null>}  UUID of the concrete actor to summon or `null` if canceled.
   */
  async queryActor(profile) {
    const locked = {
      documentClass: "Actor",
      types: new Set(["npc"]),
      additional: {
        cr: { max: simplifyBonus(profile.cr, this.getRollData({ deterministic: true })) }
      }
    };
    if ( profile.types.size ) locked.additional.type = Array.from(profile.types).reduce((obj, type) => {
      obj[type] = 1;
      return obj;
    }, {});
    return CompendiumBrowser.selectOne({ filters: { locked } });
  }

  /* -------------------------------------------- */

  /**
   * Prepare the updates to apply to the summoned actor and its token.
   * @param {Actor5e} actor                   Actor that will be modified.
   * @param {SummonsProfile} profile          Summoning profile used to summon the actor.
   * @param {SummoningConfiguration} options  Configuration data for summoning behavior.
   * @returns {Promise<{actorChanges: object, tokenChanges: object}>}  Changes that will be applied to the actor,
   *                                                                   its items, and its token.
   */
  async getChanges(actor, profile, options) {
    const actorUpdates = { effects: [], items: [] };
    const tokenUpdates = {};
    const rollData = { ...this.getRollData(), summon: actor.getRollData() };
    const prof = rollData.attributes?.prof ?? 0;

    // Add flags
    actorUpdates["flags.dnd5e.summon"] = {
      level: this.relevantLevel,
      mod: rollData.mod,
      origin: this.item.uuid,
      activity: this.id,
      profile: profile._id
    };

    // Match proficiency
    if ( this.match.proficiency ) {
      const proficiencyEffect = new ActiveEffect({
        _id: staticID("dnd5eMatchProficiency"),
        changes: [{
          key: "system.attributes.prof",
          mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
          value: prof
        }],
        disabled: false,
        icon: "icons/skills/targeting/crosshair-bars-yellow.webp",
        name: game.i18n.localize("DND5E.SUMMON.FIELDS.match.proficiency.label")
      });
      actorUpdates.effects.push(proficiencyEffect.toObject());
    }

    // Add bonus to AC
    if ( this.bonuses.ac ) {
      const acBonus = new Roll(this.bonuses.ac, rollData);
      await acBonus.evaluate();
      if ( acBonus.total ) {
        if ( actor.system.attributes.ac.calc === "flat" ) {
          actorUpdates["system.attributes.ac.flat"] = (actor.system.attributes.ac.flat ?? 0) + acBonus.total;
        } else {
          actorUpdates.effects.push((new ActiveEffect({
            _id: staticID("dnd5eACBonus"),
            changes: [{
              key: "system.attributes.ac.bonus",
              mode: CONST.ACTIVE_EFFECT_MODES.ADD,
              value: acBonus.total
            }],
            disabled: false,
            icon: "icons/magic/defensive/shield-barrier-blue.webp",
            name: game.i18n.localize("DND5E.SUMMON.FIELDS.bonuses.ac.label")
          })).toObject());
        }
      }
    }

    // Add bonus to HD
    if ( this.bonuses.hd && (actor.type === "npc") ) {
      const hdBonus = new Roll(this.bonuses.hd, rollData);
      await hdBonus.evaluate();
      if ( hdBonus.total ) {
        actorUpdates.effects.push((new ActiveEffect({
          _id: staticID("dnd5eHDBonus"),
          changes: [{
            key: "system.attributes.hd.max",
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
            value: hdBonus.total
          }],
          disabled: false,
          icon: "icons/sundries/gaming/dice-runed-brown.webp",
          name: game.i18n.localize("DND5E.SUMMON.FIELDS.bonuses.hd.label")
        })).toObject());
      }
    }

    // Add bonus to HP
    if ( this.bonuses.hp ) {
      const hpBonus = new Roll(this.bonuses.hp, rollData);
      await hpBonus.evaluate();

      // If non-zero hp bonus, apply as needed for this actor.
      // Note: Only unlinked actors will have their current HP set to their new max HP
      if ( hpBonus.total ) {

        // Helper function for modifying max HP ('bonuses.overall' or 'max')
        const maxHpEffect = hpField => {
          return (new ActiveEffect({
            _id: staticID("dnd5eHPBonus"),
            changes: [{
              key: `system.attributes.hp.${hpField}`,
              mode: CONST.ACTIVE_EFFECT_MODES.ADD,
              value: hpBonus.total
            }],
            disabled: false,
            icon: "icons/magic/life/heart-glowing-red.webp",
            name: game.i18n.localize("DND5E.SUMMON.FIELDS.bonuses.hp.label")
          })).toObject();
        };

        if ( !foundry.utils.isEmpty(actor.classes) && !actor._source.system.attributes.hp.max ) {
          // Actor has classes without a hard-coded max -- apply bonuses to 'overall'
          actorUpdates.effects.push(maxHpEffect("bonuses.overall"));
        } else if ( actor.prototypeToken.actorLink ) {
          // Otherwise, linked actors boost HP via 'max' AE
          actorUpdates.effects.push(maxHpEffect("max"));
        } else {
          // Unlinked actors assumed to always be "fresh" copies with bonus HP added to both
          // Max HP and Current HP
          actorUpdates["system.attributes.hp.max"] = actor.system.attributes.hp.max + hpBonus.total;
          actorUpdates["system.attributes.hp.value"] = actor.system.attributes.hp.value + hpBonus.total;
        }
      }
    }

    // Change creature size
    if ( this.creatureSizes.size ) {
      const size = this.creatureSizes.has(options.creatureSize) ? options.creatureSize : this.creatureSizes.first();
      const config = CONFIG.DND5E.actorSizes[size];
      if ( config ) {
        actorUpdates["system.traits.size"] = size;
        tokenUpdates.width = config.token ?? 1;
        tokenUpdates.height = config.token ?? 1;
      }
    }

    // Change creature type
    if ( this.creatureTypes.size ) {
      const type = this.creatureTypes.has(options.creatureType) ? options.creatureType : this.creatureTypes.first();
      if ( actor.system.details?.race instanceof Item ) {
        actorUpdates.items.push({ _id: actor.system.details.race.id, "system.type.value": type });
      } else {
        actorUpdates["system.details.type.value"] = type;
      }
    }

    const attackDamageBonus = Roll.replaceFormulaData(this.bonuses.attackDamage ?? "", rollData);
    const saveDamageBonus = Roll.replaceFormulaData(this.bonuses.saveDamage ?? "", rollData);
    const healingBonus = Roll.replaceFormulaData(this.bonuses.healing ?? "", rollData);
    for ( const item of actor.items ) {
      if ( !item.system.activities?.size ) continue;
      const changes = [];

      // Match attacks
      if ( this.match.attacks && item.system.hasAttack ) {
        let attack = this.flat?.attack;
        if ( attack === undefined ) {
          const ability = this.ability ?? this.item.abilityMod ?? rollData.attributes?.spellcasting;
          const actionType = item.system.activities.getByType("attack")[0].actionType;
          const typeMapping = { mwak: "msak", rwak: "rsak" };
          const parts = [
            rollData.abilities?.[ability]?.mod,
            prof,
            rollData.bonuses?.[typeMapping[actionType] ?? actionType]?.attack
          ].filter(p => p);
          attack = parts.join(" + ");
        }
        changes.push({
          key: "activities[attack].attack.bonus",
          mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
          value: attack
        }, {
          key: "activities[attack].attack.flat",
          mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
          value: true
        });
      }

      // Match saves
      if ( this.match.saves && item.hasSave ) {
        let dc = this.flat?.save;
        if ( dc === undefined ) {
          dc = rollData.abilities?.[this.ability]?.dc ?? rollData.attributes.spell.dc;
          if ( this.item.type === "spell" ) {
            const ability = this.item.system.availableAbilities?.first();
            if ( ability ) dc = rollData.abilities[ability]?.dc ?? dc;
          }
        }
        changes.push({
          key: "activities[save].save.dc.formula",
          mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
          value: dc
        }, {
          key: "activities[save].save.dc.calculation",
          mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
          value: ""
        });
      }

      // Damage bonus
      let damageBonus;
      if ( item.hasAttack ) damageBonus = attackDamageBonus;
      else if ( item.hasSave ) damageBonus = saveDamageBonus;
      else if ( item.isHealing ) damageBonus = healingBonus;
      if ( damageBonus && item.system.activities.find(a => a.damage?.parts?.length || a.healing?.formula) ) {
        changes.push({
          key: "system.damage.bonus",
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          value: damageBonus
        });
      }

      if ( changes.length ) {
        const effect = (new ActiveEffect({
          _id: staticID("dnd5eItemChanges"),
          changes,
          disabled: false,
          icon: "icons/skills/melee/strike-slashes-orange.webp",
          name: game.i18n.localize("DND5E.SUMMON.ItemChanges.Label"),
          origin: this.uuid,
          type: "enchantment"
        })).toObject();
        actorUpdates.items.push({ _id: item.id, effects: [effect] });
      }
    }

    // Add applied effects
    actorUpdates.effects.push(...this.effects.map(e => e.effect?.toObject()).filter(e => e));

    return { actorUpdates, tokenUpdates };
  }

  /* -------------------------------------------- */

  /**
   * Determine where the summons should be placed on the scene.
   * @param {PrototypeToken} token            Token to be placed.
   * @param {SummonsProfile} profile          Profile used for summoning.
   * @param {SummoningConfiguration} options  Additional summoning options.
   * @returns {Promise<PlacementData[]>}
   */
  async getPlacement(token, profile, options) {
    // Ensure the token matches the final size
    if ( this.creatureSizes.size ) {
      const size = this.creatureSizes.has(options.creatureSize) ? options.creatureSize : this.creatureSizes.first();
      const config = CONFIG.DND5E.actorSizes[size];
      if ( config ) token = token.clone({ width: config.token ?? 1, height: config.token ?? 1 });
    }

    const rollData = this.getRollData();
    const count = new Roll(profile.count || "1", rollData);
    await count.evaluate();
    return TokenPlacement.place({ tokens: Array(parseInt(count.total)).fill(token) });
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
    if ( actor.prototypeToken.randomImg && !game.user.can("FILES_BROWSE") ) {
      tokenUpdates.texture ??= {};
      tokenUpdates.texture.src ??= actor.img;
      ui.notifications.warn("DND5E.SUMMON.Warning.Wildcard", { localize: true });
    }

    delete placement.prototypeToken;
    const tokenDocument = await actor.getTokenDocument(foundry.utils.mergeObject(placement, tokenUpdates));

    // Linked summons require more explicit updates before token creation.
    // Unlinked summons can take actor delta directly.
    if ( tokenDocument.actorLink ) {
      const { effects, items, ...rest } = actorUpdates;
      await tokenDocument.actor.update(rest);
      await tokenDocument.actor.updateEmbeddedDocuments("Item", items);

      const { newEffects, oldEffects } = effects.reduce((acc, curr) => {
        const target = tokenDocument.actor.effects.get(curr._id) ? "oldEffects" : "newEffects";
        acc[target].push(curr);
        return acc;
      }, { newEffects: [], oldEffects: [] });

      await tokenDocument.actor.updateEmbeddedDocuments("ActiveEffect", oldEffects);
      await tokenDocument.actor.createEmbeddedDocuments("ActiveEffect", newEffects, {keepId: true});
    } else {
      tokenDocument.delta.updateSource(actorUpdates);
      if ( actor.prototypeToken.appendNumber ) TokenPlacement.adjustAppendedNumber(tokenDocument, placement);
    }

    return tokenDocument.toObject();
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle placing a summons from the chat card.
   * @this {SummonActivity}
   * @param {PointerEvent} event     Triggering click event.
   * @param {HTMLElement} target     The capturing HTML element which defined a [data-action].
   * @param {ChatMessage5e} message  Message associated with the activation.
   */
  static async #placeSummons(event, target, message) {
    const config = {
      create: { summons: true },
      summons: {}
    };
    let needsConfiguration = false;

    // No profile specified and only one profile on item, use that one
    const profiles = this.availableProfiles;
    if ( profiles.length === 1 ) config.summons.profile = profiles[0]._id;
    else needsConfiguration = true;

    // More than one creature size or type requires configuration
    if ( (this.creatureSizes.size > 1) || (this.creatureTypes.size > 1) ) needsConfiguration = true;

    if ( needsConfiguration ) {
      try {
        await SummonUsageDialog.create(this, config, {
          button: {
            icon: "fa-solid fa-spaghetti-monster-flying",
            label: "DND5E.SUMMON.Action.Summon"
          },
          display: {
            all: false,
            create: { summons: true }
          }
        });
      } catch(err) {
        return;
      }
    }

    try {
      await this.placeSummons(config.summons);
    } catch(err) {
      Hooks.onError("SummonsActivity#placeSummons", err, { log: "error", notify: "error" });
    }
  }

  /* -------------------------------------------- */
  /*  Deprecations                                */
  /* -------------------------------------------- */

  /**
   * @deprecated
   * @since 5.1.0
   * @ignore
   */
  fetchActor(uuid) {
    foundry.utils.logCompatibilityWarning("SummonActivity#fetchActor is deprecated. "
      + "Please use Actor5e.fetchExisting instead.", { since: "DnD5e 5.1", until: "DnD5e 5.3" });
    return dnd5e.documents.Actor5e.fetchExisting(uuid, {
      origin: { key: "flags.dnd5e.summon.origin", value: this.item?.uuid }
    });
  }
}
