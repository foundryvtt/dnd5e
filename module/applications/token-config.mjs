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
    await this._addTokenRingConfiguration(this.element[0]);
    this._prepareResourceLabels(this.element[0]);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async getData(options={}) {
    const context = await super.getData(options);
    const doc = this.preview ?? this.document;
    context.scale = Math.abs(doc._source.texture.scaleX);
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Add a new section for token ring configuration.
   * @param {HTMLElement} html  The rendered markup.
   * @protected
   */
  async _addTokenRingConfiguration(html) {
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
      flags, subjectPlaceholder: this.object._inferSubjectPath(this.object.texture.src)
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

    const content = this.popOut ? html.parentElement : html;
    this._tabs.at(-1).bind(content);

    if ( !this._minimized ) this.setPosition();
  }

  /* -------------------------------------------- */

  /**
   * Handle rendering human-readable labels and adding item uses.
   * @param {HTMLElement} html  The rendered markup.
   * @protected
   */
  _prepareResourceLabels(html) {
    const actor = this.object?.actor;
    const makeOptgroup = (label, parent) => {
      const optgroup = document.createElement("optgroup");
      optgroup.label = game.i18n.localize(label);
      parent.appendChild(optgroup);
      return optgroup;
    };

    const items = actor?.items.reduce((obj, i) => {
      const { per, max } = i.system.uses ?? {};
      if ( per && max ) obj[i.getRelativeUUID(actor)] = i.name;
      return obj;
    }, {}) ?? {};

    // Add human-readable labels, categorize, and sort entries, and add item uses.
    for ( const select of html.querySelectorAll('[name="bar1.attribute"], [name="bar2.attribute"]') ) {
      const groups = {
        abilities: makeOptgroup("DND5E.AbilityScorePl", select),
        movement: makeOptgroup("DND5E.MovementSpeeds", select),
        senses: makeOptgroup("DND5E.Senses", select),
        skills: makeOptgroup("DND5E.SkillPassives", select),
        slots: makeOptgroup("JOURNALENTRYPAGE.DND5E.Class.SpellSlots", select)
      };

      select.querySelectorAll("option").forEach(option => {
        const label = getHumanReadableAttributeLabel(option.value, { actor });
        if ( label ) option.innerText = label;
        if ( option.value.startsWith("abilities.") ) groups.abilities.appendChild(option);
        else if ( option.value.startsWith("attributes.movement.") ) groups.movement.appendChild(option);
        else if ( option.value.startsWith("attributes.senses.") ) groups.senses.appendChild(option);
        else if ( option.value.startsWith("skills.") ) groups.skills.appendChild(option);
        else if ( option.value.startsWith("spells.") ) groups.slots.appendChild(option);
      });

      select.querySelectorAll("optgroup").forEach(group => {
        const options = Array.from(group.querySelectorAll("option"));
        options.sort((a, b) => a.innerText.localeCompare(b.innerText, game.i18n.lang));
        group.append(...options);
      });

      if ( !foundry.utils.isEmpty(items) ) {
        const group = makeOptgroup("DND5E.ConsumeCharges", select);
        for ( const [k, v] of Object.entries(items).sort(([, a], [, b]) => a.localeCompare(b, game.i18n.lang)) ) {
          const option = document.createElement("option");
          if ( k === foundry.utils.getProperty(this.object, select.name) ) option.selected = true;
          option.value = k;
          option.innerText = v;
          group.appendChild(option);
        }
      }
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _previewChanges(change) {
    if ( !this.preview ) return;
    if ( change ) {
      const flags = foundry.utils.getProperty(foundry.utils.expandObject(change), "flags.dnd5e.tokenRing") ?? {};
      const redraw = ("textures" in flags) || ("enabled" in flags);
      if ( redraw ) this.preview.object.renderFlags.set({ redraw });
      else this.preview.object.ring.configureVisuals({...flags});
    }
    super._previewChanges(change);
  }
}
