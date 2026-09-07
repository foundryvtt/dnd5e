import EmbeddableDocument from "./mixins/embeddable.mjs";

/**
 * Extended version of core's roll table document with additional embedding support.
 */
export default class RollTable5e extends EmbeddableDocument(RollTable) {}
