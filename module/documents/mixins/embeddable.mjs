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
      const figcaption = element.querySelector(":scope > figure.content-embed > figcaption:has(cite, .embed-caption)");
      const citation = figcaption?.querySelector(":scope > cite")
        ?? element.querySelector(":scope > figure.content-embed > cite");
      const caption = figcaption?.querySelector(":scope > .embed-caption");
      const originalElement = caption && ((caption.innerText === this.name) || (caption.innerText === config.label))
        ? caption : citation;

      // Headers use tag provided, inline uses <span>, any others are invalid
      const nameStyle = String(config.nameStyle);
      const tagName = /^h[1-6]$/i.test(nameStyle) ? nameStyle : nameStyle === "inline" ? "span" : null;
      if ( !tagName ) return element;

      // Create the new name element
      const nameElement = document.createElement(tagName);
      nameElement.classList.add("embed-name");
      if ( originalElement ) {
        if ( (originalElement === citation) && config.label ) {
          const link = originalElement.querySelector("a");
          const icon = originalElement.querySelector("i");
          link.innerText = config.label;
          link.prepend(icon);
        }
        nameElement.replaceChildren(...originalElement.childNodes);
        originalElement.remove();
      }
      else nameElement.innerText = config.label || this.name;

      // Place headers as the first child, place inline names inside first paragraph
      let prepend = element.querySelector("figure.content-embed") ?? element;
      if ( config.nameStyle === "inline" ) {
        prepend = element
          .querySelector(":scope > figure.content-embed > div > p, :scope > figure.content-embed > p") ?? prepend;
      }
      prepend.prepend(nameElement);

      // Remove original <figcaption> if empty
      if ( figcaption && !figcaption.hasChildNodes() ) figcaption.remove();

      return element;
    }
  }
  return EmbeddableDocument;
}
