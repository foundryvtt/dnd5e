/**
 * Build inline enricher inserts for each entry in a config record, titled by the entry's label.
 * @param {string} prefix                             Action id prefix for each generated child.
 * @param {Record<string, { label: string }>} record  Config record keyed by entry id.
 * @param {(key: string) => string} html              Builds the enricher markup for a given entry id.
 * @returns {object[]}
 */
function buildEnricherInserts(prefix, record, html) {
  return Object.entries(record).map(([key, { label }]) => ({
    action: `${prefix}-${key}`,
    html: html(key),
    inline: true,
    title: label
  }));
}

/* -------------------------------------------- */

/**
 * Inserts whose children are abilities and should stay in stat order rather than be alphabetized.
 * @type {Set<string>}
 */
const STAT_ORDERED = new Set(["dnd5e-enricher-check", "dnd5e-enricher-save", "dnd5e-reference-ability"]);

/**
 * Recursively order insert entries and their submenus alphabetically by localized title.
 * @param {object[]} inserts  The insert entries to sort in place.
 */
function sortInserts(inserts) {
  inserts.sort((a, b) => _loc(a.title).localeCompare(_loc(b.title), game.i18n.lang));
  for ( const insert of inserts ) {
    if ( insert.children && !STAT_ORDERED.has(insert.action) ) sortInserts(insert.children);
  }
}

/* -------------------------------------------- */

/**
 * Build reference enricher inserts grouped into a submenu per rule type, one leaf per referenceable entry.
 * Entries without a resolvable reference are skipped and duplicate references (e.g. `str`/`strength`) are collapsed.
 * Rule entries have no configured label, so their referenced document name is resolved for the title.
 * @returns {Promise<object[]>}  One insert group per non-empty rule type.
 */
async function buildReferenceInserts() {
  const groups = [];
  for ( const [type, { label, references }] of Object.entries(CONFIG.DND5E.ruleTypes) ) {
    const record = foundry.utils.getProperty(CONFIG.DND5E, references) ?? {};
    const seen = new Set();
    const children = [];
    for ( const [key, source] of Object.entries(record) ) {
      // Both spellComponent and spellTag reference the whole itemProperties record, so we check isTag in order to
      // filter out duplicates.
      if ( (type === "spellComponent") && source.isTag ) continue;
      if ( (type === "spellTag") && !source.isTag ) continue;
      const uuid = foundry.utils.isPlainObject(source) ? source.reference : source;
      if ( !uuid || seen.has(uuid) ) continue;
      seen.add(uuid);
      children.push({
        action: `dnd5e-reference-${type}-${key}`,
        html: `&amp;Reference[${type}=${key}]`,
        inline: true,
        title: source?.label ?? source?.name ?? (await fromUuid(uuid))?.name ?? key
      });
    }
    if ( children.length ) groups.push({ children, action: `dnd5e-reference-${type}`, title: label });
  }
  return groups;
}

/* -------------------------------------------- */

/**
 * Register the system's special HTML blocks and enrichers as ProseMirror inserts.
 * @returns {Promise<void>}
 */
