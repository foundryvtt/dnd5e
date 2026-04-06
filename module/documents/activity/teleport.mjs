import TeleportSheet from "../../applications/activity/teleport-sheet.mjs";
import TeleportActivityData from "../../data/activity/teleport-data.mjs";
import { convertLength } from "../../utils.mjs";
import ActivityMixin from "./mixin.mjs";

/**
 * Activity for teleporting a token using planned blink movement.
 */
export default class TeleportActivity extends ActivityMixin(TeleportActivityData) {
  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "DND5E.TELEPORT"];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(
    foundry.utils.mergeObject(super.metadata, {
      type: "teleport",
      img: "systems/dnd5e/icons/svg/activity/teleport.svg",
      title: "DND5E.TELEPORT.Title",
      hint: "DND5E.TELEPORT.Hint",
      sheetClass: TeleportSheet,
      usage: {
        actions: {
          planTeleport: TeleportActivity.#planTeleport
        }
      }
    }, { inplace: false })
  );

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Can this activity currently plan teleport movement?
   * @type {boolean}
   */
  get canPlanTeleport() {
    return this.teleport?.unlimited || ((this.teleport?.units in CONFIG.DND5E.movementUnits)
      && Number.isFinite(this.teleport?.value) && (this.teleport.value > 0));
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareData() {
    super.prepareData();
    const source = this.toObject();
    const currentTeleport = this._source.teleport;
    const hasConfiguredTeleport = (currentTeleport?.units in CONFIG.DND5E.movementUnits)
      && (((currentTeleport?.value ?? "") !== ""));
    if ( !hasConfiguredTeleport ) {
      if ( (currentTeleport?.units in CONFIG.DND5E.movementUnits)
        && (((currentTeleport?.maxDistance ?? "") !== "")) ) {
        this._source.teleport = {
          ...source.teleport,
          value: currentTeleport.maxDistance,
          units: currentTeleport.units
        };
      } else {
        const legacyRange = this._source.range;
        const hasConfiguredRange = (legacyRange?.units in CONFIG.DND5E.movementUnits)
          && (((legacyRange?.value ?? "") !== ""));
        if ( hasConfiguredRange ) {
          this._source.teleport = {
            ...source.teleport,
            value: legacyRange.value,
            units: legacyRange.units
          };
          if ( this.isSpell && (this.item.system.range?.units === "self") ) this._source.range = { override: false };
        }
      }
    }
    this._source.teleport = foundry.utils.mergeObject(source.teleport, this._source.teleport ?? {}, { inplace: false });
    for ( const field of ["activation", "duration", "range", "target", "uses"] ) {
      this._source[field] ??= source[field];
    }
  }

  /* -------------------------------------------- */
  /*  Activation                                  */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _usageChatButtons(message) {
    if ( !this.canPlanTeleport ) return super._usageChatButtons(message);
    return [{
      label: game.i18n.localize("DND5E.TELEPORT.Action.Teleport"),
      icon: '<i class="fa-solid fa-person-from-portal" inert></i>',
      dataset: {
        action: "planTeleport"
      }
    }].concat(super._usageChatButtons(message));
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _triggerSubsequentActions() {
    if ( !this.canPlanTeleport ) return;
    try {
      await this.planTeleport();
    } catch(err) {
      Hooks.onError("TeleportActivity#planTeleport", err, { log: "error", notify: "error" });
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async planTeleport() {
    if ( !this.canPlanTeleport ) return null;

    const token = this.getUsageToken();
    if ( !token?.object ) {
      ui.notifications.warn("DND5E.ActionWarningNoToken", { localize: true });
      return null;
    }

    if ( (typeof token.object.planMovement !== "function") || (typeof token.startMovement !== "function") ) {
      ui.notifications.error("DND5E.TELEPORT.Warning.Unsupported", { localize: true });
      return null;
    }

    const maxDistance = this.#getSceneMaxDistance();
    if ( !(maxDistance > 0) ) {
      ui.notifications.warn("DND5E.TELEPORT.Warning.InvalidDistance", { localize: true });
      return null;
    }

    const plan = await token.object.planMovement({
      allowedActions: ["blink"],
      direct: true,
      maxDistance,
      preventDrop: true
    });
    if ( !plan ) return null;

    return token.startMovement(plan.id);
  }

  /* -------------------------------------------- */

  /**
   * Get the maximum teleport distance converted into the current scene's units.
   * @returns {number|null}
   */
  #getSceneMaxDistance() {
    if ( this.teleport?.unlimited ) return Infinity;
    const sceneUnits = canvas.grid?.units;
    if ( !(this.teleport?.units in CONFIG.DND5E.movementUnits) || !(this.teleport?.value > 0)
      || !(sceneUnits in CONFIG.DND5E.movementUnits) ) return null;
    return convertLength(this.teleport.value, this.teleport.units, sceneUnits);
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle planning teleport movement from the chat card.
   * @this {TeleportActivity}
   * @param {PointerEvent} event     Triggering click event.
   * @param {HTMLElement} target     The capturing HTML element which defined a [data-action].
   * @param {ChatMessage5e} message  Message associated with the activation.
   * @returns {Promise<boolean|null>}
   */
  static #planTeleport(event, target, message) {
    return this.planTeleport();
  }
}
