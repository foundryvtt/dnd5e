/**
 * Adds functionality to a custom HTML element for displaying a target selector and displaying targets.
 * @param {typeof HTMLElement} Base  The base class being mixed.
 * @returns {typeof TargetedApplicationElement}
 */
export default function TargetedApplicationMixin(Base) {
  return class TargetedApplicationElement extends Base {
    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /**
     * Currently registered hook for monitoring for changes to selected tokens.
     * @type {number|null}
     */
    selectedTokensHook = null;

    /* -------------------------------------------- */

    /**
     * Whether to rebuild the target list.
     * @type {boolean|void}
     */
    get shouldBuildTargetList() {
      return !!this.targetList;
    }

    /* -------------------------------------------- */

    /**
     * Currently target selection mode.
     * @type {"targeted"|"selected"}
     */
    get targetingMode() {
      if ( this.targetSourceControl.hidden ) return "selected";
      return this.targetSourceControl.querySelector('[aria-pressed="true"]')?.dataset.mode ?? "targeted";
    }

    set targetingMode(mode) {
      if ( this.targetSourceControl.hidden ) mode = "selected";
      const toPress = this.targetSourceControl.querySelector(`[data-mode="${mode}"]`);
      const currentlyPressed = this.targetSourceControl.querySelector('[aria-pressed="true"]');
      if ( currentlyPressed ) currentlyPressed.ariaPressed = false;
      toPress.ariaPressed = true;

      this.buildTargetsList();
      if ( (mode === "targeted") && (this.selectedTokensHook !== null) ) {
        Hooks.off("controlToken", this.selectedTokensHook);
        this.selectedTokensHook = null;
      } else if ( (mode === "selected") && (this.selectedTokensHook === null) ) {
        this.selectedTokensHook = Hooks.on("controlToken", foundry.utils.debounce(() => this.buildTargetsList(), 50));
      }
    }

    /* -------------------------------------------- */

    /**
     * The list of application targets.
     * @type {HTMLUListElement}
     */
    targetList;

    /* -------------------------------------------- */

    /**
     * The controls for selecting target source mode.
     * @type {HTMLElement}
     */
    targetSourceControl;

    /* -------------------------------------------- */
    /*  Life-Cycle                                  */
    /* -------------------------------------------- */

    /** @inheritDoc */
    disconnectedCallback() {
      super.disconnectedCallback?.();
      if ( this.selectedTokensHook ) Hooks.off("controlToken", this.selectedTokensHook);
    }

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    /**
     * Return the HTML elements needed to build the target source control and target list.
     * @returns {HTMLElement[]}
     */
    buildTargetContainer() {
      this.targetSourceControl = document.createElement("div");
      this.targetSourceControl.classList.add("target-source-control");
      this.targetSourceControl.innerHTML = `
        <button type="button" class="unbutton" data-mode="targeted" aria-pressed="false">
          <i class="fa-solid fa-bullseye" inert></i> ${game.i18n.localize("DND5E.Tokens.Targeted")}
        </button>
        <button type="button" class="unbutton" data-mode="selected" aria-pressed="false">
          <i class="fa-solid fa-expand" inert></i> ${game.i18n.localize("DND5E.Tokens.Selected")}
        </button>
      `;
      this.targetSourceControl.querySelectorAll("button").forEach(b =>
        b.addEventListener("click", this._onChangeTargetMode.bind(this))
      );
      if ( !this.chatMessage?.getFlag("dnd5e", "targets")?.length ) this.targetSourceControl.hidden = true;

      this.targetList = document.createElement("ul");
      this.targetList.classList.add("targets", "unlist");

      return [this.targetSourceControl, this.targetList];
    }

    /* -------------------------------------------- */

    /**
     * Build a list of targeted tokens based on current mode & replace any existing targets.
     */
    buildTargetsList() {
      if ( this.shouldBuildTargetList === false ) return;
      const targetedTokens = new Map();
      switch ( this.targetingMode ) {
        case "targeted":
          this.chatMessage?.getFlag("dnd5e", "targets")?.forEach(t => targetedTokens.set(t.uuid, t.name));
          break;
        case "selected":
          canvas.tokens?.controlled?.forEach(t => {
            if ( t.actor ) targetedTokens.set(t.actor.uuid, t.name);
          });
          break;
      }
      const targets = Array.from(targetedTokens.entries())
        .map(([uuid, name]) => this.buildTargetListEntry({ uuid, name }))
        .filter(t => t);
      if ( targets.length ) this.targetList.replaceChildren(...targets);
      else {
        const li = document.createElement("li");
        li.classList.add("none");
        li.innerText = game.i18n.localize(`DND5E.Tokens.None${this.targetingMode.capitalize()}`);
        this.targetList.replaceChildren(li);
      }
    }

    /* -------------------------------------------- */

    /**
     * Create a list entry for a single target.
     * @param {object} data
     * @param {string} data.uuid  UUID of the targeted actor.
     * @param {string} data.name  Name of the targeted token.
     * @returns {HTMLLIElement|void}
     * @abstract
     */
    buildTargetListEntry({ uuid, name }) {}

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    /**
     * Handle clicking on the target mode buttons.
     * @param {PointerEvent} event  Triggering click event.
     */
    async _onChangeTargetMode(event) {
      event.preventDefault();
      this.targetingMode = event.currentTarget.dataset.mode;
    }
  };
}
