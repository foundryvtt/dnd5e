import EffectsElement from "./effects.mjs";
import InventoryElement from "./inventory.mjs";

window.customElements.define("dnd5e-effects", EffectsElement);
window.customElements.define("dnd5e-inventory", InventoryElement);

export { EffectsElement, InventoryElement };
