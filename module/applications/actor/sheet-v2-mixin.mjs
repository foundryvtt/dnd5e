import * as Trait from "../../documents/actor/trait.mjs";
import { formatNumber, simplifyBonus } from "../../utils.mjs";

/**
 * Adds common V2 sheet functionality.
 * @param {typeof ActorSheet5e} Base  The base class being mixed.
 * @returns {typeof ActorSheetV2}
 */
export default function ActorSheetV2Mixin(Base) {
  return class ActorSheetV2 extends Base {
    /**
     * Available sheet modes.
     * @enum {number}
     */
    static MODES = {
      PLAY: 1,
      EDIT: 2
    };

    /**
     * The mode the sheet is currently in.
     * @type {ActorSheetV2.MODES}
     * @protected
     */
    _mode = this.constructor.MODES.PLAY;

    /* -------------------------------------------- */

    /** @inheritDoc */
    async _renderOuter() {
      const html = await super._renderOuter();
      const header = html[0].querySelector(".window-header");

      // Add edit <-> play slide toggle.
      if ( this.isEditable ) {
        const toggle = document.createElement("slide-toggle");
        toggle.checked = this._mode === this.constructor.MODES.EDIT;
        toggle.classList.add("mode-slider");
        toggle.dataset.tooltip = "DND5E.SheetModeEdit";
        toggle.setAttribute("aria-label", game.i18n.localize("DND5E.SheetModeEdit"));
        toggle.addEventListener("change", this._onChangeSheetMode.bind(this));
        toggle.addEventListener("dblclick", event => event.stopPropagation());
        header.insertAdjacentElement("afterbegin", toggle);
      }

      // Adjust header buttons.
      header.querySelectorAll(".header-button").forEach(btn => {
        const label = btn.querySelector(":scope > i").nextSibling;
        btn.dataset.tooltip = label.textContent;
        btn.setAttribute("aria-label", label.textContent);
        label.remove();
      });

      const idLink = header.querySelector(".document-id-link");
      if ( idLink ) {
        const firstButton = header.querySelector(".header-button");
        firstButton?.insertAdjacentElement("beforebegin", idLink);
        idLink.classList.add("header-button");
      }

      return html;
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async getData(options) {
      const context = await super.getData(options);
      context.editable = this.isEditable && (this._mode === this.constructor.MODES.EDIT);
      context.cssClass = context.editable ? "editable" : this.isEditable ? "interactable" : "locked";
      const { attributes } = this.actor.system;

      // Portrait
      const showTokenPortrait = this.actor.getFlag("dnd5e", "showTokenPortrait") === true;
      const token = this.actor.isToken ? this.actor.token : this.actor.prototypeToken;
      context.portrait = {
        token: showTokenPortrait,
        src: showTokenPortrait ? token.texture.src : this.actor.img,
        // TODO: Not sure the best way to update the parent texture from this sheet if this is a token actor.
        path: showTokenPortrait ? this.actor.isToken ? "" : "prototypeToken.texture.src" : "img"
      };

      // Death Saves
      const plurals = new Intl.PluralRules(game.i18n.lang, { type: "ordinal" });
      context.death = {};
      ["success", "failure"].forEach(deathSave => {
        context.death[deathSave] = [];
        for ( let i = 1; i < 4; i++ ) {
          const n = deathSave === "failure" ? i : 4 - i;
          const i18nKey = `DND5E.DeathSave${deathSave.titleCase()}Label`;
          const filled = attributes.death[deathSave] >= n;
          const classes = ["pip"];
          if ( filled ) classes.push("filled");
          if ( deathSave === "failure" ) classes.push("failure");
          context.death[deathSave].push({
            n, filled,
            tooltip: i18nKey,
            label: game.i18n.localize(`${i18nKey}N.${plurals.select(n)}`),
            classes: classes.join(" ")
          });
        }
      });

      // Senses
      context.senses = Object.entries(CONFIG.DND5E.senses).reduce((obj, [k, label]) => {
        const value = attributes.senses[k];
        if ( value ) obj[k] = { label, value };
        return obj;
      }, {});

      if ( attributes.senses.special ) attributes.senses.special.split(";").forEach((v, i) => {
        context.senses[`custom${i + 1}`] = { label: v.trim() };
      });

      return context;
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    activateListeners(html) {
      super.activateListeners(html);
      html.find(".pips[data-prop]").on("click", this._onTogglePip.bind(this));
      html.find("proficiency-cycle").on("change", this._onChangeInput.bind(this));
      html.find(".rollable:is(.saving-throw, .ability-check)").on("click", this._onRollAbility.bind(this));
      html.find(".sidebar-collapser").on("click", this._onToggleSidebar.bind(this));
      this.form.querySelectorAll(".item-tooltip").forEach(this._applyItemTooltips.bind(this));
      this.form.querySelectorAll("[data-reference-tooltip]").forEach(this._applyReferenceTooltips.bind(this));
      if ( this.isEditable ) {
        html.find(".meter > .hit-points").on("click", event => this._toggleEditHP(event, true));
        html.find(".meter > .hit-points > input").on("blur", event => this._toggleEditHP(event, false));
      }
    }

    /* -------------------------------------------- */

    /** @override */
    _prepareTraits() {
      const traits = {};
      for ( const [trait, config] of Object.entries(CONFIG.DND5E.traits) ) {
        const key = config.actorKeyPath ?? `system.traits.${trait}`;
        const data = foundry.utils.deepClone(foundry.utils.getProperty(this.actor, key));
        if ( !data ) continue;
        let values = data.value;
        if ( !values ) values = [];
        else if ( values instanceof Set ) values = Array.from(values);
        else if ( !Array.isArray(values) ) values = [values];
        values = values.map(key => {
          const value = { label: Trait.keyLabel(key, { trait }) ?? key };
          const icons = value.icons = [];
          if ( data.bypasses?.size && CONFIG.DND5E.damageTypes[key]?.isPhysical ) icons.push(...data.bypasses);
          return value;
        });
        if ( data.custom ) data.custom.split(";").forEach(v => values.push({ label: v.trim() }));
        if ( values.length ) traits[trait] = values;
      }
      // If petrified, display "All Damage" instead of all damage types separately
      if ( this.document.hasConditionEffect("petrification") ) {
        traits.dr = [{ label: game.i18n.localize("DND5E.DamageAll") }];
      }
      // Combine damage & condition immunities in play mode.
      if ( (this._mode === this.constructor.MODES.PLAY) && traits.ci ) {
        traits.di ??= [];
        traits.di.push(...traits.ci);
        delete traits.ci;
      }

      // Prepare damage modifications
      const dm = this.actor.system.traits?.dm;
      if ( dm ) {
        const rollData = this.actor.getRollData({ deterministic: true });
        const values = Object.entries(dm.amount).map(([k, v]) => {
          const total = simplifyBonus(v, rollData);
          if ( !total ) return null;
          const value = {
            label: `${CONFIG.DND5E.damageTypes[k]?.label ?? k} ${formatNumber(total, { signDisplay: "always" })}`,
            color: total > 0 ? "maroon" : "green"
          };
          const icons = value.icons = [];
          if ( dm.bypasses.size && CONFIG.DND5E.damageTypes[k]?.isPhysical ) icons.push(...dm.bypasses);
          return value;
        }).filter(f => f);
        if ( values.length ) traits.dm = values;
      }

      return traits;
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    _getLabels() {
      const labels = super._getLabels();
      labels.damageAndHealing = { ...CONFIG.DND5E.damageTypes, ...CONFIG.DND5E.healingTypes };
      return labels;
    }

    /* -------------------------------------------- */

    /**
     * Handle the user toggling the sheet mode.
     * @param {Event} event  The triggering event.
     * @protected
     */
    async _onChangeSheetMode(event) {
      const { MODES } = this.constructor;
      const toggle = event.currentTarget;
      const label = game.i18n.localize(`DND5E.SheetMode${toggle.checked ? "Play" : "Edit"}`);
      toggle.dataset.tooltip = label;
      toggle.setAttribute("aria-label", label);
      this._mode = toggle.checked ? MODES.EDIT : MODES.PLAY;
      await this.submit();
      this.render();
    }

    /* -------------------------------------------- */

    /**
     * Toggle editing hit points.
     * @param {PointerEvent} event  The triggering event.
     * @param {boolean} edit        Whether to toggle to the edit state.
     * @protected
     */
    _toggleEditHP(event, edit) {
      const target = event.currentTarget.closest(".hit-points");
      const label = target.querySelector(":scope > .label");
      const input = target.querySelector(":scope > input");
      label.hidden = edit;
      input.hidden = !edit;
      if ( edit ) input.focus();
    }

    /* -------------------------------------------- */

    /**
     * Handle toggling a pip on the character sheet.
     * @param {PointerEvent} event  The triggering event.
     * @returns {Promise<Actor5e>|void}
     * @protected
     */
    _onTogglePip(event) {
      const n = Number(event.target.closest("[data-n]")?.dataset.n);
      if ( !n || isNaN(n) ) return;
      const prop = event.currentTarget.dataset.prop;
      let value = foundry.utils.getProperty(this.actor, prop);
      if ( value === n ) value--;
      else value = n;
      return this.actor.update({ [prop]: value });
    }

    /* -------------------------------------------- */

    /**
     * Handle the user toggling the sidebar collapsed state.
     * @protected
     */
    _onToggleSidebar() {
      const collapsed = this._toggleSidebar();
      const activeTab = this._tabs?.[0]?.active ?? "details";
      game.user.setFlag("dnd5e", `sheetPrefs.character.tabs.${activeTab}.collapseSidebar`, collapsed);
    }

    /* -------------------------------------------- */

    /**
     * Toggle the sidebar collapsed state.
     * @param {boolean} [collapsed]  Force a particular collapsed state.
     * @returns {boolean}            The new collapsed state.
     * @protected
     */
    _toggleSidebar(collapsed) {
      this.form.classList.toggle("collapsed", collapsed);
      collapsed = this.form.classList.contains("collapsed");
      const collapser = this.form.querySelector(".sidebar-collapser");
      const icon = collapser.querySelector("i");
      collapser.dataset.tooltip = `JOURNAL.View${collapsed ? "Expand" : "Collapse"}`;
      collapser.setAttribute("aria-label", game.i18n.localize(collapser.dataset.tooltip));
      icon.classList.remove("fa-caret-left", "fa-caret-right");
      icon.classList.add(`fa-caret-${collapsed ? "right" : "left"}`);
      return collapsed;
    }

    /* -------------------------------------------- */

    /**
     * Handle rolling an ability check or saving throw.
     * @param {PointerEvent} event  The triggering event.
     * @protected
     */
    _onRollAbility(event) {
      const abilityId = event.currentTarget.closest("[data-ability]").dataset.ability;
      const isSavingThrow = event.currentTarget.classList.contains("saving-throw");
      if ( abilityId === "concentration" ) this.actor.rollConcentration({ event });
      else if ( isSavingThrow ) this.actor.rollAbilitySave(abilityId, { event });
      else this.actor.rollAbilityTest(abilityId, { event });
    }

    /* -------------------------------------------- */

    /**
     * Initialize item tooltips on an element.
     * @param {HTMLElement} element  The tooltipped element.
     * @protected
     */
    _applyItemTooltips(element) {
      if ( "tooltip" in element.dataset ) return;
      const target = element.closest("[data-item-id], [data-effect-id], [data-uuid]");
      let uuid = target.dataset.uuid;
      if ( !uuid && target.dataset.itemId ) {
        const item = this.actor.items.get(target.dataset.itemId);
        uuid = item?.uuid;
      } else if ( !uuid && target.dataset.effectId ) {
        const { effectId, parentId } = target.dataset;
        const collection = parentId ? this.actor.items.get(parentId).effects : this.actor.effects;
        uuid = collection.get(effectId)?.uuid;
      }
      if ( !uuid ) return;
      element.dataset.tooltip = `
      <section class="loading" data-uuid="${uuid}"><i class="fas fa-spinner fa-spin-pulse"></i></section>
    `;
      element.dataset.tooltipClass = "dnd5e2 dnd5e-tooltip item-tooltip";
      element.dataset.tooltipDirection ??= "LEFT";
    }

    /* -------------------------------------------- */

    /**
     * Initialize a rule tooltip on an element.
     * @param {HTMLElement} element  The tooltipped element.
     * @protected
     */
    _applyReferenceTooltips(element) {
      if ( "tooltip" in element.dataset ) return;
      const uuid = element.dataset.referenceTooltip;
      element.dataset.tooltip = `
      <section class="loading" data-uuid="${uuid}"><i class="fas fa-spinner fa-spin-pulse"></i></section>
    `;
    }
  }
}
