export class Dice5e {

  /**
   * A standardized helper function for managing core 5e "d20 rolls"
   *
   * Holding SHIFT, ALT, or CTRL when the attack is rolled will "fast-forward".
   * This chooses the default options of a normal attack with no bonus, Advantage, or Disadvantage respectively
   *
   * @param {Event} event           The triggering event which initiated the roll
   * @param {Array} parts           The dice roll component parts, excluding the initial d20
   * @param {Actor} actor           The Actor making the d20 roll
   * @param {Object} data           Actor or item data against which to parse the roll
   * @param {String} template       The HTML template used to render the roll dialog
   * @param {String} title          The dice roll UI window title
   * @param {Object} speaker        The ChatMessage speaker to pass when creating the chat
   * @param {Function} flavor       A callable function for determining the chat message flavor given parts and data
   * @param {Boolean} advantage     Allow rolling with advantage (and therefore also with disadvantage)
   * @param {Boolean} situational   Allow for an arbitrary situational bonus field
   * @param {Boolean} fastForward   Allow fast-forward advantage selection
   * @param {Number} critical       The value of d20 result which represents a critical success
   * @param {Number} fumble         The value of d20 result which represents a critical failure
   * @param {Function} onClose      Callback for actions to take when the dialog form is closed
   * @param {Object} dialogOptions  Modal dialog options
   */
  static d20Roll({event, parts, data, template, title, speaker, flavor, advantage=true, situational=true,
                  fastForward=true, critical=20, fumble=1, onClose, dialogOptions, }) {
    flavor = flavor || title;

    // Inner roll function
    let rollMode = game.settings.get("core", "rollMode");
    let roll = (parts, adv) => {
      if (adv === 1) {
        parts[0] = ["2d20kh"];
        flavor = `${title} (Advantage)`;
      }
      else if (adv === -1) {
        parts[0] = ["2d20kl"];
        flavor = `${title} (Disadvantage)`;
      }

      // Don't include situational bonus unless it is defined
      if (!data.bonus && parts.indexOf("@bonus") !== -1) parts.pop();

      // Execute the roll
      let roll = new Roll(parts.join(" + "), data).roll();

      // Flag critical thresholds
      let d20 = roll.parts[0];
      d20.options.critical = critical;
      d20.options.fumble = fumble;

      // Convert the roll to a chat message
      roll.toMessage({
        speaker: speaker,
        flavor: flavor,
        rollMode: rollMode
      });
    };

    // Modify the roll and handle fast-forwarding
    parts = ["1d20"].concat(parts);
    if ( event.shiftKey ) return roll(parts, 0);
    else if ( event.altKey ) return roll(parts, 1);
    else if ( event.ctrlKey || event.metaKey ) return roll(parts, -1);
    else parts = parts.concat(["@bonus"]);

    // Render modal dialog
    template = template || "systems/dnd5e/templates/chat/roll-dialog.html";
    let dialogData = {
      formula: parts.join(" + "),
      data: data,
      rollMode: rollMode,
      rollModes: CONFIG.rollModes
    };
    let adv = 0;
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
            roll(parts, adv);
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
   * @param {Actor} actor           The Actor making the damage roll
   * @param {Object} data           Actor or item data against which to parse the roll
   * @param {String} template       The HTML template used to render the roll dialog
   * @param {String} title          The dice roll UI window title
   * @param {Object} speaker        The ChatMessage speaker to pass when creating the chat
   * @param {Function} flavor       A callable function for determining the chat message flavor given parts and data
   * @param {Boolean} critical      Allow critical hits to be chosen
   * @param {Function} onClose      Callback for actions to take when the dialog form is closed
   * @param {Object} dialogOptions  Modal dialog options
   */
  static damageRoll({event={}, parts, actor, data, template, title, speaker, flavor, critical=true, onClose, dialogOptions}) {
    flavor = flavor || title;

    // Inner roll function
    let rollMode = game.settings.get("core", "rollMode");
    let roll = crit => {
      let roll = new Roll(parts.join("+"), data);
      if ( crit === true ) {
        let add = (actor && actor.getFlag("dnd5e", "savageAttacks")) ? 1 : 0;
        let mult = 2;
        roll.alter(add, mult);
        flavor = `${flavor} (Critical)`;
      }

      // Execute the roll and send it to chat
      roll.toMessage({
        speaker: speaker,
        flavor: flavor,
        rollMode: rollMode
      });

      // Return the Roll object
      return roll;
    };

    // Modify the roll and handle fast-forwarding
    if ( event.shiftKey || event.ctrlKey || event.metaKey || event.altKey )  return roll(event.altKey);
    else parts = parts.concat(["@bonus"]);

    // Construct dialog data
    template = template || "systems/dnd5e/templates/chat/roll-dialog.html";
    let dialogData = {
      formula: parts.join(" + "),
      data: data,
      rollMode: rollMode,
      rollModes: CONFIG.rollModes
    };

    // Render modal dialog
    let crit = false;
    return new Promise(resolve => {
      renderTemplate(template, dialogData).then(dlg => {
        new Dialog({
          title: title,
          content: dlg,
          buttons: {
            critical: {
              condition: critical,
              label: "Critical Hit",
              callback: () => crit = true
            },
            normal: {
              label: critical ? "Normal" : "Roll",
            },
          },
          default: "normal",
          close: html => {
            if (onClose) onClose(html, parts, data);
            rollMode = html.find('[name="rollMode"]').val();
            data['bonus'] = html.find('[name="bonus"]').val();
            let r = roll(crit);
            resolve(r);
          }
        }, dialogOptions).render(true);
      });
    });
  }
}

/**
 * Highlight critical success or failure on d20 rolls
 */
export const highlightCriticalSuccessFailure = function(message, html, data) {
  if ( !message.isRoll || !message.isRollVisible || !message.roll.parts.length ) return;

  // Highlight rolls where the first part is a d20 roll
  let d = message.roll.parts[0];
  if ( d instanceof Die && (d.faces === 20) && (d.results.length === 1) ) {
    if (d.total >= (d.options.critical || 20)) html.find(".dice-total").addClass("success");
    else if (d.total <= (d.options.fumble || 1)) html.find(".dice-total").addClass("failure");
  }
};
