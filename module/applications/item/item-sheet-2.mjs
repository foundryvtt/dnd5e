import UsesField from "../../data/shared/uses-field.mjs";
import ContextMenu5e from "../context-menu.mjs";
import ItemSheet5e from "./item-sheet.mjs";
import ItemSheetV2Mixin from "./sheet-v2-mixin.mjs";

/**
 * V2 Item sheet implementation.
 */
export default class ItemSheet5e2 extends ItemSheetV2Mixin(ItemSheet5e) {
  static get defaultOptions() {
    const options = foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e2", "sheet", "item"],
      width: 500,
      height: "auto",
      resizable: false,
      scrollY: [".tab.active"],
      elements: { effects: "dnd5e-effects" },
      legacyDisplay: false,
      contextMenu: ContextMenu5e
    });
    options.dragDrop.push({ dragSelector: ".activity[data-activity-id]", dropSelector: "form" });
    return options;
  }

  /* -------------------------------------------- */

  /** @override */
  get template() {
    return "systems/dnd5e/templates/items/item-sheet-2.hbs";
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async getData(options) {
    const context = await super.getData(options);
    const { activities, building, craft, order, spellcasting, type } = this.item.system;
    const target = this.item.type === "spell" ? this.item.system.target : null;

    // Effects
    for ( const category of Object.values(context.effects) ) {
      category.effects = await category.effects.reduce(async (arr, effect) => {
        effect.updateDuration();
        const { id, name, img, disabled, duration } = effect;
        const source = await effect.getSource();
        arr = await arr;
        arr.push({
          id, name, img, disabled, duration, source,
          parent,
          durationParts: duration.remaining ? duration.label.split(", ") : [],
          hasTooltip: true
        });
        return arr;
      }, []);
    }

    // Hit Dice
    context.hitDieTypes = CONFIG.DND5E.hitDieTypes.map(d => ({ label: d, value: d }));

    // If using modern rules, do not show redundant artificer progression unless it is already selected.
    context.spellProgression = { ...CONFIG.DND5E.spellProgression };
    if ( (game.settings.get("dnd5e", "rulesVersion") === "modern") && (spellcasting?.progression !== "artificer") ) {
      delete context.spellProgression.artificer;
    }
    context.spellProgression = Object.entries(context.spellProgression).map(([value, label]) => ({ value, label }));

    // Activation
    context.activationTypes = [
      ...Object.entries(CONFIG.DND5E.activityActivationTypes).map(([value, { label, group }]) => {
        return { value, label, group };
      }),
      { value: "", label: "DND5E.NoneActionLabel" }
    ];

    // Targets
    context.targetTypes = [
      ...Object.entries(CONFIG.DND5E.individualTargetTypes).map(([value, { label }]) => {
        return { value, label, group: "DND5E.TargetTypeIndividual" };
      }),
      ...Object.entries(CONFIG.DND5E.areaTargetTypes).map(([value, { label }]) => {
        return { value, label, group: "DND5E.TargetTypeArea" };
      })
    ];
    context.scalarTarget = target?.affects?.type
      && (CONFIG.DND5E.individualTargetTypes[target.affects.type]?.scalar !== false);
    context.affectsPlaceholder = game.i18n.localize(`DND5E.TARGET.Count.${target?.template?.type ? "Every" : "Any"}`);

    // Range
    context.rangeTypes = [
      ...Object.entries(CONFIG.DND5E.rangeTypes).map(([value, label]) => ({ value, label })),
      ...Object.entries(CONFIG.DND5E.movementUnits).map(([value, { label }]) => {
        return { value, label, group: "DND5E.RangeDistance" };
      })
    ];

    // Duration
    context.durationUnits = [
      ...Object.entries(CONFIG.DND5E.specialTimePeriods).map(([value, label]) => ({ value, label })),
      ...Object.entries(CONFIG.DND5E.scalarTimePeriods).map(([value, label]) => {
        return { value, label, group: "DND5E.DurationTime" };
      }),
      ...Object.entries(CONFIG.DND5E.permanentTimePeriods).map(([value, label]) => {
        return { value, label, group: "DND5E.DurationPermanent" };
      })
    ];

    // Templates
    context.dimensions = target?.template?.dimensions;

    // Equipment
    context.equipmentTypes = [
      ...Object.entries(CONFIG.DND5E.miscEquipmentTypes).map(([value, label]) => ({ value, label })),
      ...Object.entries(CONFIG.DND5E.armorTypes).map(([value, label]) => ({ value, label, group: "DND5E.Armor" }))
    ];

    // Limited Uses
    context.data = { uses: context.source.uses };
    context.hasLimitedUses = this.item.system.hasLimitedUses;
    context.recoveryPeriods = CONFIG.DND5E.limitedUsePeriods.recoveryOptions;
    context.recoveryTypes = [
      { value: "recoverAll", label: "DND5E.USES.Recovery.Type.RecoverAll" },
      { value: "loseAll", label: "DND5E.USES.Recovery.Type.LoseAll" },
      { value: "formula", label: "DND5E.USES.Recovery.Type.Formula" }
    ];
    context.usesRecovery = (context.source.uses?.recovery ?? []).map((data, index) => ({
      data,
      fields: context.fields.uses.fields.recovery.element.fields,
      prefix: `system.uses.recovery.${index}.`,
      source: context.source.uses.recovery[index] ?? data,
      formulaOptions: data.period === "recharge" ? UsesField.rechargeOptions : null
    }));

    // Activities
    context.activities = (activities ?? []).filter(a => {
      return CONFIG.DND5E.activityTypes[a.type]?.configurable !== false;
    }).map(activity => {
      const { _id: id, name, img, sort } = activity.prepareSheetContext();
      return {
        id, name, sort,
        img: { src: img, svg: img?.endsWith(".svg") }
      };
    });

    // Facilities
    if ( this.item.type === "facility" ) {
      context.orders = Object.entries(CONFIG.DND5E.facilities.orders).reduce((obj, [value, config]) => {
        const { label, basic, hidden } = config;
        if ( hidden ) return obj;
        // TODO: More hard-coding that we can potentially avoid.
        if ( value === "build" ) {
          if ( !building.built ) obj.executable.push({ value, label });
          return obj;
        }
        if ( value === "change" ) {
          if ( type.subtype === "garden" ) obj.executable.push({ value, label });
          return obj;
        }
        if ( type.value === "basic" ) {
          if ( !building.built ) return obj;
          if ( basic ) obj.executable.push({ value, label });
        } else if ( (type.value === "special") && !basic ) {
          obj.available.push({ value, label });
          if ( (value === order) || (value === "maintain") ) obj.executable.push({ value, label });
        }
        return obj;
      }, { available: [], executable: [] });
    }

    if ( (type?.value === "special") && ((order === "craft") || (order === "harvest")) ) {
      context.canCraft = true;
      context.isHarvesting = order === "harvest";
      const crafting = await fromUuid(craft.item);
      if ( crafting ) {
        context.craft = {
          img: crafting.img,
          name: crafting.name,
          contentLink: crafting.toAnchor().outerHTML
        };
      }
    }

    // Cover
    context.coverOptions = Object.entries(CONFIG.DND5E.cover).map(([value, label]) => ({ value, label }));

    // Source Class
    context.spellcastingClasses = Object.entries(this.item.parent?.spellcastingClasses ?? {}).map(([value, cls]) => {
      return { value, label: cls.name };
    });

    return context;
  }

  /* -------------------------------------------- */

  /** @override */
  _getItemOverrides() {
    return [];
  }

  /* -------------------------------------------- */

  /** @override */
  _getItemAdvancementTags(advancement) {
    if ( this.item.isEmbedded && (this._mode !== this.constructor.MODES.EDIT) ) return [];
    const tags = [];
    if ( advancement.classRestriction === "primary" ) {
      tags.push({
        label: "DND5E.AdvancementClassRestrictionPrimary",
        icon: "systems/dnd5e/icons/svg/original-class.svg"
      });
    } else if ( advancement.classRestriction === "secondary" ) {
      tags.push({
        label: "DND5E.AdvancementClassRestrictionSecondary",
        icon: "systems/dnd5e/icons/svg/multiclass.svg"
      });
    }
    return tags;
  }

  /* -------------------------------------------- */
  /*  Event Listeners & Handlers                  */
  /* -------------------------------------------- */

  /** @inheritDoc */
  activateListeners(html) {
    super.activateListeners(html);

    for ( const control of html[0].querySelectorAll(".tab.advancement [data-context-menu]") ) {
      control.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        const { clientX, clientY } = event;
        event.currentTarget.closest("[data-id]").dispatchEvent(new PointerEvent("contextmenu", {
          view: window, bubbles: true, cancelable: true, clientX, clientY
        }));
      });
    }

    html.find(".activities .activity .name").on("click", this._onEditActivity.bind(this));

    if ( this.isEditable ) {
      html.find("button.control-button").on("click", this._onSheetAction.bind(this));
    }

    new ContextMenu5e(html[0], ".advancement-item[data-id]", [], {
      onOpen: target => dnd5e.documents.advancement.Advancement.onContextMenu(this.item, target), jQuery: false
    });
    new ContextMenu5e(html[0], ".activity[data-activity-id]", [], {
      onOpen: target => dnd5e.documents.activity.UtilityActivity.onContextMenu(this.item, target), jQuery: false
    });
  }

  /* -------------------------------------------- */

  /**
   * Create a new recovery profile.
   * @returns {Promise}
   * @protected
   */
  _onAddRecovery() {
    return this.submit({ updateData: { "system.uses.recovery": [...this.item.system.toObject().uses.recovery, {}] } });
  }

  /* -------------------------------------------- */

  /**
   * Delete an activity.
   * @param {HTMLElement} target  The deletion even target.
   * @returns {Promise|void}
   * @protected
   */
  _onDeleteActivity(target) {
    const { activityId } = target.closest("[data-activity-id]").dataset;
    const activity = this.item.system.activities.get(activityId);
    return activity?.deleteDialog();
  }

  /* -------------------------------------------- */

  /**
   * Delete a recovery profile.
   * @param {HTMLElement} target  The deletion event target.
   * @returns {Promise}
   * @protected
   */
  _onDeleteRecovery(target) {
    const recovery = this.item.system.toObject().uses.recovery;
    recovery.splice(target.closest("[data-index]").dataset.index, 1);
    return this.submit({ updateData: { "system.uses.recovery": recovery } });
  }

  /* -------------------------------------------- */

  /**
   * Edit an activity.
   * @param {PointerEvent} event  The triggering event.
   * @returns {Promise|void}
   * @protected
   */
  _onEditActivity(event) {
    const { activityId } = event.currentTarget.closest("[data-activity-id]").dataset;
    const activity = this.item.system.activities.get(activityId);
    return activity?.sheet?.render({ force: true });
  }

  /* -------------------------------------------- */

  /**
   * Handle removing the Item currently being crafted.
   * @returns {Promise}
   * @protected
   */
  _onRemoveCraft() {
    return this.submit({ updateData: { "system.craft": null } });
  }

  /* -------------------------------------------- */

  /**
   * Handle performing some sheet action.
   * @param {PointerEvent} event  The originating event.
   * @returns {Promise|void}
   * @protected
   */
  _onSheetAction(event) {
    const target = event.currentTarget;
    const { action } = target.dataset;
    switch ( action ) {
      case "addRecovery": return this._onAddRecovery();
      case "deleteActivity": return this._onDeleteActivity(target);
      case "deleteRecovery": return this._onDeleteRecovery(target);
      case "removeCraft": return this._onRemoveCraft();
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _updateObject(event, formData) {
    const expanded = foundry.utils.expandObject(formData);
    if ( foundry.utils.hasProperty(expanded, "uses.recovery") ) {
      formData.uses.recovery = Object.values(formData.uses.recovery);
    }
    return super._updateObject(event, formData);
  }

  /* -------------------------------------------- */
  /*  Drag & Drop                                 */
  /* -------------------------------------------- */

  /** @override */
  _onDragStart(event) {
    const { activityId } = event.target.closest(".activity[data-activity-id]")?.dataset ?? {};
    const activity = this.item.system.activities?.get(activityId);
    if ( !activity ) return super._onDragStart(event);
    event.dataTransfer.setData("text/plain", JSON.stringify(activity.toDragData()));
  }

  /* -------------------------------------------- */

  /**
   * Handle dropping an Activity onto the sheet.
   * @param {DragEvent} event       The drag event.
   * @param {object} transfer       The dropped data.
   * @param {object} transfer.data  The Activity data.
   * @protected
   */
  _onDropActivity(event, { data }) {
    const { _id: id, type } = data;
    const source = this.item.system.activities.get(id);

    // Reordering
    if ( source ) {
      const targetId = event.target.closest(".activity[data-activity-id]")?.dataset.activityId;
      const target = this.item.system.activities.get(targetId);
      if ( !target || (target === source) ) return;
      const siblings = this.item.system.activities.filter(a => a._id !== id);
      const sortUpdates = SortingHelpers.performIntegerSort(source, { target, siblings });
      const updateData = Object.fromEntries(sortUpdates.map(({ target, update }) => {
        return [target._id, { sort: update.sort }];
      }));
      this.item.update({ "system.activities": updateData });
    }

    // Copying
    else {
      delete data._id;
      this.item.createActivity(type, data, { renderSheet: false });
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle dropping another item onto this item.
   * @param {DragEvent} event  The drag event.
   * @param {object} data      The dropped data.
   */
  async _onDropItem(event, data) {
    const item = await Item.implementation.fromDropData(data);
    if ( (item?.type === "spell") && this.item.system.activities ) this._onDropSpell(event, item);
    else this._onDropAdvancement(event, data);
  }

  /* -------------------------------------------- */

  /**
   * Handle creating a "Cast" activity when dropping a spell.
   * @param {DragEvent} event  The drag event.
   * @param {Item5e} item      The dropped item.
   */
  _onDropSpell(event, item) {
    this.item.createActivity("cast", { spell: { uuid: item.uuid } });
  }

  /* -------------------------------------------- */
  /*  Filtering                                   */
  /* -------------------------------------------- */

  /**
   * Filter child embedded ActiveEffects based on the current set of filters.
   * @param {string} collection    The embedded collection name.
   * @param {Set<string>} filters  Filters to apply to the children.
   * @returns {Document[]}
   * @protected
   */
  _filterChildren(collection, filters) {
    if ( collection === "effects" ) return Array.from(this.item.effects);
    return [];
  }
}
