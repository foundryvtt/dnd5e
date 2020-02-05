export class Dice5e {

  /**
   * A standardized helper function for managing core 5e "d20 rolls"
   *
   * Holding SHIFT, ALT, or CTRL when the attack is rolled will "fast-forward".
   * This chooses the default options of a normal attack with no bonus, Advantage, or Disadvantage respectively
   *
   * @param {Event|object} event    The triggering event which initiated the roll
   * @param {Array} parts           The dice roll component parts, excluding the initial d20
   * @param {Actor} actor           The Actor making the d20 roll
   * @param {Object} data           Actor or item data against which to parse the roll
   * @param {String} template       The HTML template used to render the roll dialog
   * @param {String} title          The dice roll UI window title
   * @param {Object} speaker        The ChatMessage speaker to pass when creating the chat
   * @param {string} flavor         Flavor text to use in the posted chat message
   * @param {Boolean} advantage     Allow rolling with advantage (and therefore also with disadvantage)
   * @param {Boolean} situational   Allow for an arbitrary situational bonus field
   * @param {Boolean} fastForward   Allow fast-forward advantage selection
   * @param {Number} critical       The value of d20 result which represents a critical success
   * @param {Number} fumble         The value of d20 result which represents a critical failure
   * @param {Function} onClose      Callback for actions to take when the dialog form is closed
   * @param {Object} dialogOptions  Modal dialog options
   *
   * @return {Promise}              A Promise which resolves once the roll workflow has completed
   */
  static async d20Roll({event={}, parts, data, template, title, speaker, flavor, advantage=true, situational=true,
                         fastForward=true, critical=20, fumble=1, onClose, dialogOptions, }) {

    // Handle input arguments
    flavor = flavor || title;
    const rollMode = game.settings.get("core", "rollMode");
    let rolled = false;

    // Define inner roll function
    const _roll = function(parts, adv, form) {

      // Modify d20 for advantage or disadvantage
      if (adv === 1) {
        parts[0] = ["2d20kh"];
        flavor = `${title} (Advantage)`;
      } else if (adv === -1) {
        parts[0] = ["2d20kl"];
        flavor = `${title} (Disadvantage)`;
      }

      // Optionally include a situational bonus
      data['bonus'] = form ? form.find('[name="bonus"]').val() : 0;
      if (!data.bonus && parts.indexOf("@bonus") !== -1) parts.pop();

      // Optionally include an ability score selection (used for tool checks)
      const ability = form.find('[name="ability"]');
      if ( ability.length && ability.val() ) {
        data.ability = ability.val();
        const abl = data.abilities[data.ability];
        if ( abl ) data.mod = abl.mod;
      }

      // Execute the roll and flag critical thresholds on the d20
      let roll = new Roll(parts.join(" + "), data).roll();
      const d20 = roll.parts[0];
      d20.options.critical = critical;
      d20.options.fumble = fumble;

      // Convert the roll to a chat message and return the roll
      roll.toMessage({
        speaker: speaker,
        flavor: flavor,
        rollMode: form ? form.find('[name="rollMode"]').val() : rollMode
      });
      rolled = true;
      return roll;
    };

    // Modify the roll and handle fast-forwarding
    parts = ["1d20"].concat(parts);
    if (event.shiftKey) return _roll(parts, 0);
    else if (event.altKey) return _roll(parts, 1);
    else if (event.ctrlKey || event.metaKey) return _roll(parts, -1);
    else parts = parts.concat(["@bonus"]);

    // Render modal dialog
    template = template || "systems/dnd5e/templates/chat/roll-dialog.html";
    let dialogData = {
      formula: parts.join(" + "),
      data: data,
      rollMode: rollMode,
      rollModes: CONFIG.rollModes,
      config: CONFIG.DND5E
    };
    const html = await renderTemplate(template, dialogData);

    // Create the Dialog window
    let roll;
    return new Promise(resolve => {
      new Dialog({
        title: title,
        content: html,
        buttons: {
          advantage: {
            label: "Advantage",
            callback: html => roll = _roll(parts, 1, html)
          },
          normal: {
            label: "Normal",
            callback: html => roll = _roll(parts, 0, html)
          },
          disadvantage: {
            label: "Disadvantage",
            callback: html => roll = _roll(parts, -1, html)
          }
        },
        default: "normal",
        close: html => {
          if (onClose) onClose(html, parts, data);
          resolve(rolled ? roll : false)
        }
      }, dialogOptions).render(true);
    })
  }

  /* -------------------------------------------- */

  /**
   * A standardized helper function for managing core 5e "d20 rolls"
   *
   * Holding SHIFT, ALT, or CTRL when the attack is rolled will "fast-forward".
   * This chooses the default options of a normal attack with no bonus, Critical, or no bonus respectively
   *
   * @param {Event|object} event    The triggering event which initiated the roll
   * @param {Array} parts           The dice roll component parts, excluding the initial d20
   * @param {Actor} actor           The Actor making the damage roll
   * @param {Object} data           Actor or item data against which to parse the roll
   * @param {String} template       The HTML template used to render the roll dialog
   * @param {String} title          The dice roll UI window title
   * @param {Object} speaker        The ChatMessage speaker to pass when creating the chat
   * @param {string} flavor         Flavor text to use in the posted chat message
   * @param {Boolean} critical      Allow critical hits to be chosen
   * @param {Function} onClose      Callback for actions to take when the dialog form is closed
   * @param {Object} dialogOptions  Modal dialog options
   *
   * @return {Promise}              A Promise which resolves once the roll workflow has completed
   */
  static async damageRoll({event={}, parts, actor, data, template, title, speaker, flavor, critical=true, onClose,
                            dialogOptions}) {

    // Handle input arguments
    flavor = flavor || title;
    const rollMode = game.settings.get("core", "rollMode");
    let rolled = false;

    // Define inner roll function
    const _roll = function(parts, crit, form) {
      data['bonus'] = form ? form.find('[name="bonus"]').val() : 0;
      let roll = new Roll(parts.join("+"), data);

      // Modify the damage formula for critical hits
      if ( crit === true ) {
        let add = (actor && actor.getFlag("dnd5e", "savageAttacks")) ? 1 : 0;
        let mult = 2;
        roll.alter(add, mult);
        flavor = `${flavor} (Critical)`;
      }

      // Convert the roll to a chat message
      roll.toMessage({
        speaker: speaker,
        flavor: flavor,
        rollMode: form ? form.find('[name="rollMode"]').val() : rollMode
      });
      rolled = true;
      return roll;
    };

    // Modify the roll and handle fast-forwarding
    if ( event.shiftKey || event.ctrlKey || event.metaKey || event.altKey ) return _roll(parts, event.altKey);
    else parts = parts.concat(["@bonus"]);

    // Render modal dialog
    template = template || "systems/dnd5e/templates/chat/roll-dialog.html";
    let dialogData = {
      formula: parts.join(" + "),
      data: data,
      rollMode: rollMode,
      rollModes: CONFIG.rollModes
    };
    const html = await renderTemplate(template, dialogData);

    // Create the Dialog window
    let roll;
    return new Promise(resolve => {
      new Dialog({
        title: title,
        content: html,
        buttons: {
          critical: {
            condition: critical,
            label: "Critical Hit",
            callback: html => roll = _roll(parts, true, html)
          },
          normal: {
            label: critical ? "Normal" : "Roll",
            callback: html => roll = _roll(parts, false, html)
          },
        },
        default: "normal",
        close: html => {
          if (onClose) onClose(html, parts, data);
          resolve(rolled ? roll : false);
        }
      }, dialogOptions).render(true);
    });
  }
}
