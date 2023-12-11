import EffectsElement from "./effects.mjs";
import InventoryElement from "./inventory.mjs";
import SlideToggleElement from "./slide-toggle.mjs";

window.customElements.define("dnd5e-effects", EffectsElement);
window.customElements.define("dnd5e-inventory", InventoryElement);
window.customElements.define("slide-toggle", SlideToggleElement);

export { EffectsElement, InventoryElement };
