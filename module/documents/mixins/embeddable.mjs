/**
 * Mixin used to add additional embedding options.
 * @template {foundry.abstract.Document|PseudoDocument} T
 * @param {typeof T} Base  The base document class to wrap.
 * @returns {typeof EmbeddableDocument}
 * @mixin
 */
export default function EmbeddableDocumentMixin(Base) {
  class EmbeddableDocument extends Base {
    /** @inheritDoc */
    async _createFigureEmbed(content, config, options) {
      const element = await super._createFigureEmbed(content, config, options);
      if ( !config.nameStyle ) return element;

      // Use citation if present, use caption if it equals the document's name, otherwise create a new element
      const figcaption = element.querySelector("figcaption:has(cite, .embed-caption)");
      const citation = figcaption.querySelector(":scope > cite");
      const caption = figcaption.querySelector(":scope > .embed-caption");
      const originalElement = caption && (caption.innerText === this.name) ? caption : citation;

      // Headers use tag provided, inline uses <span>, any others are invalid
      const tagName = config.nameStyle.match(/h\d/i) ? config.nameStyle : config.nameStyle === "inline" ? "span" : null;
      if ( !tagName ) return element;

      // Create the new name element
      const nameElement = document.createElement(tagName);
      nameElement.classList.add("embed-name");
      if ( originalElement ) {
        nameElement.replaceChildren(...originalElement.childNodes);
        originalElement.remove();
      }
      else nameElement.innerText = this.name;

      // Place headers as the first child, place inline names inside first paragraph
      let prepend = element.querySelector("figure.content-embed") ?? element;
      if ( config.nameStyle === "inline" ) prepend = element.querySelector(".content-embed p") ?? prepend;
      prepend.prepend(nameElement);

      // Remove original <figcaption> if empty
      if ( !figcaption.hasChildNodes() ) figcaption.remove();

      return element;
    }
  }
  return EmbeddableDocument;
}
