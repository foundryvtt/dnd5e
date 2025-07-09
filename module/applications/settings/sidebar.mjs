/**
 * Generate sidebar links.
 * @returns {HTMLUListElement}
 * @private
 */
function _generateLinks() {
  const links = document.createElement("ul");
  links.classList.add("unlist", "links");
  links.innerHTML = `
    <li>
      <a href="https://github.com/foundryvtt/dnd5e/releases/latest" target="_blank">
        ${game.i18n.localize("DND5E.Notes")}
      </a>
    </li>
    <li>
      <a href="https://github.com/foundryvtt/dnd5e/issues" target="_blank">${game.i18n.localize("DND5E.Issues")}</a>
    </li>
    <li>
      <a href="https://github.com/foundryvtt/dnd5e/wiki" target="_blank">${game.i18n.localize("DND5E.Wiki")}</a>
    </li>
    <li>
      <a href="https://discord.com/channels/170995199584108546/670336046164213761" target="_blank">
        ${game.i18n.localize("DND5E.Discord")}
      </a>
    </li>
  `;
  return links;
}

/* -------------------------------------------- */

/**
 * Render a custom entry for game details in the settings sidebar.
 * @param {HTMLElement} html  The settings sidebar HTML.
 */
export function renderSettings(html) {
  const pip = html.querySelector(".info .system .notification-pip");
  html.querySelector(".info .system").remove();

  const section = document.createElement("section");
  section.classList.add("dnd5e2", "sidebar-info");
  section.innerHTML = `
    <h4 class="divider">${game.i18n.localize("WORLD.FIELDS.system.label")}</h4>
    <div class="system-badge">
      <img src="systems/dnd5e/ui/official/dnd-badge-32.webp" data-tooltip="${dnd5e.title}" alt="${dnd5e.title}">
      <span class="system-info">${dnd5e.version}</span>
    </div>
  `;
  section.append(_generateLinks());
  if ( pip ) section.querySelector(".system-info").insertAdjacentElement("beforeend", pip);
  html.querySelector(".info").insertAdjacentElement("afterend", section);
}
