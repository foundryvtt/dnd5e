import PhysicalItemTemplate from "../../../data/item/templates/physical-item.mjs";
import { EquipmentEntryData } from "../../../data/item/templates/starting-equipment.mjs";
import DocumentSheet5e from "../../api/document-sheet.mjs";

/**
 * Configuration application for Starting Equipment.
 */
export default class StartingEquipmentConfig extends DocumentSheet5e {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["starting-equipment"],
    form: {
      submitOnChange: true
    },
    position: {
      width: 480
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    config: {
      template: "systems/dnd5e/templates/apps/starting-equipment-config.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @override */
  get title() {
    return game.i18n.localize("DND5E.StartingEquipment.Action.Configure");
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

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
        data.showRequireProficiency = ["equipment", "tool", "weapon"].includes(data.linked?.type);
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
  /*  Life-Cycle Handlers                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options);
    new CONFIG.ux.DragDrop({
      dragSelector: ".drag-bar",
      dropSelector: null,
      callbacks: {
        dragstart: this._onDragStart.bind(this),
        drop: this._onDrop.bind(this)
      }
    }).bind(this.element);
  }

  /* -------------------------------------------- */
  /*  Event Listeners                             */
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

  /** @override */
  _onClickAction(event, target) {
    this._onAction(target);
  }

  /* -------------------------------------------- */
  /*  Form Handling                               */
  /* -------------------------------------------- */

  /** @override */
  _prepareSubmitData(event, form, formData, updateData) {
    const submitData = this._processFormData(event, form, formData);
    if ( updateData ) foundry.utils.mergeObject(submitData, updateData, { inplace: true, performDeletions: true });
    // Skip the validation step here because it causes a bunch of problems with providing array
    // updates when using the `submit` method
    return submitData;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _processSubmitData(event, form, submitData) {
    let { action, depth, entryId, linkedUuid, startingEquipment } = submitData;
    startingEquipment = Object.values(startingEquipment ?? {});

    const highestSort = startingEquipment.reduce((sort, i) => i.sort > sort ? i.sort : sort, 0);
    switch ( action ) {
      case "add-entry":
        startingEquipment.push({
          _id: foundry.utils.randomID(),
          group: entryId,
          sort: highestSort + CONST.SORT_INTEGER_DENSITY,
          type: (depth < 3) && !linkedUuid ? "OR" : "linked",
          key: linkedUuid
        });
        break;
      case "delete-entry":
        const deleteIds = new Set();
        const getDeleteIds = entry => {
          deleteIds.add(entry._id);
          entry.children?.forEach(c => getDeleteIds(c));
        };
        getDeleteIds(this.document.system.startingEquipment.find(i => i._id === entryId));
        startingEquipment = startingEquipment.filter(e => !deleteIds.has(e._id));
        break;
    }

    await super._processSubmitData(event, form, { "system.startingEquipment": startingEquipment });
  }

  /* -------------------------------------------- */
  /*  Drag & Drop                                 */
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
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);

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
      const box = this.element.getBoundingClientRect();
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
      const sortUpdates = foundry.utils.performIntegerSort(dragEntry, { target, siblings, sortBefore });
      for ( const update of sortUpdates ) {
        updateData[`startingEquipment.${update.target._id}.sort`] = update.update.sort;
      }
    }

    if ( updateData ) this.submit({ updateData });
  }
}
