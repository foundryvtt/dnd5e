import EmbeddableDocument from "./mixins/embeddable.mjs";

/**
 * Extend the base RollTable class to implement system-specific logic.
 */
export default class RollTable5e extends EmbeddableDocument(foundry.documents.RollTable) {}
