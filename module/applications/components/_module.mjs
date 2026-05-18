import ActivitiesElement from "./activities.mjs";
import AdoptedStyleSheetMixin from "./adopted-stylesheet-mixin.mjs";
import CheckboxElement from "./checkbox.mjs";
import CopyableTextElement from "./copyable-text.mjs";
import DamageApplicationElement from "./damage-application.mjs";
import DoubleRangePickerElement from "./double-range-picker.mjs";
import EffectApplicationElement from "./effect-application.mjs";
import EffectsElement from "./effects.mjs";
import EnchantmentApplicationElement from "./enchantment-application.mjs";
import FiligreeBoxElement from "./filigree-box.mjs";
import FilterStateElement from "./filter-state.mjs";
import IconElement from "./icon.mjs";
import InventoryElement from "./inventory.mjs";
import ItemListControlsElement from "./item-list-controls.mjs";
import ProficiencyCycleElement from "./proficiency-cycle.mjs";
import SlideToggleElement from "./slide-toggle.mjs";

window.customElements.define(CopyableTextElement.tagName, CopyableTextElement);
window.customElements.define(DamageApplicationElement.tagName, DamageApplicationElement);
window.customElements.define(ActivitiesElement.tagName, ActivitiesElement);
window.customElements.define(CheckboxElement.tagName, CheckboxElement);
window.customElements.define(DoubleRangePickerElement.tagName, DoubleRangePickerElement);
window.customElements.define(EffectsElement.tagName, EffectsElement);
window.customElements.define(IconElement.tagName, IconElement);
window.customElements.define(InventoryElement.tagName, InventoryElement);
window.customElements.define(EffectApplicationElement.tagName, EffectApplicationElement);
window.customElements.define(EnchantmentApplicationElement.tagName, EnchantmentApplicationElement);
window.customElements.define(FiligreeBoxElement.tagName, FiligreeBoxElement);
window.customElements.define(FilterStateElement.tagName, FilterStateElement);
window.customElements.define(ItemListControlsElement.tagName, ItemListControlsElement);
window.customElements.define(ProficiencyCycleElement.tagName, ProficiencyCycleElement);
window.customElements.define(SlideToggleElement.tagName, SlideToggleElement);

export {
  ActivitiesElement, AdoptedStyleSheetMixin, CopyableTextElement, CheckboxElement, DamageApplicationElement,
  DoubleRangePickerElement, EffectApplicationElement, EffectsElement, EnchantmentApplicationElement,
  FiligreeBoxElement, FilterStateElement, IconElement, InventoryElement, ItemListControlsElement,
  ProficiencyCycleElement, SlideToggleElement
};
