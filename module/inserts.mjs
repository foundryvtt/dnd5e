/**
 * Register the system's special HTML blocks as ProseMirror inserts.
 */
export function registerProseMirrorInserts() {
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
        html: '<section class="quest"><figure class="icon"><img class="round" src="icons/svg/book.svg"></figure>'
          + "<article><h4>Quest</h4><selection><p>Quest description.</p></selection></article></section>"
      },
      {
        action: "dnd5e-block-advice",
        title: "EDITOR.DND5E.Inserts.Advice",
        html: '<section class="advice"><figure class="icon"><img class="round" src="icons/svg/book.svg"></figure>'
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
}
