class Dice5e {

  /**
   * A standardized helper function for managing core 5e "d20 rolls"
   *
   * Holding SHIFT, ALT, or CTRL when the attack is rolled will "fast-forward".
   * This chooses the default options of a normal attack with no bonus, Advantage, or Disadvantage respectively
   *
   * @param {Event} event           The triggering event which initiated the roll
   * @param {Array} parts           The dice roll component parts, excluding the initial d20
   * @param {Object} data           Actor or item data against which to parse the roll
   * @param {String} template       The HTML template used to render the roll dialog
   * @param {String} title          The dice roll UI window title
   * @param {String} alias          The alias with which to post to chat
   * @param {Function} flavor       A callable function for determining the chat message flavor given parts and data
   * @param {Boolean} advantage     Allow rolling with advantage (and therefore also with disadvantage)
   * @param {Boolean} situational   Allow for an arbitrary situational bonus field
   * @param {Boolean} highlight     Highlight critical successes and failures
   * @param {Boolean} fastForward   Allow fast-forward advantage selection
   * @param {Function} onClose      Callback for actions to take when the dialog form is closed
   * @param {Object} dialogOptions  Modal dialog options
   */
  static d20Roll({event, parts, data, template, title, alias, flavor, advantage=true, situational=true,
                  highlight=true, fastForward=true, onClose, dialogOptions}) {

    // Inner roll function
    let rollMode = "roll";
    let roll = () => {
      let flav = ( flavor instanceof Function ) ? flavor(parts, data) : title;
      if (adv === 1) {
        parts[0] = ["2d20kh"];
        flav = `${title} (Advantage)`;
      }
      else if (adv === -1) {
        parts[0] = ["2d20kl"];
        flav = `${title} (Disadvantage)`;
      }

      // Don't include situational bonus unless it is defined
      if (!data.bonus && parts.indexOf("@bonus") !== -1) parts.pop();

      // Execute the roll and send it to chat
      let roll = new Roll(parts.join("+"), data).roll();
      roll.toMessage({
        alias: alias,
        flavor: flav,
        rollMode: rollMode,
        highlightSuccess: roll.parts[0].total === 20,
        highlightFailure: roll.parts[0].total === 1
      });
    };

    // Modify the roll and handle fast-forwarding
    let adv = 0;
    parts = ["1d20"].concat(parts);
    if ( event.shiftKey ) return roll();
    else if ( event.altKey ) {
      adv = 1;
      return roll();
    }
    else if ( event.ctrlKey || event.metaKey ) {
      adv = -1;
      return roll();
    } else parts = parts.concat(["@bonus"]);

    // Render modal dialog
    template = template || "public/systems/dnd5e/templates/chat/roll-dialog.html";
    let dialogData = {
      formula: parts.join(" + "),
      data: data,
      rollModes: CONFIG.rollModes
    };
    renderTemplate(template, dialogData).then(dlg => {
      new Dialog({
          title: title,
          content: dlg,
          buttons: {
            advantage: {
              label: "Advantage",
              callback: () => adv = 1
            },
            normal: {
              label: "Normal",
            },
            disadvantage: {
              label: "Disadvantage",
              callback: () => adv = -1
            }
          },
          default: "normal",
          close: html => {
            if ( onClose ) onClose(html, parts, data);
            rollMode = html.find('[name="rollMode"]').val();
            data['bonus'] = html.find('[name="bonus"]').val();
            roll()
          }
        }, dialogOptions).render(true);
    });
  }

  /* -------------------------------------------- */

  /**
   * A standardized helper function for managing core 5e "d20 rolls"
   *
   * Holding SHIFT, ALT, or CTRL when the attack is rolled will "fast-forward".
   * This chooses the default options of a normal attack with no bonus, Critical, or no bonus respectively
   *
   * @param {Event} event           The triggering event which initiated the roll
   * @param {Array} parts           The dice roll component parts, excluding the initial d20
   * @param {Object} data           Actor or item data against which to parse the roll
   * @param {String} template       The HTML template used to render the roll dialog
   * @param {String} title          The dice roll UI window title
   * @param {String} alias          The alias with which to post to chat
   * @param {Function} flavor       A callable function for determining the chat message flavor given parts and data
   * @param {Boolean} critical      Allow critical hits to be chosen
   * @param {Boolean} situational   Allow for an arbitrary situational bonus field
   * @param {Boolean} fastForward   Allow fast-forward advantage selection
   * @param {Function} onClose      Callback for actions to take when the dialog form is closed
   * @param {Object} dialogOptions  Modal dialog options
   */
  static damageRoll({event, parts, data, template, title, alias, flavor, critical=true, situational=true,
                     fastForward=true, onClose, dialogOptions}) {

    // Inner roll function
    let roll = () => {
      let roll = new Roll(parts.join("+"), data),
          flav = ( flavor instanceof Function ) ? flavor(parts, data) : title;
      if ( crit ) {
        roll.alter(0, 2);
        flav = `${title} (Critical)`;
      }

      // Execute the roll and send it to chat
      roll.toMessage({
        alias: alias,
        flavor: flav
      });
    };

    // Modify the roll and handle fast-forwarding
    let crit = 0;
    if ( event.shiftKey || event.ctrlKey || event.metaKey )  return roll();
    else if ( event.altKey ) {
      crit = 1;
      return roll();
    }
    else parts = parts.concat(["@bonus"]);

    // Render modal dialog
    template = template || "public/systems/dnd5e/templates/chat/roll-dialog.html";
    renderTemplate(template, {formula: parts.join(" + "), data: data}).then(dlg => {
      new Dialog({
          title: title,
          content: dlg,
          buttons: {
            critical: {
              label: "Critical Hit",
              callback: () => crit = 1
            },
            normal: {
              label: "Normal",
            },
          },
          default: "normal",
          close: html => {
            if ( onClose ) onClose(html, parts, data);
            data['bonus'] = html.find('[name="bonus"]').val();
            roll()
          }
        }, dialogOptions).render(true);
    });
  }
}