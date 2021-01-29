import D20Roll from "./d20-roll.js";

async function d20Dialog({ title, formula, defaultRollMode, defaultAbility, template }, dialogOptions) {
    return rollDialog(...arguments, generateD20Buttons);
}

async function damageDialog({ title, formula, defaultRollMode, template }, dialogOptions) {
    return rollDialog(...arguments, generateDamageButtons);
}

async function rollDialog({ title, formula, defaultRollMode, defaultAbility, template }, dialogOptions, buttonGenerator) {
    template = template ?? "systems/dnd5e/templates/chat/roll-dialog.html";
    const templateData = {
        formula,
        defaultRollMode,
        rollModes: CONFIG.Dice.rollModes,
        // used for tool checks
        defaultAbility,
        abilities: CONFIG.DND5E.abilities
    }
    const content = await renderTemplate(template, templateData);

    return new Promise(resolve => {
        new Dialog({
            title,
            content,
            buttons: buttonGenerator(resolve),
            default: "normal",
            close: () => resolve(null)
        }, dialogOptions).render(true);
    });
}

function generateD20Buttons(resolve) {
    return {
        advantage: {
            label: game.i18n.localize("DND5E.Advantage"),
            callback: html => resolve(getFormData(html, D20Roll.ADV_MODE.ADV))
        },
        normal: {
            label: game.i18n.localize("DND5E.Normal"),
            callback: html => resolve(getFormData(html, D20Roll.ADV_MODE.NORMAL))
        },
        disadvantage: {
            label: game.i18n.localize("DND5E.Disadvantage"),
            callback: html => resolve(getFormData(html, D20Roll.ADV_MODE.DISADV))
        }
    };
}

function generateDamageButtons(resolve, allowCritical) {
    return {
        critical: {
            condition: allowCritical,
                label: game.i18n.localize("DND5E.CriticalHit"),
                callback: html => resolve(getFormData(html, true))
        },
        normal: {
            label: game.i18n.localize(allowCritical ? "DND5E.Normal" : "DND5E.Roll"),
                callback: html => resolve(getFormData(html, false))
        },
    }
}

function getFormData(html, buttonSelection) {
    const formData = new FormDataExtended(html[0].querySelector("form")).toObject();
    formData.buttonSelection = buttonSelection;
    return formData;
}

export const RollDialog = {
    d20Dialog,
    damageDialog,
}
