import EffectsElement from "./effects.mjs";
import FiligreeBoxElement from "./filigree-box.mjs";
import InventoryElement from "./inventory.mjs";
import ProficiencyCycleElement from "./proficiency-cycle.mjs";
import SlideToggleElement from "./slide-toggle.mjs";

window.customElements.define("dnd5e-effects", EffectsElement);
window.customElements.define("dnd5e-inventory", InventoryElement);
window.customElements.define("filigree-box", FiligreeBoxElement);
window.customElements.define("proficiency-cycle", ProficiencyCycleElement);
window.customElements.define("slide-toggle", SlideToggleElement);

export { EffectsElement, InventoryElement, ProficiencyCycleElement, SlideToggleElement };
