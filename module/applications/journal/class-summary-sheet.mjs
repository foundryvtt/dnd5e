import JournalEditor from "./journal-editor.mjs";

/**
 * Journal entry page that displays an automatically generated summary of a class along with additional description.
 */
export default class JournalClassSummary5ePageSheet extends JournalPageSheet {

  /** @inheritdoc */
  static get defaultOptions() {
    const options = super.defaultOptions;
    options.classes.push("class-summary");
    options.dragDrop = [{dropSelector: ".item-drop-area"}];
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

    const linked = this.document.system.linkedItem;
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

    data.title = {
      level1: data.data.title.level,
      level2: data.data.title.level + 1,
      level3: data.data.title.level + 2
    };

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
    const scaleValues = (item.advancement.byType.ScaleValue ?? []);
    const headers = ["Level", "Proficiency Bonus", "Features"];
    headers.push(...scaleValues.map(a => a.title));

    const cols = [
      { class: "level", span: 1 },
      { class: "prof", span: 1 },
      { class: "features", span: 1 }
    ];
    if ( scaleValues.length ) cols.push({ class: "scale", span: scaleValues.length });

    const rows = [];
    for ( let [level, data] of Object.entries(this.document.system.primaryTable) ) {
      level = parseInt(level);

      // Level & proficiency bonus
      const cells = [
        { class: "level", content: level.ordinalString() },
        { class: "prof", content: `+${Math.floor((level + 7) / 4)}` },
        {
          class: "features",
          content: [...data.items.map(uuid => dnd5e.utils.linkForUuid(uuid)), ...data.text].join(", ")
        }
      ];
      scaleValues.forEach(s => cells.push({ class: "scale", content: s.formatValue(level) }));
      rows.push(cells);
    }

    return { headers, cols, rows };
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
      text: game.i18n.format("JOURNALENTRYPAGE.DND5E.TableTOC", { caption: table.caption.innerText }),
      level,
      slug: table.id || JournalEntryPage.implementation.slugifyHeading(table.caption),
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
    html[0].querySelectorAll(".launch-text-editor").forEach(e => {
      e.addEventListener("click", this._onLaunchTextEditor.bind(this));
    });
  }

  /* -------------------------------------------- */

  /**
   * Handle launching the individual text editing window.
   * @param {Event} event  The triggering click event.
   */
  _onLaunchTextEditor(event) {
    event.preventDefault();
    const textKeyPath = event.target.name;
    const editor = new JournalEditor(this.document, { textKeyPath });
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
    if ( item.type !== "class" ) {
      return false;
      // TODO: Display UI warning here
    }

    this.document.update({"system.itemUUID": item.uuid});
  }

}
