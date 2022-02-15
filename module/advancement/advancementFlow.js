/*

{ type: "itemsAdded", items: [Item5e] }
{ type: "levelIncreased", class: Item5e, starting: { class: 1, actor: 1 }, ending: { class: 2, actor: 2 } }

*/


export class AdvancementFlow extends FormApplication {

  constructor(actor, stages, options={}) {
    if ( actor === 2 ) options.template = "systems/dnd5e/templates/advancement/advancement-flow-2.html";
    
    super(actor, options);

    /**
     *
     */
    this.stages = stages;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "advancement", "flow"],
      template: "systems/dnd5e/templates/advancement/advancement-flow.html",
      width: 460,
      height: "auto",
      title: "Advance"
    });
  }

  /* -------------------------------------------- */

}
