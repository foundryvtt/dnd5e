import PhysicalItemTemplate from "../../data/item/templates/physical-item.mjs";
import { EquipmentEntryData } from "../../data/item/templates/starting-equipment.mjs";

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
      element.addEventListener("click", event =>
        this.submit({ updateData: {
          action: event.target.dataset.action,
          depth: Number(event.target.closest("[data-depth]")?.dataset.depth ?? 0) + 1,
          entryId: event.target.closest("[data-entry-id]")?.dataset.entryId
        } })
      );
    }
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
          type: (data.depth < 3) && !data.linkedUuid ? "AND" : "linked",
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
    }

    return { "system.startingEquipment": data.startingEquipment, "system.wealth": data.wealth };
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