export async function registerProseMirrorInserts() {
  CONFIG.TextEditor.inserts.push({
    action: "dnd5e-blocks",
    title: "EDITOR.DND5E.Inserts.Group",
    children: [
      {
        action: "dnd5e-block-notable",
        title: "EDITOR.DND5E.Inserts.Notable",
        html: '<aside class="notable"><h3>Title</h3><selection><p>Notable content.</p></selection></aside>'
      },
      {
        action: "dnd5e-block-narrative",
        title: "EDITOR.DND5E.Inserts.Narrative",
        html: '<aside class="narrative"><selection><p>Narrative text.</p></selection></aside>'
      },
      {
        action: "dnd5e-block-quest",
        title: "EDITOR.DND5E.Inserts.Quest",
        html: '<section class="quest"><figure class="icon"><img class="round" src="icons/svg/hanging-sign.svg">'
          + "</figure><article><h4>Quest</h4><selection><p>Quest description.</p></selection></article></section>"
      },
      {
        action: "dnd5e-block-advice",
        title: "EDITOR.DND5E.Inserts.Advice",
        html: '<section class="advice"><figure class="icon"><img class="round" src="icons/svg/book.svg"></figure>'
          + "<article><h4>Advice</h4><selection><p>Advice content.</p></selection></article></section>"
      },
      {
        action: "dnd5e-block-vtt-advice",
        title: "EDITOR.DND5E.Inserts.VTTAdvice",
        html: '<section class="advice"><figure class="icon"><img class="vtt-outline" src="icons/vtt-512.png"></figure>'
          + "<article><h4>Advice</h4><selection><p>Advice content.</p></selection></article></section>"
      },
      {
        action: "dnd5e-block-quote",
        title: "EDITOR.DND5E.Inserts.Quote",
        children: [
          {
            action: "dnd5e-block-quote-left",
            title: "EDITOR.DND5E.Inserts.FloatLeft",
            html: '<aside class="quote-lg float-left"><selection><p><q>Quote text.</q></p></selection>'
              + '<p class="quote-author">Author</p></aside>'
          },
          {
            action: "dnd5e-block-quote-right",
            title: "EDITOR.DND5E.Inserts.FloatRight",
            html: '<aside class="quote-lg float-right"><selection><p><q>Quote text.</q></p></selection>'
              + '<p class="quote-author">Author</p></aside>'
          }
        ]
      },
      {
        action: "dnd5e-block-habitat-treasure",
        title: "EDITOR.DND5E.Inserts.HabitatTreasure",
        html: '<p class="habitat-treasure"><strong>Habitat:</strong> Any; <strong>Treasure:</strong> None</p>'
      }
    ]
  });

  CONFIG.TextEditor.inserts.push({
    action: "dnd5e-enrichers",
    title: "EDITOR.DND5E.Inserts.EnrichersGroup",
    children: [
      {
        action: "dnd5e-enricher-check",
        title: "EDITOR.DND5E.Inserts.Check",
        children: buildEnricherInserts("dnd5e-enricher-check", CONFIG.DND5E.abilities, key => {
          return `[[/check ability=${key}]]`;
        })
      },
      {
        action: "dnd5e-enricher-save",
        title: "EDITOR.DND5E.Inserts.Save",
        children: buildEnricherInserts("dnd5e-enricher-save", CONFIG.DND5E.abilities, key => {
          return `[[/save ability=${key}]]`;
        })
      },
      {
        action: "dnd5e-enricher-skill",
        title: "EDITOR.DND5E.Inserts.Skill",
        children: buildEnricherInserts("dnd5e-enricher-skill", CONFIG.DND5E.skills, key => `[[/check skill=${key}]]`)
      },
      {
        action: "dnd5e-enricher-damage",
        title: "EDITOR.DND5E.Inserts.Damage",
        children: buildEnricherInserts("dnd5e-enricher-damage", CONFIG.DND5E.damageTypes, key => {
          return `[[/damage 1d6 ${key}]]`;
        })
      },
      {
        action: "dnd5e-enricher-healing",
        title: "EDITOR.DND5E.Inserts.Healing",
        children: buildEnricherInserts("dnd5e-enricher-healing", CONFIG.DND5E.healingTypes, key => {
          return `[[/heal 2d4 ${key}]]`;
        })
      },
      {
        action: "dnd5e-enricher-attack",
        title: "EDITOR.DND5E.Inserts.Attack",
        inline: true,
        html: "[[/attack +5]]"
      },
      {
        action: "dnd5e-enricher-award",
        title: "EDITOR.DND5E.Inserts.Award",
        children: [
          ...buildEnricherInserts("dnd5e-enricher-award", CONFIG.DND5E.currencies,
            key => `[[/award 50${key}]]`),
          {
            action: "dnd5e-enricher-award-xp",
            title: "DND5E.ExperiencePoints.Label",
            inline: true,
            html: "[[/award 50xp]]"
          }
        ]
      },
      {
        action: "dnd5e-enricher-item",
        title: "EDITOR.DND5E.Inserts.Item",
        inline: true,
        html: "[[/item Longsword]]"
      },
      {
        action: "dnd5e-enricher-reference",
        title: "EDITOR.DND5E.Inserts.Reference",
        children: await buildReferenceInserts()
      },
      {
        action: "dnd5e-enricher-lookup",
        title: "EDITOR.DND5E.Inserts.Lookup",
        inline: true,
        html: "[[lookup @name]]"
      }
    ]
  });

  // Alphabetize every submenu by localized title.
  CONFIG.TextEditor.inserts
    .filter(insert => insert.action?.startsWith("dnd5e-"))
    .forEach(insert => sortInserts(insert.children ?? []));
}
