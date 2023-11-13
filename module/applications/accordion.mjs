/**
 * @typedef {object} AccordionConfiguration
 * @property {string} headingSelector    The CSS selector that identifies accordion headers in the given markup.
 * @property {string} contentSelector    The CSS selector that identifies accordion content in the given markup. This
 *                                       can match content within the heading element, or sibling to the heading
 *                                       element, with priority given to the former.
 * @property {boolean} [collapseOthers]  Automatically collapses the other headings in this group when one heading is
 *                                       clicked.
 */

/**
 * A class responsible for augmenting markup with an accordion effect.
 * @param {AccordionConfiguration} config  Configuration options.
 */
export default class Accordion {
  constructor(config) {
    config.contentSelector = `${config.contentSelector}:not(.accordion-content)`;
    this.#config = config;
  }

  /**
   * Configuration options.
   * @type {AccordionConfiguration}
   */
  #config;

  /**
   * A mapping of heading elements to content elements.
   * @type {Map<HTMLElement, HTMLElement>}
   */
  #sections = new Map();

  /**
   * A mapping of heading elements to any ongoing transition effect functions.
   * @type {Map<HTMLElement, Function>}
   */
  #ongoing = new Map();

  /**
   * Record the state of collapsed sections.
   * @type {boolean[]}
   */
  #collapsed;

  /* -------------------------------------------- */

  /**
   * Augment the given markup with an accordion effect.
   * @param {HTMLElement} root  The root HTML node.
   */
  async bind(root) {
    const firstBind = this.#sections.size < 1;
    if ( firstBind ) this.#collapsed = [];
    this.#sections = new Map();
    this.#ongoing = new Map();
    const { headingSelector, contentSelector } = this.#config;
    let collpasedIndex = 0;
    for ( const heading of root.querySelectorAll(headingSelector) ) {
      const content = heading.querySelector(contentSelector) ?? heading.parentElement.querySelector(contentSelector);
      if ( !content ) continue;
      const wrapper = document.createElement("div");
      wrapper.classList.add("accordion");
      heading.before(wrapper);
      wrapper.append(heading, content);
      this.#sections.set(heading, content);
      if ( firstBind ) this.#collapsed.push(this.#collapsed.length > 0);
      else if ( this.#collapsed[collpasedIndex] ) wrapper.classList.add("collapsed");
      heading.classList.add("accordion-heading");
      content.classList.add("accordion-content");
      heading.addEventListener("click", this._onClickHeading.bind(this));
      collpasedIndex++;
    }
    await new Promise(resolve => { setTimeout(resolve, 0); }); // Allow re-paint.
    this._restoreCollapsedState();
  }

  /* -------------------------------------------- */

  /**
   * Handle clicking an accordion heading.
   * @param {PointerEvent} event  The triggering event.
   * @protected
   */
  _onClickHeading(event) {
    if ( event.target.closest("a") ) return;
    const heading = event.currentTarget;
    const content = this.#sections.get(heading);
    if ( !content ) return;
    event.preventDefault();
    const collapsed = heading.parentElement.classList.contains("collapsed");
    if ( collapsed ) this._onExpandSection(heading, content);
    else this._onCollapseSection(heading, content);
  }

  /* -------------------------------------------- */

  /**
   * Handle expanding a section.
   * @param {HTMLElement} heading             The section heading.
   * @param {HTMLElement} content             The section content.
   * @param {object} [options]
   * @param {boolean} [options.animate=true]  Whether to animate the expand effect.
   * @protected
   */
  async _onExpandSection(heading, content, { animate=true }={}) {
    this.#cancelOngoing(heading);

    if ( this.#config.collapseOthers ) {
      for ( const [otherHeading, otherContent] of this.#sections.entries() ) {
        if ( (heading !== otherHeading) && !otherHeading.parentElement.classList.contains("collapsed") ) {
          this._onCollapseSection(otherHeading, otherContent, { animate });
        }
      }
    }

    heading.parentElement.classList.remove("collapsed");
    if ( animate ) content.style.height = "0";
    else {
      content.style.height = `${content._fullHeight}px`;
      return;
    }
    await new Promise(resolve => { setTimeout(resolve, 0); }); // Allow re-paint.
    const onEnd = this._onEnd.bind(this, heading, content);
    this.#ongoing.set(heading, onEnd);
    content.addEventListener("transitionend", onEnd, { once: true });
    content.style.height = `${content._fullHeight}px`;
  }

  /* -------------------------------------------- */

  /**
   * Handle collapsing a section.
   * @param {HTMLElement} heading             The section heading.
   * @param {HTMLElement} content             The section content.
   * @param {object} [options]
   * @param {boolean} [options.animate=true]  Whether to animate the collapse effect.
   * @protected
   */
  async _onCollapseSection(heading, content, { animate=true }={}) {
    this.#cancelOngoing(heading);
    const { height } = content.getBoundingClientRect();
    heading.parentElement.classList.add("collapsed");
    content._fullHeight = height;
    if ( animate ) content.style.height = `${height}px`;
    else {
      content.style.height = "0";
      return;
    }
    await new Promise(resolve => { setTimeout(resolve, 0); }); // Allow re-paint.
    const onEnd = this._onEnd.bind(this, heading, content);
    this.#ongoing.set(heading, onEnd);
    content.addEventListener("transitionend", onEnd, { once: true });
    content.style.height = "0";
  }

  /* -------------------------------------------- */

  /**
   * A function to invoke when the height transition has ended.
   * @param {HTMLElement} heading  The section heading.
   * @param {HTMLElement} content  The section content.
   * @protected
   */
  _onEnd(heading, content) {
    content.style.height = "";
    this.#ongoing.delete(heading);
  }

  /* -------------------------------------------- */

  /**
   * Cancel an ongoing effect.
   * @param {HTMLElement} heading  The section heading.
   */
  #cancelOngoing(heading) {
    const ongoing = this.#ongoing.get(heading);
    const content = this.#sections.get(heading);
    if ( ongoing && content ) content.removeEventListener("transitionend", ongoing);
  }

  /* -------------------------------------------- */

  /**
   * Save the accordion state.
   * @protected
   */
  _saveCollapsedState() {
    this.#collapsed = [];
    for ( const heading of this.#sections.keys() ) {
      this.#collapsed.push(heading.parentElement.classList.contains("collapsed"));
    }
  }

  /* -------------------------------------------- */

  /**
   * Restore the accordion state.
   * @protected
   */
  _restoreCollapsedState() {
    const entries = Array.from(this.#sections.entries());
    for ( let i = 0; i < entries.length; i++ ) {
      const collapsed = this.#collapsed[i];
      const [heading, content] = entries[i];
      if ( collapsed ) this._onCollapseSection(heading, content, { animate: false });
    }
  }
}
