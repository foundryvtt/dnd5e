import TargetsField from "../../data/chat-message/fields/targets-field.mjs";

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
     * Whether the associated chat message recorded any targets.
     * @type {boolean}
     */
    get hasRecordedTargets() {
      return !!this.chatMessage?.system?.targets?.length;
    }

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
      return this.#targetingMode;
    }

    set targetingMode(mode) {
      if ( !this.hasRecordedTargets ) mode = "selected";
      this.#targetingMode = mode;
      this._refreshTargetMode();

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

    /**
     * The current targeting mode.
     * @type {"targeted"|"selected"}
     */
    #targetingMode = "targeted";

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
      this.targetSourceControl = this._buildTargetSourceControl();

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
      const mode = game.user.isGM ? this.targetingMode : "selected";
      switch ( mode ) {
        case "targeted":
          for ( const descriptor of this.chatMessage?.system?.targets ?? [] ) {
            const { actor, token } = TargetsField.resolve(descriptor);
            if ( actor || token ) {
              targetedTokens.set(token?.document.uuid ?? actor?.uuid, token?.name ?? descriptor.name);
            }
          }
          break;
        case "selected":
          canvas.tokens?.controlled?.forEach(t => {
            if ( t.actor ) targetedTokens.set(t.document.uuid, t.name);
          });
          break;
      }
      const targets = Array.from(targetedTokens.entries())
        .map(([uuid, name]) => this.buildTargetListEntry({ uuid, name }))
        .filter(t => t);
      if ( targets.length ) this.targetList.replaceChildren(...targets);
      else {
        const li = document.createElement("li");
        li.classList.add("none", "pill", "target", "transparent");
        li.innerText = _loc("DND5E.Tokens.NoTargets");
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

    /**
     * Build the control used to switch between target sources.
     * @returns {HTMLElement}
     * @protected
     */
    _buildTargetSourceControl() {
      const control = document.createElement("div");
      control.classList.add("target-source-control");
      control.innerHTML = `
        <button type="button" class="unbutton" data-mode="targeted" aria-pressed="false">
          <i class="fa-solid fa-bullseye" inert></i> ${_loc("DND5E.Tokens.Targeted")}
        </button>
        <button type="button" class="unbutton" data-mode="selected" aria-pressed="false">
          <i class="fa-solid fa-expand" inert></i> ${_loc("DND5E.Tokens.Selected")}
        </button>
      `;
      control.querySelectorAll("button").forEach(b =>
        b.addEventListener("click", this._onChangeTargetMode.bind(this))
      );
      if ( !this.hasRecordedTargets ) control.hidden = true;
      return control;
    }

    /* -------------------------------------------- */

    /**
     * Update the target source control to reflect the current targeting mode.
     * @protected
     */
    _refreshTargetMode() {
      for ( const button of this.targetSourceControl.querySelectorAll("[data-mode]") ) {
        button.ariaPressed = `${button.dataset.mode === this.targetingMode}`;
      }
    }

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
