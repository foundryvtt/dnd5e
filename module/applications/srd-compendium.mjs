export default class SRDCompendium extends Compendium {
  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["srd-compendium"],
      template: "systems/dnd5e/templates/apps/srd-compendium.hbs",
      width: 800,
      height: 950,
      resizable: true
    });
  }

  /* -------------------------------------------- */

  /**
   * The IDs of some special pages that we use when configuring the display of the compendium.
   * @type {Object<string>}
   * @protected
   */
  static _SPECIAL_PAGES = {
    disclaimer: "xxt7YT2t76JxNTel",
    magicItemList: "sfJtvPjEs50Ruzi4",
    spellList: "plCB5ei1JbVtBseb"
  };

  /* -------------------------------------------- */

  /** @inheritdoc */
  async getData(options) {
    const data = await super.getData(options);
    const documents = await this.collection.getDocuments();
    data.disclaimer = this.collection.get(this.constructor._SPECIAL_PAGES.disclaimer).pages.contents[0].text.content;
    data.chapters = documents.reduce((arr, entry) => {
      const isChapter = entry.name.startsWith("Chapter");
      const isAppendix = entry.name.startsWith("Appendix");
      if ( !isChapter && !isAppendix ) return arr;
      const e = entry.toObject();
      e.showPages = (e.pages.length > 1) && isChapter;
      arr.push(e);
      return arr;
    }, []).sort((a, b) => {
      const [, chA] = a.name.match(/^Chapter (\d+)/) || [];
      const [, chB] = b.name.match(/^Chapter (\d+)/) || [];
      const [, appA] = a.name.match(/^Appendix ([A-Z])/) || [];
      const [, appB] = b.name.match(/^Appendix ([A-Z])/) || [];
      if ( chA && !chB ) return -1;
      else if ( chB && !chA ) return 1;
      if ( chA && chB ) return Number(chA) - Number(chB);
      if ( appA && appB ) return appA.charCodeAt(0) - appB.charCodeAt(0);
      return 0;
    });
    // Add spells A-Z to the end of Chapter 10.
    const spellList = this.collection.get(this.constructor._SPECIAL_PAGES.spellList);
    data.chapters[9].pages.push({_id: spellList.id, name: spellList.name, entry: true});
    // Add magic items A-Z to the end of Chapter 11.
    const magicItemList = this.collection.get(this.constructor._SPECIAL_PAGES.magicItemList);
    data.chapters[10].pages.push({_id: magicItemList.id, name: magicItemList.name, entry: true});
    return data;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html);
    html.find("a").on("click", this._onClickLink.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * Handle clicking a link to a journal entry or page.
   * @param {MouseEvent} event  The triggering click event.
   * @protected
   */
  async _onClickLink(event) {
    const target = event.currentTarget;
    const entryId = target.closest("[data-entry-id]")?.dataset.entryId;
    const pageId = target.closest("[data-page-id]")?.dataset.pageId;
    if ( !entryId ) return;
    const options = {};
    if ( pageId ) options.pageId = pageId;
    const entry = await this.collection.getDocument(entryId);
    entry?.sheet.render(true, options);
  }
}
