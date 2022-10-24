import JournalEditor from "./journal-editor.mjs";

/**
 * Journal entry page that displays an automatically generated summary of a class along with additional description.
 */
export default class JournalClassPageSheet extends JournalPageSheet {

  /** @inheritdoc */
  static get defaultOptions() {
    const options = foundry.utils.mergeObject(super.defaultOptions, {
      dragDrop: [{dropSelector: ".drop-target"}],
      submitOnChange: true
    });
    options.classes.push("class-journal");
    return options;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get template() {
    return `systems/dnd5e/templates/journal/page-class-${this.isEditable ? "edit" : "view"}.hbs`;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  toc = {};

  /* -------------------------------------------- */

  /** @inheritdoc */
  async getData(options) {
    const context = super.getData(options);
    context.system = context.document.system;

    context.title = Object.fromEntries(
      Array.fromRange(4, 1).map(n => [`level${n}`, context.data.title.level + n - 1])
    );

    const linked = await fromUuid(this.document.system.item);
    if ( !linked ) return context;
    context.linked = {
      document: linked,
      name: linked.name,
      lowercaseName: linked.name.toLowerCase()
    };

    context.advancement = this._getAdvancement(linked);
    context.enriched = await this._getDescriptions(context.document);
    context.table = await this._getTable(linked);
    context.optionalTable = await this._getOptionalTable(linked);
    context.features = await this._getFeatures(linked);
    context.optionalFeatures = await this._getFeatures(linked, true);
    context.subclasses = await this._getSubclasses(this.document.system.subclassItems);
    context.subclasses?.sort((lhs, rhs) => lhs.name.localeCompare(rhs.name));

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare features granted by various advancement types.
   * @param {Item5e} item  Class item belonging to this journal.
   * @returns {object}     Prepared advancement section.
   */
  _getAdvancement(item) {
    const advancement = {};

    const hp = item.advancement.byType.HitPoints[0];
    if ( hp ) {
      advancement.hp = {
        hitDice: `1${hp.hitDie}`,
        max: hp.hitDieValue,
        average: Math.floor(hp.hitDieValue / 2) + 1
      };
    }

    return advancement;
  }

  /* -------------------------------------------- */

  /**
   * Enrich all of the entries within the descriptions object on the sheet's system data.
   * @param {JournalEntryPage} page  Journal page being enriched.
   * @returns {Promise<object>}      Object with enriched descriptions.
   */
  async _getDescriptions(page) {
    const descriptions = await Promise.all(Object.entries(page.system.description ?? {})
      .map(async ([id, text]) => {
        const enriched = await TextEditor.enrichHTML(text, {
          relativeTo: this.object,
          secrets: this.object.isOwner,
          async: true
        });
        return [id, enriched];
      })
    );
    return Object.fromEntries(descriptions);
  }

  /* -------------------------------------------- */

  /**
   * Prepare table based on non-optional GrantItem advancement & ScaleValue advancement.
   * @param {Item5e} item              Class item belonging to this journal.
   * @param {number} [initialLevel=1]  Level at which the table begins.
   * @returns {object}     Prepared table.
   */
  async _getTable(item, initialLevel=1) {
    const hasFeatures = !!item.advancement.byType.ItemGrant;
    const scaleValues = (item.advancement.byType.ScaleValue ?? []);
    const spellProgression = await this._getSpellProgression(item);

    const headers = [[{content: game.i18n.localize("DND5E.Level")}]];
    if ( item.type === "class" ) headers[0].push({content: game.i18n.localize("DND5E.ProficiencyBonus")});
    if ( hasFeatures ) headers[0].push({content: game.i18n.localize("DND5E.Features")});
    headers[0].push(...scaleValues.map(a => ({content: a.title})));
    if ( spellProgression ) {
      if ( spellProgression.headers.length > 1 ) {
        headers[0].forEach(h => h.rowSpan = 2);
        headers[0].push(...spellProgression.headers[0]);
        headers[1] = spellProgression.headers[1];
      } else {
        headers[0].push(...spellProgression.headers[0]);
      }
    }

    const cols = [{ class: "level", span: 1 }];
    if ( item.type === "class" ) cols.push({class: "prof", span: 1});
    if ( hasFeatures ) cols.push({class: "features", span: 1});
    if ( scaleValues.length ) cols.push({class: "scale", span: scaleValues.length});
    if ( spellProgression ) cols.push(...spellProgression.cols);

    const makeLink = async uuid => (await fromUuid(uuid))?.toAnchor({classes: ["content-link"]}).outerHTML;

    const rows = [];
    for ( const level of Array.fromRange((CONFIG.DND5E.maxLevel - (initialLevel - 1)), initialLevel) ) {
      const features = [];
      for ( const advancement of item.advancement.byLevel[level] ) {
        switch ( advancement.constructor.typeName ) {
          case "ItemGrant":
            if ( advancement.configuration.optional ) continue;
            features.push(...await Promise.all(advancement.configuration.items.map(makeLink)));
            continue;
        }
      }

      // Level & proficiency bonus
      const cells = [{class: "level", content: level.ordinalString()}];
      if ( item.type === "class" ) cells.push({class: "prof", content: `+${Math.floor((level + 7) / 4)}`});
      if ( hasFeatures ) cells.push({class: "features", content: features.join(", ")});
      scaleValues.forEach(s => cells.push({class: "scale", content: s.formatValue(level)}));
      const spellCells = spellProgression?.rows[rows.length];
      if ( spellCells ) cells.push(...spellCells);

      // Skip empty rows on subclasses
      if ( (item.type === "subclass") && !features.length && !scaleValues.length && !spellCells ) continue;

      rows.push(cells);
    }

    return { headers, cols, rows };
  }

  /* -------------------------------------------- */

  /**
   * Build out the spell progression data.
   * @param {Item5e} item  Class item belonging to this journal.
   */
  async _getSpellProgression(item) {
    const spellcasting = item.spellcasting;
    if ( !spellcasting || (spellcasting.progression === "none") ) return null;

    const items = [item.toObject()];
    let classId = item.id;
    if ( item.type === "subclass" ) {
      classId = foundry.utils.randomID();
      items.push({_id: classId, name: "tmp-class", type: "class", system: {identifier: item.system.classIdentifier}});
    }
    const actor = await Actor.implementation.create({name: "tmp", type: "character", items}, {temporary: true});

    const table = { rows: [] };

    // Pact Progression
    if ( spellcasting.progression === "pact" ) {
      table.headers = [[
        { content: game.i18n.localize("JOURNALENTRYPAGE.DND5E.Class.SpellSlots") },
        { content: game.i18n.localize("JOURNALENTRYPAGE.DND5E.Class.SpellSlotLevel") }
      ]];
      table.cols = [{class: "spellcasting", span: 2}];

      // Loop through each level, gathering "Spell Slots" & "Slot Level" for each one
      for ( const level of Array.fromRange(CONFIG.DND5E.maxLevel, 1) ) {
        actor.items.get(classId).updateSource({"system.levels": level});
        actor.reset();
        table.rows.push([
          { class: "spell-slots", content: `${actor.system.spells.pact.max}` },
          { class: "slot-level", content: actor.system.spells.pact.level.ordinalString() }
        ]);
      }
    }

    // Leveled Progression
    else {
      // Get the max spell slot size based on progression
      actor.items.get(classId).updateSource({"system.levels": CONFIG.DND5E.maxLevel});
      actor.reset();
      const largestSlot = Object.entries(actor.system.spells).reduce((slot, [key, data]) => {
        if ( !data.max ) return slot;
        const level = parseInt(key.slice(5));
        if ( !Number.isNaN(level) && (level > slot) ) return level;
        return slot;
      }, -1);

      // Prepare headers & columns
      table.headers = [
        [{content: game.i18n.localize("JOURNALENTRYPAGE.DND5E.Class.SpellSlotsPerSpellLevel"), colSpan: largestSlot}],
        Array.fromRange(largestSlot, 1).map(spellLevel => ({content: spellLevel.ordinalString()}))
      ];
      table.cols = [{class: "spellcasting", span: largestSlot}];

      // Loop through each level, gathering max slots for each level
      for ( const level of Array.fromRange(CONFIG.DND5E.maxLevel, 1) ) {
        actor.items.get(classId).updateSource({"system.levels": level});
        actor.reset();
        const cells = [];
        for ( const spellLevel of Array.fromRange(largestSlot, 1) ) {
          const max = actor.system.spells[`spell${spellLevel}`]?.max;
          cells.push({class: "spell-slots", content: max || "&mdash;"});
        }
        table.rows.push(cells);
      }
    }

    return table;
  }

  /* -------------------------------------------- */

  /**
   * Prepare options table based on optional GrantItem advancement.
   * @param {Item5e} item    Class item belonging to this journal.
   * @returns {object|null}  Prepared optional features table.
   */
  async _getOptionalTable(item) {
    const headers = [[
      { content: game.i18n.localize("DND5E.Level") },
      { content: game.i18n.localize("DND5E.Features") }
    ]];

    const cols = [
      { class: "level", span: 1 },
      { class: "features", span: 1 }
    ];

    const makeLink = async uuid => (await fromUuid(uuid))?.toAnchor({classes: ["content-link"]}).outerHTML;

    const rows = [];
    for ( const level of Array.fromRange(CONFIG.DND5E.maxLevel, 1) ) {
      const features = [];
      for ( const advancement of item.advancement.byLevel[level] ) {
        switch ( advancement.constructor.typeName ) {
          case "ItemGrant":
            if ( !advancement.configuration.optional ) continue;
            features.push(...await Promise.all(advancement.configuration.items.map(makeLink)));
            continue;
        }
      }
      if ( !features.length ) continue;

      // Level & proficiency bonus
      const cells = [
        { class: "level", content: level.ordinalString() },
        { class: "features", content: features.join(", ") }
      ];
      rows.push(cells);
    }
    if ( !rows.length ) return null;

    return { headers, cols, rows };
  }

  /* -------------------------------------------- */

  /**
   * Fetch data for each class feature listed.
   * @param {Item5e} item               Class or subclass item belonging to this journal.
   * @param {boolean} [optional=false]  Should optional features be fetched rather than required features?
   * @returns {object[]}   Prepared features.
   */
  async _getFeatures(item, optional=false) {
    const prepareFeature = async uuid => {
      const document = await fromUuid(uuid);
      return {
        document,
        name: document.name,
        description: await TextEditor.enrichHTML(document.system.description.value, {
          relativeTo: item, secrets: false, async: true
        })
      };
    };

    let features = [];
    for ( const advancement of item.advancement.byType.ItemGrant ?? [] ) {
      if ( !!advancement.configuration.optional !== optional ) continue;
      features.push(...advancement.configuration.items.map(prepareFeature));
    }
    features = await Promise.all(features);
    return features;
  }

  /* -------------------------------------------- */

  /**
   * Fetch each subclass and their features.
   * @param {string[]} uuids   UUIDs for the subclasses to fetch.
   * @returns {object[]|null}  Prepared subclasses.
   */
  async _getSubclasses(uuids) {
    const prepareSubclass = async uuid => {
      const document = await fromUuid(uuid);
      return this._getSubclass(document);
    };

    const subclasses = await Promise.all(uuids.map(prepareSubclass));
    return subclasses.length ? subclasses : null;
  }

  /* -------------------------------------------- */

  /**
   * Prepare data for the provided subclass.
   * @param {Item5e} item  Subclass item being prepared.
   * @returns {object}     Presentation data for this subclass.
   */
  async _getSubclass(item) {
    const initialLevel = Object.entries(item.advancement.byLevel).find(([lvl, d]) => d.length)?.[0] ?? 1;
    return {
      document: item,
      name: item.name,
      description: await TextEditor.enrichHTML(item.system.description.value, {
        relativeTo: item, secrets: false, async: true
      }),
      features: await this._getFeatures(item),
      table: await this._getTable(item, parseInt(initialLevel))
    };
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritdoc */
  async _renderInner(...args) {
    const html = await super._renderInner(...args);
    this.toc = JournalEntryPage.buildTOC(html.get());
    return html;
  }

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html);
    html[0].querySelectorAll(".item-delete").forEach(e => {
      e.addEventListener("click", this._onDeleteItem.bind(this));
    });
    html[0].querySelectorAll(".launch-text-editor").forEach(e => {
      e.addEventListener("click", this._onLaunchTextEditor.bind(this));
    });
  }

  /* -------------------------------------------- */

  /**
   * Handle deleting a dropped item.
   * @param {Event} event  The triggering click event.
   * @returns {JournalClassSummary5ePageSheet}
   */
  async _onDeleteItem(event) {
    event.preventDefault();
    const container = event.currentTarget.closest("[data-item-uuid]");
    const uuidToDelete = container?.dataset.itemUuid;
    if ( !uuidToDelete ) return;
    switch (container.dataset.itemType) {
      case "class":
        await this.document.update({"system.item": ""});
        return this.render();
      case "subclass":
        const itemSet = this.document.system.subclassItems;
        itemSet.delete(uuidToDelete);
        await this.document.update({"system.subclassItems": Array.from(itemSet)});
        return this.render();
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle launching the individual text editing window.
   * @param {Event} event  The triggering click event.
   */
  _onLaunchTextEditor(event) {
    event.preventDefault();
    const textKeyPath = event.target.dataset.target;
    const label = event.target.closest(".form-group").querySelector("label");
    const editor = new JournalEditor(this.document, { textKeyPath, title: label?.innerText });
    editor.render(true);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _onDrop(event) {
    const data = TextEditor.getDragEventData(event);

    if ( data?.type !== "Item" ) return false;
    const item = await Item.implementation.fromDropData(data);
    switch ( item.type ) {
      case "class":
        await this.document.update({"system.item": item.uuid});
        this.render();
      case "subclass":
        const itemSet = this.document.system.subclassItems;
        itemSet.add(item.uuid);
        await this.document.update({"system.subclassItems": Array.from(itemSet)});
        this.render();
      default:
        return false;
    }
  }

}
