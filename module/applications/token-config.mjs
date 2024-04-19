import TokenDocument5e from "../documents/token.mjs";
import { getHumanReadableAttributeLabel } from "../utils.mjs";

/**
 * Custom token configuration application for handling dynamic rings & resource labels.
 */
export default class TokenConfig5e extends TokenConfig {
  /** @inheritdoc */
  static get defaultOptions() {
    const options = super.defaultOptions;
    if ( !game.settings.get("dnd5e", "disableTokenRings") ) options.tabs.push({
      navSelector: '.tabs[data-group="appearance"]', contentSelector: '.tab[data-tab="appearance"]', initial: "token"
    });
    return options;
  }

  /* -------------------------------------------- */

  /**
   * Template used to render the dynamic ring tab.
   * @type {string}
   */
  static dynamicRingTemplate = "systems/dnd5e/templates/apps/parts/dynamic-ring.hbs";

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _render(...args) {
    await super._render(...args);
    if ( !this.rendered ) return;
    await this._addTokenRingConfiguration(this.element[0]);
    this._prepareResourceLabels(this.element[0]);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async getData(options={}) {
    const context = await super.getData(options);
    const doc = this.preview ?? this.document;
    context.scale = Math.abs(doc._source.texture.scaleX);
    this._addItemAttributes(context.barAttributes);
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Add a new section for token ring configuration.
   * @param {HTMLElement} html  The rendered markup.
   * @protected
   */
  async _addTokenRingConfiguration(html) {
    html.querySelector('.tab[data-tab="appearance"] fieldset:last-child')?.remove();

    if ( game.settings.get("dnd5e", "disableTokenRings") ) return;

    const tab = html.querySelector('.tab[data-tab="appearance"]');

    const tokenTab = document.createElement("div");
    tokenTab.classList.add("tab");
    tokenTab.dataset.group = "appearance";
    tokenTab.dataset.tab = "token";
    tokenTab.replaceChildren(...tab.children);

    let ringTab = document.createElement("div");
    const flags = this.document.getFlag("dnd5e", "tokenRing") ?? {};
    ringTab.innerHTML = await renderTemplate(this.constructor.dynamicRingTemplate, {
      flags: foundry.utils.mergeObject({ scaleCorrection: 1 }, flags, { inplace: false }),
      effects: Object.entries(CONFIG.DND5E.tokenRings.effects).reduce((obj, [key, label]) => {
        const mask = CONFIG.Token.ringClass.effects[key];
        obj[key] = { label, checked: (flags.effects & mask) > 0 };
        return obj;
      }, {}),
      subjectPlaceholder: TokenDocument5e.inferSubjectPath(this.object.texture.src)
    });
    ringTab = ringTab.querySelector("div");
    ringTab.querySelectorAll("input").forEach(i => i.addEventListener("change", this._onChangeInput.bind(this)));
    ringTab.querySelector("button.file-picker").addEventListener("click", this._activateFilePicker.bind(this));

    tab.replaceChildren(tokenTab, ringTab);
    tab.insertAdjacentHTML("afterbegin", `
      <nav class="tabs sheet-tabs secondary-tabs" data-group="appearance">
        <a class="item" data-tab="token" data-group="appearance">
          <i class="fa-solid fa-expand"></i> ${game.i18n.localize("Token")}
        </a>
        <a class="item" data-tab="ring" data-group="appearance">
          <i class="fa-solid fa-ring"></i> ${game.i18n.localize("DND5E.TokenRings.Title")}
        </a>
      </nav>
    `);

    this._tabs.at(-1).bind(html);
    if ( !this._minimized ) this.setPosition();
  }

  /* -------------------------------------------- */

  /**
   * Adds charge based items as attributes for the current token.
   * @param {object} attributes The attribute groups to add the item entries to.
   * @protected
   */
  _addItemAttributes(attributes) {
    const actor = this.object?.actor;
    const items = actor?.items.reduce((arr, i) => {
      const { per, max } = i.system.uses ?? {};
      if ( per && max ) arr.push([i.getRelativeUUID(actor), i.name]);
      return arr;
    }, []) ?? [];
    if ( items.length ) {
      items.sort(([, a], [, b]) => a.localeCompare(b, game.i18n.lang));
      attributes[game.i18n.localize("DND5E.ConsumeCharges")] = items.map(i => i[0]);
    }
  }

  /* -------------------------------------------- */

  /**
   * Replace the attribute paths in token resources with human readable labels and sort them alphabetically.
   * @param {HTMLElement} html  The rendered markup.
   * @protected
   */
  _prepareResourceLabels(html) {
    const actor = this.object?.actor;

    for ( const select of html.querySelectorAll("select.bar-attribute") ) {
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

  /** @inheritDoc */
  _getSubmitData(updateData={}) {
    const formData = super._getSubmitData(updateData);

    formData["flags.dnd5e.tokenRing.effects"] = Object.keys(CONFIG.DND5E.tokenRings.effects).reduce((number, key) => {
      const checked = formData[`flags.dnd5e.tokenRing.effects.${key}`];
      delete formData[`flags.dnd5e.tokenRing.effects.${key}`];
      if ( checked ) number |= CONFIG.Token.ringClass.effects[key];
      return number;
    }, 0x1);

    return formData;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _previewChanges(change) {
    if ( change && (this.preview instanceof TokenDocument5e) && (game.release.generation < 12) ) {
      const flags = foundry.utils.getProperty(foundry.utils.expandObject(change), "flags.dnd5e.tokenRing") ?? {};
      const redraw = ("textures" in flags) || ("enabled" in flags);
      if ( redraw ) this.preview.object.renderFlags.set({ redraw });
      else this.preview.object.ring.configureVisuals({...flags});
    }
    super._previewChanges(change);
  }
}
