import JournalEditor from "./journal-editor.mjs";

/**
 * Journal entry page that displays an automatically generated summary of a class along with additional description.
 */
export default class JournalClassSummary5ePageSheet extends JournalPageSheet {

  /** @inheritdoc */
  static get defaultOptions() {
    const options = super.defaultOptions;
    options.classes.push("classSummary");
    options.dragDrop = [{dropSelector: ".drop-target"}];
    return options;
  }

  /* -------------------------------------------- */

  get template() {
    return `systems/dnd5e/templates/journal/page-class-summary-${this.isEditable ? "edit" : "view"}.hbs`;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  toc = {};

  /* -------------------------------------------- */

  /** @inheritdoc */
  async getData(options) {
    const data = super.getData(options);
    data.system = data.document.system;

    data.title = {
      level1: data.data.title.level,
      level2: data.data.title.level + 1,
      level3: data.data.title.level + 2,
      level4: data.data.title.level + 3
    };

    const linked = await fromUuid(this.document.system.itemUUID);
    if ( !linked ) return data;
    data.linked = {
      document: linked,
      name: linked.name,
      lowercaseName: linked.name.toLowerCase()
    };

    data.advancement = this._getAdvancement(linked);
    data.enriched = await this._getDescriptions(data.document);
    data.table = await this._getTable(linked);
    data.optionalTable = await this._getOptionalTable(linked);
    data.features = await this._getFeatures(linked);
    data.subclasses = await this._getSubclasses(this.document.system.subclassItems);

    return data;
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
   * @param {Item5e} item  Class item belonging to this journal.
   * @returns {object}     Prepared table.
   */
  async _getTable(item) {
    const spellProgression = await this._getSpellProgression(item);
    const scaleValues = (item.advancement.byType.ScaleValue ?? []);
    const headers = [
      game.i18n.localize("DND5E.Level"),
      game.i18n.localize("DND5E.ProficiencyBonus"),
      game.i18n.localize("DND5E.Features")
    ];
    headers.push(...scaleValues.map(a => a.title));
    if ( spellProgression ) headers.push(...spellProgression.headers);

    const cols = [
      { class: "level", span: 1 },
      { class: "prof", span: 1 },
      { class: "features", span: 1 }
    ];
    if ( scaleValues.length ) cols.push({ class: "scale", span: scaleValues.length });
    if ( spellProgression ) cols.push(...spellProgression.cols);

    const makeLink = uuid => TextEditor._createContentLink(["", "UUID", uuid]).outerHTML;

    const rows = [];
    for ( const level of Array.fromRange(CONFIG.DND5E.maxLevel, 1) ) {
      const features = [];
      for ( const advancement of item.advancement.byLevel[level] ) {
        switch ( advancement.constructor.typeName ) {
          case "ItemGrant":
            if ( advancement.data.configuration.optional ) continue;
            features.push(...advancement.data.configuration.items.map(makeLink));
            continue;
        }
      }

      // Level & proficiency bonus
      const cells = [
        { class: "level", content: level.ordinalString() },
        { class: "prof", content: `+${Math.floor((level + 7) / 4)}` },
        { class: "features", content: features.join(", ") }
      ];
      scaleValues.forEach(s => cells.push({ class: "scale", content: s.formatValue(level) }));
      const spellCells = spellProgression?.rows[rows.length];
      if ( spellCells ) cells.push(...spellCells);
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

    const actor = await Actor.implementation.create({
      name: "tmp", type: "character", items: [item.toObject()]
    }, {temporary: true});

    const table = { rows: [] };

    // Pact Progression
    if ( spellcasting.progression === "pact" ) {
      table.headers = ["Spell Slots", "Slot Level"]; // TODO: Localize these headers
      table.cols = [{ class: "spellcasting", span: 2 }];

      // Loop through each level, gathering "Spell Slots" & "Slot Level" for each one
      for ( const level of Array.fromRange(CONFIG.DND5E.maxLevel, 1) ) {
        actor.items.get(item.id).updateSource({"system.levels": level});
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
      actor.items.get(item.id).updateSource({"system.levels": CONFIG.DND5E.maxLevel});
      actor.reset();
      const largestSlot = Object.entries(actor.system.spells).reduce((slot, [key, data]) => {
        if ( data.max === 0 ) return slot;
        const level = parseInt(key.replace("spell", ""));
        if ( !Number.isNaN(level) && level > slot ) return level;
        return slot;
      }, -1);

      // Prepare headers & columns
      table.headers = Array.fromRange(largestSlot, 1).map(spellLevel => spellLevel.ordinalString());
      table.cols = [{ class: "spellcasting", span: table.headers.length }];

      // Loop through each level, gathering max slots for each level
      for ( const level of Array.fromRange(CONFIG.DND5E.maxLevel, 1) ) {
        actor.items.get(item.id).updateSource({"system.levels": level});
        actor.reset();
        const cells = [];
        for ( const spellLevel of Array.fromRange(largestSlot, 1) ) {
          const max = actor.system.spells[`spell${spellLevel}`]?.max;
          cells.push({ class: "spell-slots", content: max || "&mdash;" });
        }
        table.rows.push(cells);
      }
    }

    return table;
  }

  /* -------------------------------------------- */

  /**
   * Prepare options table based on optional GrantItem advancement.
   * @param {Item5e} item  Class item belonging to this journal.
   * @returns {object}     Prepared optional features table.
   */
  async _getOptionalTable(item) {
    return {};
  }

  /* -------------------------------------------- */

  /**
   * Fetch data for each class feature listed.
   * @param {Item5e} item  Class or subclass item belonging to this journal.
   * @returns {object[]}   Prepared features.
   */
  async _getFeatures(item) {
    const prepareFeature = async uuid => {
      const document = await fromUuid(uuid);
      return {
        document,
        name: document.name,
        description: await TextEditor.enrichHTML(document.system.description.value, {
          relativeTo: this.object, secrets: false, async: true
        })
      };
    };

    let features = [];
    for ( const advancement of item.advancement.byType.ItemGrant ) {
      if ( advancement.data.configuration.optional ) continue;
      features.push(...advancement.data.configuration.items.map(prepareFeature));
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
      return {
        document,
        name: document.name,
        description: await TextEditor.enrichHTML(document.system.description.value, {
          relativeTo: this.object, secrets: false, async: true
        }),
        features: await this._getFeatures(document)
      };
    };

    const subclasses = await Promise.all(uuids.map(prepareSubclass));
    return subclasses.length ? subclasses : null;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritdoc */
  async _renderInner(...args) {
    const html = await super._renderInner(...args);
    this.toc = this._buildTOC(html.get());
    return html;
  }

  /* -------------------------------------------- */

  /**
   * Build the table of contents for this JournalEntryPage.
   * @param {HTMLElement[]} html  The HTML contents of this page.
   * @returns {Object<JournalEntryPageHeading>}
   * @protected
   */
  _buildTOC(html) {
    // A pseudo root heading element to start at.
    const root = {level: 0, children: []};
    // Perform a depth-first-search down the DOM to locate heading nodes.
    const stack = [root];
    const searchHeadings = element => {
      if ( element instanceof HTMLHeadingElement ) {
        const node = this._makeHeadingNode(element);
        let parent = stack.at(-1);
        if ( node.level <= parent.level ) {
          stack.pop();
          parent = stack.at(-1);
        }
        parent.children.push(node);
        stack.push(node);
      } else if ( element instanceof HTMLTableElement ) {
        let parent = stack.at(-1);
        const node = this._makeTableNode(element, parent.level);
        parent.children.push(node);
        stack.push(node);
      }
      for ( const child of (element.children || []) ) {
        searchHeadings(child);
      }
    };
    html.forEach(searchHeadings);
    return this._flattenTOC(root.children);
  }

  /* -------------------------------------------- */

  /**
   * Flatten the tree structure into a single object with each node's slug as the key.
   * @param {JournalEntryPageHeading[]} nodes  The root ToC nodes.
   * @returns {Object<JournalEntryPageHeading>}
   * @protected
   */
  _flattenTOC(nodes) {
    const toc = {};
    const addNode = node => {
      if ( toc[node.slug] ) {
        let i = 1;
        while ( toc[`${node.slug}$${i}`] ) i++;
        node.slug = `${node.slug}$${i}`;
      }
      toc[node.slug] = node;
      return node.slug;
    };
    const flattenNode = node => {
      const slug = addNode(node);
      while ( node.children.length ) {
        if ( typeof node.children[0] === "string" ) break;
        const child = node.children.shift();
        node.children.push(flattenNode(child));
      }
      return slug;
    };
    nodes.forEach(flattenNode);
    return toc;
  }

  /* -------------------------------------------- */

  /**
   * Construct a table of contents node from a heading element.
   * @param {HTMLHeadingElement} heading  The heading element.
   * @returns {JournalEntryPageHeading}
   * @protected
   */
  _makeHeadingNode(heading) {
    return {
      text: heading.innerText,
      level: Number(heading.tagName[1]),
      slug: heading.id || JournalEntryPage.implementation.slugifyHeading(heading),
      element: heading,
      children: []
    };
  }

  /* -------------------------------------------- */

  /**
   * Construct a table of contents node from a table element.
   * @param {HTMLTableElement} table  The table element.
   * @param {number} level            TOC level for this table.
   * @returns {JournalEntryPageHeading}
   * @protected
   */
  _makeTableNode(table, level) {
    return {
      text: game.i18n.format("JOURNALENTRYPAGE.DND5E.TableTOC", { caption: table.caption?.innerText ?? "" }),
      level,
      slug: table.id || JournalEntryPage.implementation.slugifyHeading(table.caption ?? ""),
      element: table,
      children: []
    };
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
  _onDeleteItem(event) {
    event.preventDefault();
    const container = event.currentTarget.closest("[data-item-uuid]");
    const uuidToDelete = container?.dataset.itemUuid;
    if ( !uuidToDelete ) return;
    switch (container.dataset.itemType) {
      case "class":
        return this.document.update({"system.itemUUID": ""});
      case "subclass":
        const itemSet = this.document.system.subclassItems;
        itemSet.delete(uuidToDelete);
        return this.document.update({"system.subclassItems": Array.from(itemSet)});
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle launching the individual text editing window.
   * @param {Event} event  The triggering click event.
   */
  _onLaunchTextEditor(event) {
    event.preventDefault();
    const textKeyPath = event.target.name;
    const label = event.target.closest(".form-group").querySelector("label");
    const editor = new JournalEditor(this.document, { textKeyPath, title: label?.innerText });
    editor.render(true);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _onDrop(event) {
    let data;
    try { data = JSON.parse(event.dataTransfer.getData("text/plain")); }
    catch(err) { return false; }

    if ( data.type !== "Item" ) return false;
    const item = await Item.implementation.fromDropData(data);
    switch (item.type) {
      case "class":
        return this.document.update({"system.itemUUID": item.uuid});
      case "subclass":
        const itemSet = this.document.system.subclassItems;
        itemSet.add(item.uuid);
        return this.document.update({"system.subclassItems": Array.from(itemSet)});
      default:
        // TODO: Display UI warning here
        return false;
    }
  }

}
