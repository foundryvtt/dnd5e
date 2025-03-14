import NPCActorSheet from "../npc-sheet.mjs";

/**
 * An Actor sheet for NPCs.
 * @deprecated
 */
export class ActorSheet5eNPC extends NPCActorSheet {
  constructor(...args) {
    foundry.utils.logCompatibilityWarning(
      "The `ActorSheet5eNPC` application has been deprecated and replaced with `NPCActorSheet`.",
      { since: "DnD5e 5.0", until: "DnD5e 5.2", once: true }
    );
    super(...args);
  }
}

/**
 * An Actor sheet for NPCs.
 * @deprecated
 */
export class ActorSheet5eNPC2 extends NPCActorSheet {
  constructor(...args) {
    foundry.utils.logCompatibilityWarning(
      "The `ActorSheet5eNPC2` application has been deprecated and replaced with `NPCActorSheet`.",
      { since: "DnD5e 5.0", until: "DnD5e 5.2", once: true }
    );
    super(...args);
  }
}
