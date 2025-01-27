/**
 * Adds common V2 sheet functionality.
 * @param {typeof DocumentSheet} Base  The base class being mixed.
 * @returns {typeof DocumentSheetV2}
 */
export default function DocumentSheetV2Mixin(Base) {
  return class DocumentSheetV2 extends Base {
    /**
     * @typedef {object} SheetTabDescriptor5e
     * @property {string} tab                       The tab key.
     * @property {string} label                     The tab label's localization key.
     * @property {string} [icon]                    A font-awesome icon.
     * @property {string} [svg]                     An SVG icon.
     * @property {SheetTabCondition5e} [condition]  A predicate to check before rendering the tab.
     */

    /**
     * @callback SheetTabCondition5e
     * @param {Document} doc  The Document instance.
     * @returns {boolean}     Whether to render the tab.
     */

    /**
     * Sheet tabs.
     * @type {SheetTabDescriptor5e[]}
     */
    static TABS = [];

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
     * @type {ActorSheetV2.MODES|null}
     * @protected
     */
    _mode = null;

    /* -------------------------------------------- */

    /** @inheritDoc */
    static _customElements = super._customElements.concat(["dnd5e-checkbox", "proficiency-cycle", "slide-toggle"]);

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    /** @inheritDoc */
    async _render(force, { mode, ...options }={}) {
      if ( !this._mode ) {
        this._mode = mode ?? this.constructor.MODES.PLAY;
        if ( this.rendered ) {
          const toggle = this.element[0].querySelector(".window-header .mode-slider");
          toggle.checked = this._mode === this.constructor.MODES.EDIT;
        }
      }
      return super._render(force, options);
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async _renderOuter() {
      const html = await super._renderOuter();
      const header = html[0].querySelector(".window-header");

      // Adjust header buttons.
      header.querySelectorAll(".header-button").forEach(btn => {
        const label = btn.querySelector(":scope > i").nextSibling;
        btn.dataset.tooltip = label.textContent;
        btn.setAttribute("aria-label", label.textContent);
        btn.addEventListener("dblclick", event => event.stopPropagation());
        label.remove();
      });

      if ( !game.user.isGM && this.document.limited ) {
        html[0].classList.add("limited");
        return html;
      }

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

      // Document UUID link.
      const firstButton = header.querySelector(".header-button");
      const idLink = header.querySelector(".document-id-link");
      if ( idLink ) {
        firstButton?.insertAdjacentElement("beforebegin", idLink);
        idLink.classList.add("pseudo-header-button");
        idLink.dataset.tooltipDirection = "DOWN";
      }

      return html;
    }

    /* -------------------------------------------- */

    /**
     * Render source information in the Document's title bar.
     * @param {jQuery} html  The outer frame HTML.
     * @protected
     */
    _renderSourceOuter([html]) {
      const elements = document.createElement("div");
      elements.classList.add("header-elements");
      elements.innerHTML = `
        <div class="source-book">
          <a class="config-button" data-action="source" data-tooltip="DND5E.SOURCE.Action.Configure"
             aria-label="${game.i18n.localize("DND5E.SOURCE.Action.Configure")}">
            <i class="fas fa-cog"></i>
          </a>
          <span></span>
        </div>
      `;
      html.querySelector(".window-title")?.insertAdjacentElement("afterend", elements);
      elements.querySelector(".config-button").addEventListener("click", this._onConfigMenu.bind(this));
    }

    /* -------------------------------------------- */

    /**
     * Update the source information when re-rendering the sheet.
     * @protected
     */
    _renderSource() {
      const [elements] = this.element.find(".header-elements");
      const source = this.document?.system.source;
      if ( !elements || !source ) return;
      const editable = this.isEditable && (this._mode === this.constructor.MODES.EDIT);
      elements.querySelector(".config-button")?.toggleAttribute("hidden", !editable);
      elements.querySelector(".source-book > span").innerText = editable
        ? (source.label || game.i18n.localize("DND5E.SOURCE.FIELDS.source.label"))
        : source.label;
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async getData(options) {
      const context = await super.getData(options);
      context.editable = this.isEditable && (this._mode === this.constructor.MODES.EDIT);
      context.cssClass = context.editable ? "editable" : this.isEditable ? "interactable" : "locked";
      return context;
    }

    /* -------------------------------------------- */
    /*  Event Listeners & Handlers                  */
    /* -------------------------------------------- */

    /** @inheritDoc */
    activateListeners(html) {
      super.activateListeners(html);
      html.find("[data-toggle-description]").on("click", this._onToggleDescription.bind(this));
      this.form.querySelectorAll(".item-tooltip").forEach(this._applyItemTooltips.bind(this));

      if ( this.isEditable ) {
        this.form.querySelectorAll("multi-select .tag").forEach(tag => {
          tag.classList.add("remove");
          tag.querySelector(":scope > span")?.classList.add("remove");
        });
        html.find(".create-child").on("click", this._onCreateChild.bind(this));
      }
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
        const item = this.actor?.items.get(target.dataset.itemId);
        uuid = item?.uuid;
      } else if ( !uuid && target.dataset.effectId ) {
        const { effectId, parentId } = target.dataset;
        const collection = parentId ? this.actor?.items.get(parentId).effects : this.actor?.effects;
        uuid = collection?.get(effectId)?.uuid;
      }
      if ( !uuid ) return;
      element.dataset.tooltip = `
        <section class="loading" data-uuid="${uuid}"><i class="fas fa-spinner fa-spin-pulse"></i></section>
      `;
      element.dataset.tooltipClass = "dnd5e2 dnd5e-tooltip item-tooltip";
      element.dataset.tooltipDirection ??= "LEFT";
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    _disableFields(form) {
      super._disableFields(form);
      form.querySelectorAll(".interface-only").forEach(input => input.disabled = false);
      form.querySelectorAll("dnd5e-checkbox:not(.interface-only)").forEach(input => input.disabled = true);
    }

    /* -------------------------------------------- */

    /** @override */
    _getSecretContent(secret) {
      const edit = secret.closest("[data-edit]")?.dataset.edit
        ?? secret.closest("[data-target]")?.dataset.target;
      if ( edit ) return foundry.utils.getProperty(this.document, edit);
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

    /** @inheritDoc */
    _onChangeTab(event, tabs, active) {
      super._onChangeTab(event, tabs, active);
      this.form.className = this.form.className.replace(/tab-\w+/g, "");
      this.form.classList.add(`tab-${active}`);
    }

    /* -------------------------------------------- */

    /**
     * Handle creating a new embedded child.
     * @returns {any}
     * @protected
     * @abstract
     */
    _onCreateChild() {}

    /* -------------------------------------------- */

    /**
     * Handle toggling an Item's description.
     * @param {PointerEvent} event  The triggering event.
     * @protected
     */
    async _onToggleDescription(event) {
      const target = event.currentTarget;
      const icon = target.querySelector(":scope > i");
      const row = target.closest("[data-uuid]");
      const summary = row.querySelector(":scope > .item-description > .wrapper");
      const { uuid } = row.dataset;
      const item = await fromUuid(uuid);
      if ( !item ) return;

      const expanded = this._expanded.has(item.id);
      if ( expanded ) {
        summary.parentElement.addEventListener("transitionend", () => {
          if ( row.classList.contains("collapsed") ) summary.querySelector(".item-summary")?.remove();
        }, { once: true });
        this._expanded.delete(item.id);
      } else {
        const context = await item.getChatData({ secrets: item.isOwner });
        const content = await renderTemplate("systems/dnd5e/templates/items/parts/item-summary.hbs", context);
        summary.querySelectorAll(".item-summary").forEach(el => el.remove());
        summary.insertAdjacentHTML("beforeend", content);
        await new Promise(resolve => { requestAnimationFrame(resolve); });
        this._expanded.add(item.id);
      }

      row.classList.toggle("collapsed", expanded);
      icon.classList.toggle("fa-compress", !expanded);
      icon.classList.toggle("fa-expand", expanded);
    }

    /* -------------------------------------------- */

    /** @override */
    _updateSecret(secret, content) {
      const edit = secret.closest("[data-edit]")?.dataset.edit
        ?? secret.closest("[data-target]")?.dataset.target;
      if ( edit ) return this.document.update({ [edit]: content });
    }
  };
}
