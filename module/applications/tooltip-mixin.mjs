/**
 * A mixin for applications to enable rendering directly to a tooltip.
 * @param {typeof Application} Base
 * @returns {typeof Application}
 */
export default function TooltipMixin(Base) {
  return class extends Base {
    /**
     * Render this view as a tooltip rather than a whole window.
     * @param {HTMLElement} element  The element to which the tooltip should be attached.
     * @param {object} [options={}]  Additional options to use when configuring the tooltip.
     */
    async renderTooltip(element, options={}) {
      this.options.popOut = false;

      const states = Application.RENDER_STATES;
      this._priorState = this._state;
      if ( [states.CLOSING, states.RENDERING].includes(this._state) ) return;
      if ( [states.NONE, states.CLOSED, states.ERROR].includes(this._state) ) {
        console.log(`${vtt} | Rendering ${this.constructor.name}`);
      }
      this._state = states.RENDERING;

      const data = await this.getData(this.options);
      const html = await this._renderInner(data);
      this._activateCoreListeners(html);
      this.activateListeners(html);

      for ( let cls of this.constructor._getInheritanceChain() ) {
        Hooks.callAll(`render${cls.name}`, this, html, data);
      }

      game.tooltip.activate(element, { content: html[0], cssClass: this.options.classes.join(" "), ...options });
      this._element = html;
      this._state = Application.RENDER_STATES.RENDERED;
      this._tooltip = this._element.closest('[role="tooltip"]')?.[0];
    }

    /* -------------------------------------------- */

    /** @inheritdoc */
    async close(options={}) {
      super.close(options);
      if ( this._tooltip?.classList.contains("locked-tooltip") ) {
        game.tooltip.dismissLockedTooltip(this._tooltip);
      } else {
        game.tooltip.deactivate();
      }
    }
  };
}
