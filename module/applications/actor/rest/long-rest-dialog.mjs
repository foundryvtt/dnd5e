import BaseRestDialog from "./base-rest-dialog.mjs";

/**
 * Dialog for configuring a long rest.
 */
export default class LongRestDialog extends BaseRestDialog {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["long-rest"],
    window: {
      title: "DND5E.REST.Long.Label"
    }
  };

  /* -------------------------------------------- */

  /** @inheritDoc */
  static PARTS = {
    ...super.PARTS,
    content: {
      template: "systems/dnd5e/templates/actors/rest/long-rest.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @override */
  get promptNewDay() {
    // It's always a new day when resting 1 week
    // TODO: Adjust based on actual variant duration, rather than hard-coding
    return context.variant !== "gritty";
  }

  /* -------------------------------------------- */
  /*  Factory Methods                             */
  /* -------------------------------------------- */

  /**
   * A helper constructor function which displays the Long Rest confirmation dialog and returns a Promise once it's
   * workflow has been resolved.
   * @param {object} [options={}]
   * @param {Actor5e} [options.actor]  Actor that is taking the long rest.
   * @returns {Promise}                Promise that resolves when the rest is completed or rejects when canceled.
   */
  static async longRestDialog({ actor } = {}) {
    foundry.utils.logCompatibilityWarning(
      "The `longRestDialog` method on `LongRestDialog` has been renamed `configure`.",
      { since: "DnD5e 4.1", until: "DnD5e 4.3" }
    );
    return this.configure(actor, { type: "long" });
  }
}
