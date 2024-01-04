import EffectsElement from "./effects.mjs";
import FiligreeBoxElement from "./filigree-box.mjs";
import IconElement from "./icon.mjs";
import InventoryElement from "./inventory.mjs";
import ItemListControlsElement from "./item-list-controls.mjs";
import ProficiencyCycleElement from "./proficiency-cycle.mjs";
import SlideToggleElement from "./slide-toggle.mjs";

window.customElements.define("dnd5e-effects", EffectsElement);
window.customElements.define("dnd5e-icon", IconElement);
window.customElements.define("dnd5e-inventory", InventoryElement);
window.customElements.define("item-list-controls", ItemListControlsElement);
window.customElements.define("filigree-box", FiligreeBoxElement);
window.customElements.define("proficiency-cycle", ProficiencyCycleElement);
window.customElements.define("slide-toggle", SlideToggleElement);

export {
  EffectsElement, IconElement, InventoryElement, ItemListControlsElement, FiligreeBoxElement, ProficiencyCycleElement,
  SlideToggleElement
};
