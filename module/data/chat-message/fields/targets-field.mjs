const {
  ArrayField, DocumentUUIDField, FilePathField, NumberField, SchemaField, StringField
} = foundry.data.fields;

/**
 * @import { TargetDescriptor5e } from "../../../_types.mjs";
 */

/**
 * A field for storing the tokens a message was rolled against.
 */
export default class TargetsField extends ArrayField {
  constructor(options={}) {
    super(new SchemaField({
      ac: new NumberField({ integer: true }),
      actor: new DocumentUUIDField({ type: "Actor" }),
      img: new FilePathField({ categories: ["IMAGE", "VIDEO"] }),
      name: new StringField(),
      token: new DocumentUUIDField({ type: "Token" })
    }), options);
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Describe the given tokens for storage on a message.
   * @param {Iterable<Token5e|TokenDocument5e>} [tokens]  Tokens to describe. Defaults to the user's current targets.
   * @returns {TargetDescriptor5e[]}
   */
  static getDescriptors(tokens=game.user.targets) {
    const targets = new Map();
    for ( const target of tokens ) {
      const token = target.document ?? target;
      const { statuses, system, uuid: actor } = token.actor ?? {};
      if ( !actor ) continue;
      const ac = statuses.has("coverTotal") ? null : system.attributes?.ac?.value;
      targets.set(token.uuid, {
        actor,
        ac: ac ?? null,
        img: token.texture?.src,
        name: token.name,
        token: token.uuid
      });
    }
    return Array.from(targets.values());
  }

  /* -------------------------------------------- */

  /**
   * Resolve a stored target descriptor back to the documents it describes, falling back through progressively weaker
   * matches when the exact token is not available on the scene being viewed.
   * @param {TargetDescriptor5e} descriptor  Descriptor stored when the target was captured.
   * @returns {{ [actor]: Actor5e, [token]: Token5e }}
   */
  static resolve({ actor, token }={}) {
    const document = token ? fromUuidSync(token, { strict: false }) : null;

    // The exact token, if it is on the scene currently being viewed.
    if ( document?.parent === canvas?.scene ) return { actor: document.actor, token: document.object };

    // An unlinked token's actor exists only on that token, so no other token can stand in for it.
    if ( foundry.utils.parseUuid(actor)?.primaryType === "Scene" ) {
      return { actor: document?.actor ?? fromUuidSync(actor, { strict: false }) };
    }

    // Any token of the same actor on the viewed scene, otherwise the actor by itself.
    const base = fromUuidSync(actor, { strict: false });
    const [active] = base?.getActiveTokens() ?? [];
    return { actor: base, token: active };
  }
}
