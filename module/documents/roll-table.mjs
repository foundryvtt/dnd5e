/**
 * System version of roll tables with some customized embed behavior.
 */
export default class RollTable5e extends RollTable {
  async _buildEmbedHTML(config, options={}) {
    const embed = await super._buildEmbedHTML(config, options);
    if ( config.resultsHeader && (embed instanceof HTMLElement) ) {
      embed.querySelector("thead th:last-of-type").innerText = config.resultsHeader;
    }
    return embed;
  }
}
