import { getHumanReadableAttributeLabel } from "../utils.mjs";
import MovementSensesConfig from "./shared/movement-senses-config.mjs";

/**
 * Custom token configuration application for handling dynamic rings & resource labels.
 */
export class TokenConfig5e extends foundry.applications.sheets.TokenConfig {

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options);
    if ( !this.rendered ) return;
    this._prepareResourceLabels(this.element);
    this._applySenseSyncNotice(this.element);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.scale = Math.abs(this.token._source.texture.scaleX);
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareResourcesTab() {
    const context = await super._prepareResourcesTab();
    this._addItemAttributes(context.barAttributes);
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Adds charge based items as attributes for the current token.
   * @param {object} attributes The attribute groups to add the item entries to.
   * @protected
   */
  _addItemAttributes(attributes) {
    const actor = this.actor ?? this.object?.actor;
    const items = actor?.items.reduce((arr, i) => {
      if ( i.hasLimitedUses ) arr.push([foundry.utils.buildRelativeUuid(i, actor), i.name]);
      return arr;
    }, []) ?? [];
    if ( items.length ) {
      const group = _loc("DND5E.ConsumeCharges");
      items.sort(([, a], [, b]) => a.localeCompare(b, game.i18n.lang));
      attributes.push(...items.map(([value, label]) => ({ group, value, label })));
    }
  }

  /* -------------------------------------------- */

  /**
   * Replace the attribute paths in token resources with human readable labels and sort them alphabetically.
   * @param {HTMLElement} html  The rendered markup.
   * @protected
   */
  _prepareResourceLabels(html) {
    const actor = this.actor ?? this.object?.actor;

    for ( const select of html.querySelectorAll('select:is(.bar-attribute, [name$=".attribute"])') ) {
      select.querySelectorAll("optgroup").forEach(group => {
        const options = Array.from(group.querySelectorAll("option"));

        // Localize attribute paths.
        options.forEach(option => {
          const label = getHumanReadableAttributeLabel(option.value, { actor });
          if ( label ) option.innerText = label;
        });

        // Sort options by localized label.
        options.sort((a, b) => a.innerText.localeCompare(b.innerText, game.i18n.lang));
        group.append(...options);
      });
    }
  }

  /* -------------------------------------------- */

  /**
   * Lock the Vision tab fields that are derived from the actor's senses and surface a sync notice.
   * @param {HTMLElement} html  The rendered markup.
   * @protected
   */
  _applySenseSyncNotice(html) {
    if ( !game.settings.get("dnd5e", "senseVisionSync") ) return;
    const actor = this.actor ?? this.object?.actor;
    const senses = actor?.system?.attributes?.senses;
    if ( !senses ) return;

    const { sight, detectionModes } = CONFIG.Token.documentClass.computeSenseOverrides(senses);
    if ( !sight.enabled && foundry.utils.isEmpty(detectionModes) ) return;

    // Lock sight to the derived values; these bind to source, so they would otherwise show stale, editable data.
    if ( sight.enabled ) {
      const range = html.querySelector('[name="sight.range"]');
      const mode = html.querySelector('[name="sight.visionMode"]');
      if ( range ) Object.assign(range, { value: sight.range, disabled: true });
      if ( mode ) Object.assign(mode, { value: sight.visionMode, disabled: true });
    }

    // Hide the override control on sense-derived rows; core already renders their derived range disabled.
    const ids = sight.enabled ? [...Object.keys(detectionModes), "basicSight"] : Object.keys(detectionModes);
    for ( const id of ids ) {
      const pencil = html.querySelector(`[data-id="${id}"] [data-action="overrideDetectionMode"]`);
      if ( pencil ) pencil.hidden = true;
    }

    // Surface a notice atop the Vision tab linking to the senses config.
    const tab = html.querySelector('[data-application-part="vision"]');
    if ( !tab || tab.querySelector(".sense-sync-notice") ) return;
    const link = `<a data-action="editSenses">${_loc("SETTINGS.DND5E.AUTOMATION.SenseVision.Senses")}</a>`;
    const notice = document.createElement("p");
    notice.className = "hint sense-sync-notice";
    notice.innerHTML = `<i class="fa-solid fa-circle-info"></i> ${
      _loc("SETTINGS.DND5E.AUTOMATION.SenseVision.Notice", { senses: link })}`;
    notice.querySelector("[data-action=editSenses]")?.addEventListener("click", () => {
      new MovementSensesConfig({ document: actor, type: "senses" }).render({ force: true });
    });
    tab.prepend(notice);
  }
}

/**
 * Custom prototype token configuration application for handling dynamic rings & resource labels.
 */
export class PrototypeTokenConfig5e extends foundry.applications.sheets.PrototypeTokenConfig {
  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options);
    if ( !this.rendered ) return;
    TokenConfig5e.prototype._prepareResourceLabels.call(this, this.element);
    TokenConfig5e.prototype._applySenseSyncNotice.call(this, this.element);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareResourcesTab() {
    const context = await super._prepareResourcesTab();
    TokenConfig5e.prototype._addItemAttributes.call(this, context.barAttributes);
    return context;
  }
}
