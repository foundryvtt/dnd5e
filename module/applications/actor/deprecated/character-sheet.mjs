import CharacterActorSheet from "../character-sheet.mjs";

/**
 * An Actor sheet for Characters.
 */
export class ActorSheet5eCharacter extends CharacterActorSheet {
  constructor(...args) {
    foundry.utils.logCompatibilityWarning(
      "The `ActorSheet5eCharacter` application has been deprecated and replaced with `CharacterActorSheet`.",
      { since: "DnD5e 5.0", until: "DnD5e 5.2", once: true }
    );
    super(...args);
  }
}

/**
 * An Actor sheet for Characters.
 */
export class ActorSheet5eCharacter2 extends CharacterActorSheet {
  constructor(...args) {
    foundry.utils.logCompatibilityWarning(
      "The `ActorSheet5eCharacter2` application has been deprecated and replaced with `CharacterActorSheet`.",
      { since: "DnD5e 5.0", until: "DnD5e 5.2", once: true }
    );
    super(...args);
  }
}
