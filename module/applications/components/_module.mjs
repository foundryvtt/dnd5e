import DamageApplicationElement from "./damage-application.mjs";
import EffectsElement from "./effects.mjs";
import EnchantmentApplicationElement from "./enchantment-application.mjs";
import FiligreeBoxElement from "./filigree-box.mjs";
import IconElement from "./icon.mjs";
import InventoryElement from "./inventory.mjs";
import ItemListControlsElement from "./item-list-controls.mjs";
import ProficiencyCycleElement from "./proficiency-cycle.mjs";
import SlideToggleElement from "./slide-toggle.mjs";
import AdoptedStyleSheetMixin from "./adopted-stylesheet-mixin.mjs";

window.customElements.define("damage-application", DamageApplicationElement);
window.customElements.define("dnd5e-effects", EffectsElement);
window.customElements.define("dnd5e-icon", IconElement);
window.customElements.define("dnd5e-inventory", InventoryElement);
window.customElements.define("enchantment-application", EnchantmentApplicationElement);
window.customElements.define("filigree-box", FiligreeBoxElement);
window.customElements.define("item-list-controls", ItemListControlsElement);
window.customElements.define("proficiency-cycle", ProficiencyCycleElement);
window.customElements.define("slide-toggle", SlideToggleElement);

export {
  AdoptedStyleSheetMixin, DamageApplicationElement, EffectsElement, EnchantmentApplicationElement, IconElement,
  InventoryElement, ItemListControlsElement, FiligreeBoxElement, ProficiencyCycleElement, SlideToggleElement
};
