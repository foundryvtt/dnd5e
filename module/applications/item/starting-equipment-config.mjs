import PhysicalItemTemplate from "../../data/item/templates/physical-item.mjs";
import { EquipmentEntryData } from "../../data/item/templates/starting-equipment.mjs";
import ContextMenu5e from "../context-menu.mjs";

/**
 * Configuration application for Starting Equipment.
 */
export default class StartingEquipmentConfig extends DocumentSheet {

  /** @inheritDoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "starting-equipment"],
      dragDrop: [{ dragSelector: ".drag-bar", dropSelector: "form" }],
      template: "systems/dnd5e/templates/apps/starting-equipment-config.hbs",
      width: 480,
      height: "auto",
      sheetConfig: false,
      closeOnSubmit: false,
      submitOnChange: true,
      submitOnClose: true
    });
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @inheritDoc */
  get title() {
    return `${game.i18n.localize("DND5E.StartingEquipment.Action.Configure")}: ${this.document.name}`;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async getData(options={}) {
    const context = super.getData(options);

    const processEntry = async (entry, depth=1) => {
      const data = {
        id: entry._id, entry, depth,
        groupType: entry.type in EquipmentEntryData.GROUPING_TYPES,
        validTypes: depth < 3 ? EquipmentEntryData.TYPES : EquipmentEntryData.OPTION_TYPES
      };
      if ( entry.type in EquipmentEntryData.GROUPING_TYPES ) {
        data.children = await Promise.all(entry.children.map(c => processEntry(c, depth + 1)));
      } else if ( entry.type === "linked" ) {
        data.linked = fromUuidSync(entry.key);
      }
      return data;
    };
    context.entries = await Promise.all(
      this.document.system.startingEquipment
        .filter(e => !e.group)
        .sort((lhs, rhs) => lhs.sort - rhs.sort)
        .map(e => processEntry(e))
    );

    return context;
  }

  /* -------------------------------------------- */
  /*  Event Listeners                             */
  /* -------------------------------------------- */

  /** @inheritDoc */
  activateListeners(jQuery) {
    super.activateListeners(jQuery);
    const html = jQuery[0];

    for ( const element of html.querySelectorAll("[data-action]") ) {
      element.addEventListener("click", event => this._onAction(event.target));
    }

    new ContextMenu5e(jQuery, "[data-entry-id]", [], { onOpen: this._onOpenContextMenu.bind(this) });
  }

  /* -------------------------------------------- */

  /**
   * Handle an action.
   * @param {HTMLElement} element       The element on which the action is being performed.
   * @param {object} [options={}]
   * @param {string} [options.action]   The specific action to perform.
   * @param {number} [options.depth]    Depth of the element being acted upon.
   * @param {string} [options.entryId]  ID of the entry to act upon.
   */
  _onAction(element, { action, depth, entryId }={}) {
    this.submit({ updateData: {
      action: action ?? element.closest("[data-action]")?.dataset.action,
      depth: depth ?? (Number(event.target.closest("[data-depth]")?.dataset.depth ?? 0) + 1),
      entryId: entryId ?? element.closest("[data-entry-id]")?.dataset.entryId
    } });
  }

  /* -------------------------------------------- */

  /**
   * Create list of content menu options.
   * @param {HTMLElement} element  The element on which the context menu was triggered.
   * @protected
   */
  _onOpenContextMenu(element) {
    element = element.closest("[data-entry-id]");
    const entryId = element?.dataset.entryId;
    const entry = this.document.system.startingEquipment.find(e => e._id === entryId);
    if ( !entry ) return;
    ui.context.menuItems = [
      {
        name: "DND5E.StartingEquipment.Action.AddEntry",
        icon: "<i class='fa-solid fa-plus fa-fw'></i>",
        condition: () => entry.type in EquipmentEntryData.GROUPING_TYPES,
        callback: li => this._onAction(element, { action: "add-entry", entryId })
      },
      {
        name: "DND5E.StartingEquipment.Action.RemoveEntry",
        icon: "<i class='fa-solid fa-trash fa-fw'></i>",
        callback: li => this._onAction(element, { action: "delete-entry", entryId })
      }
    ];
    if ( entry.type === "linked" ) ui.context.menuItems.push({
      name: "DND5E.StartingEquipment.RequireProficiency",
      icon: `<i class="fa-regular fa-square${entry.requiresProficiency ? "-check" : ""} fa-fw"
                aria-checked="${entry.requiresProficiency}"></i>`,
      callback: li => this._onAction(element, { action: "toggle-proficiency", entryId }),
      group: "state"
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _getSubmitData(...args) {
    const data = foundry.utils.expandObject(super._getSubmitData(...args));
    data.startingEquipment = Object.values(data.startingEquipment ?? {});

    const highestSort = data.startingEquipment.reduce((sort, i) => i.sort > sort ? i.sort : sort, 0);
    switch ( data.action ) {
      case "add-entry":
        data.startingEquipment.push({
          _id: foundry.utils.randomID(),
          group: data.entryId,
          sort: highestSort + CONST.SORT_INTEGER_DENSITY,
          type: (data.depth < 3) && !data.linkedUuid ? "OR" : "linked",
          key: data.linkedUuid
        });
        break;
      case "delete-entry":
        const deleteIds = new Set();
        const getDeleteIds = entry => {
          deleteIds.add(entry._id);
          entry.children?.forEach(c => getDeleteIds(c));
        };
        getDeleteIds(this.document.system.startingEquipment.find(i => i._id === data.entryId));
        data.startingEquipment = data.startingEquipment.filter(e => !deleteIds.has(e._id));
        break;
      case "toggle-proficiency":
        const entry = data.startingEquipment.find(e => e._id === data.entryId);
        if ( entry ) entry.requiresProficiency = !entry.requiresProficiency;
        break;
    }

    return { "system.startingEquipment": data.startingEquipment };
  }

  /* -------------------------------------------- */
  /*  Drag & Drop                                 */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _canDragDrop() {
    return this.isEditable;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onDragStart(event) {
    const entry = event.target.closest("[data-entry-id]");
    if ( !entry ) return;
    event.dataTransfer.setData("text/plain", JSON.stringify({
      type: "equipment-entry", uuid: this.document.uuid, entryId: entry.dataset.entryId
    }));
    const box = entry.getBoundingClientRect();
    event.dataTransfer.setDragImage(entry, box.width - 6, box.height / 2);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onDrop(event) {
    // Try to extract the data
    const data = TextEditor.getDragEventData(event);

    // Handle re-ordering of list
    if ( data?.entryId && (data.uuid === this.document.uuid) ) return this._onSortEntry(event, data);

    // Handle dropping linked items
    if ( data?.type !== "Item" ) return;
    const item = await Item.implementation.fromDropData(data);

    // Validate that this is a physical item
    if ( !item.system.constructor._schemaTemplates?.includes(PhysicalItemTemplate) ) {
      ui.notifications.error(game.i18n.format("DND5E.StartingEquipment.Warning.ItemTypeInvalid", {
        type: game.i18n.localize(CONFIG.Item.typeLabels[item.type])
      }));
      return null;
    }

    // Determine where this was dropped
    const closestDrop = event.target.closest(
      '[data-entry-type="AND"], [data-entry-type="OR"], [data-entry-type="linked"]'
    );
    const { entryId, entryType } = closestDrop?.dataset ?? {};

    // If no closest entry, create at top level, or if closest is a group, create inside that group
    if ( !entryId || (entryType in EquipmentEntryData.GROUPING_TYPES) ) this.submit({ updateData: {
      action: "add-entry",
      entryId,
      linkedUuid: item.uuid
    } });

    // If closest entry is linked, set its key to be this uuid
    else if ( entryType === "linked" ) this.submit({ updateData: {
      [`startingEquipment.${entryId}.key`]: item.uuid
    } });
  }

  /* -------------------------------------------- */

  /**
   * Sort an entry on drop.
   * @param {DragEvent} event  Triggering drop event.
   * @param {object} data      Drag event data.
   */
  _onSortEntry(event, data) {
    const dropArea = event.target.closest("[data-entry-id]");
    const dragEntry = this.document.system.startingEquipment.find(e => e._id === data?.entryId);
    const dropEntry = this.document.system.startingEquipment.find(e => e._id === dropArea?.dataset.entryId);

    // If drag entry & drop entry are the same, or drop entry is drag entry's group, do nothing
    if ( (dropEntry?._id === dragEntry._id) || (dropEntry?._id === dragEntry.group) ) return;

    let updateData;
    let sortBefore;
    let target;

    // If drop entry is a group, move drag entry into it
    if ( dropEntry?.type in EquipmentEntryData.GROUPING_TYPES ) {
      let depth = Number(dropArea.dataset.depth) + 1;
      if ( dragEntry.children?.length ) {
        depth += 1;
        if ( dragEntry.children.some(c => c.type in EquipmentEntryData.GROUPING_TYPES) ) depth += 1;
      }
      if ( depth > 3 ) {
        ui.notifications.warn("DND5E.StartingEquipment.Warning.Depth", { localize: true });
        return;
      }
      updateData = { [`startingEquipment.${dragEntry._id}.group`]: dropEntry._id };
      target = dropEntry.children.pop();
    }

    // If drag entry and drop entry are in the same group, perform relative sort
    else if ( dropEntry && (dropEntry.group === dragEntry.group) ) {
      target = dropEntry;
    }

    // If dropped outside any entry, move to top level and sort to top or bottom of list
    else if ( !dropEntry ) {
      updateData = { [`startingEquipment.${dragEntry._id}.group`]: null };
      const box = this.form.getBoundingClientRect();
      sortBefore = (event.clientY - box.y) < (box.height * .75);
      const sortedEntries = this.document.system.startingEquipment.filter(e => !e.group)
        .sort((lhs, rhs) => lhs.sort - rhs.sort);
      target = sortBefore ? sortedEntries.shift() : sortedEntries.pop();
    }

    // If they are in different groups, move entry to new group and then sort
    else if ( dropEntry.group !== dragEntry.group ) {
      updateData = { [`startingEquipment.${dragEntry._id}.group`]: dropEntry.group };
      target = dropEntry;
    }

    if ( target && (target !== dragEntry) ) {
      updateData ??= {};
      const siblings = this.document.system.startingEquipment.filter(s => s._id !== dragEntry._id);
      const sortUpdates = SortingHelpers.performIntegerSort(dragEntry, { target, siblings, sortBefore });
      for ( const update of sortUpdates ) {
        updateData[`startingEquipment.${update.target._id}.sort`] = update.update.sort;
      }
    }

    if ( updateData ) this.submit({ updateData });
  }
}
