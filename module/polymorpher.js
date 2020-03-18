export class Polymorpher extends Application {

	constructor() {
		super();

		// default sheets
		Hooks.on(`renderActorSheet`, (app, html, data) => this.enablePolymorphing(app, html, data));

		Hooks.on('ready', async () => {
			this.loadBackupStore();

			let defaultOptions = {
				keepPhysical: { label: 'Keep Physical Ablitiescores (Str, Dex, Con)', value: false },
				keepMental: { label: 'Keep Mental Ablitiescores (Wis, Int, Cha)', value: false },
				keepSaves: { label: 'Keep Savingthrow Proficiency of the Character', value: false },
				keepSkills: { label: 'Keep Skill Proficiency of the Character', value: false },
				mergeSaves: { label: 'Merge Savingthrow Proficiencys (take both)', value: false },
				mergeSkills: { label: 'Merge Skill Proficiency (take both)', value: false },
				keepClass: { label: 'Keep Proficiency bonus (leaves Class items in sheet)', value: false },
				keepFeats: { label: 'Keep Features', value: false },
				keepSpells: { label: 'Keep Spells', value: false },
				keepItems: { label: 'Keep Equipment', value: false },
				keepBio: { label: 'Keep Biography', value: false },
				keepVision: { label: 'Keep Vision (Character and Token)', value: false }
			}
			game.settings.register("dnd5e", "polymorpher", {
				name: "default settings for polymorpher",
				default: defaultOptions,
				type: Object,
				scope: 'world'
			});

			let oldSettings = await game.settings.get("dnd5e", "polymorpher");
			for (let key in oldSettings) {
				if (defaultOptions[key]) {
					defaultOptions[key].value = oldSettings[key].value;
				}
			}
			game.settings.set("dnd5e", "polymorpher", defaultOptions);
		});

		Hooks.on("renderSettings", (app, html) => {

			let button = $(`<button id="polymorpherBackupSystem"><i class="fas fa-address-book"></i> Polymorpher Backups</button>`);
			button.click(ev => {
				this.render(true);
			});
			html.find('button[data-action="setup"]').after(button);
		});
	}

	static get defaultOptions() {
		const options = super.defaultOptions;
		options.classes = options.classes.concat('polymorpher');
		options.template = "systems/dnd5e/templates/apps/polymorpher.html";
		options.width = 600;
		options.title = 'Polymorpher Backup Store';
		return options;
	}

	getData() {
		let data = {};
		data.backupCharacterStore = this.backupCharacterStore;
		data.empty = (Object.keys(this.backupCharacterStore).length === 0);
		return data;
	}

	activateListeners(html) {
		$(html.find('.export')).click(ev => {
			let combinedId = $(ev.target).parents('li').attr('data-combinedId');
			this.exportFromStorage(combinedId);
		});

		$(html.find('.restore')).click(ev => {
			let combinedId = $(ev.target).parents('li').attr('data-combinedId');
			this.restoreFromStorage(combinedId);
		});

		$(html.find('.delete')).click(ev => {
			let combinedId = $(ev.target).parents('li').attr('data-combinedId');
			this.removeFromStorage(combinedId);
			this.render(false);
		});
	}

	enablePolymorphing(app, html, data) {
		// its important to store the original _onDrop since we need it for item drops
		// but a sheetupdate calls this again without resetting the sheets _onDrop function,
		// so it would overwrite the original with the newOnDrop, so we only store it if we don't have it already
		if (this.originalOnDrop === undefined) {
			this.originalOnDrop = app._onDrop;
		}
		app._onItemDrop = this.originalOnDrop;
		app._onDrop = this.newOnDrop;

		this.enableRestoration(app, html, data);
	}

	async newOnDrop(ev) {
		if (!game.user.isGM && !game.settings.get('dnd5e', 'allowPolymorphing')) {
			this._onItemDrop(ev);
			return;
		}

		ev.preventDefault();
		ev.stopPropagation();
		let dropData;
		try {
			dropData = JSON.parse(ev.dataTransfer.getData('text/plain'));
		}
		catch (err) {
			return false;
		}

		if (dropData.type === 'Actor') {
			let originalActor = this.object;
			let targetActor = {};
			if (dropData.pack !== undefined) {
				// load data from compendium
				let pack = game.packs.find(p => p.collection === dropData.pack);
				targetActor = await pack.getEntity(dropData.id);
				targetActor = targetActor.data;
			} else {
				// load data from database
				targetActor = game.actors.get(dropData.id).data;
			}

			let options = await game.settings.get("dnd5e", "polymorpher");

			let dialogContent = ''
			for (let option in options) {
				dialogContent += `<div><input type="checkbox" name="${option}" ${options[option].value ? "checked" : ""}> <label for="${option}">${options[option].label}</div>`;
			}
			let d = new Dialog({
				title: "Polymorphing - choose your options",
				content: dialogContent,
				buttons: {
					accept: {
						icon: '<i class="fas fa-check"></i>',
						label: "Accept",
						callback: async html => {
							let inputs = html.find('input');
							for (let input of inputs) {
								options[input.name].value = input.checked;
							}
							await game.dnd5e.polymorpher.createBackup(originalActor);
							game.settings.set('dnd5e', 'polymorpher', options);
							game.dnd5e.polymorpher.exchangeActor(originalActor, targetActor, options);
						}
					},
					wildshape: {
						icon: '<i class="fas fa-paw"></i>',
						label: "Wildshape",
						callback: async html => {
							options = {
								keepPhysical: { label: 'Keep Physical Ablitiescores (Str, Dex, Con)', value: false },
								keepMental: { label: 'Keep Mental Ablitiescores (Wis, Int, Cha)', value: true },
								keepSaves: { label: 'Keep Savingthrow Proficiency of the Character', value: false },
								keepSkills: { label: 'Keep Skill Proficiency of the Character', value: false },
								mergeSaves: { label: 'Merge Savingthrow Proficiencys (take both)', value: true },
								mergeSkills: { label: 'Merge Skill Proficiency (take both)', value: true },
								keepClass: { label: 'Keep Proficiency bonus (leaves Class items in sheet)', value: false },
								keepFeats: { label: 'Keep Features', value: false },
								keepSpells: { label: 'Keep Spells', value: false },
								keepItems: { label: 'Keep Equipment', value: false },
								keepBio: { label: 'Keep Biography', value: false },
								keepVision: { label: 'Keep Vision (Character and Token)', value: false }
							}
							await game.dnd5e.polymorpher.createBackup(originalActor);
							game.dnd5e.polymorpher.exchangeActor(originalActor, targetActor, options);
						}
					},
					polymorph: {
						icon: '<i class="fas fa-pastafarianism"></i>',
						label: "Polymorph",
						callback: async html => {
							options = {
								keepPhysical: { label: 'Keep Physical Ablitiescores (Str, Dex, Con)', value: false },
								keepMental: { label: 'Keep Mental Ablitiescores (Wis, Int, Cha)', value: false },
								keepSaves: { label: 'Keep Savingthrow Proficiency of the Character', value: false },
								keepSkills: { label: 'Keep Skill Proficiency of the Character', value: false },
								mergeSaves: { label: 'Merge Savingthrow Proficiencys (take both)', value: false },
								mergeSkills: { label: 'Merge Skill Proficiency (take both)', value: false },
								keepClass: { label: 'Keep Proficiency bonus (leaves Class items in sheet)', value: false },
								keepFeats: { label: 'Keep Features', value: false },
								keepSpells: { label: 'Keep Spells', value: false },
								keepItems: { label: 'Keep Equipment', value: false },
								keepBio: { label: 'Keep Biography', value: false },
								keepVision: { label: 'Keep Vision (Character and Token)', value: false }
							}
							await game.dnd5e.polymorpher.createBackup(originalActor);
							game.dnd5e.polymorpher.exchangeActor(originalActor, targetActor, options);
						}
					},
					cancel: {
						icon: '<i class="fas fa-times"></i>',
						label: "Cancel"
					}
				},
				default: "one",
			});
			d.render(true);


		} else {
			this._onItemDrop(ev);
		}
	}

	async createBackup(actor) {
		if (!actor.data.flags.dnd5e
			|| !actor.data.flags.dnd5e.polymorpher
			|| !actor.data.flags.dnd5e.polymorpher.data.isPolymorphed === false)
		{
			// create relevant information
			let actorId = actor.data._id;
			let dateId = Date.now();
			let name = actor.data.name;
			let date = new Date();
			let displayDate = date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',','');
			let combinedId = `${actorId}.${dateId}`;

			let storeData = {
				id: actorId,
				name: name,
				displayDate: displayDate,
				data: JSON.stringify(actor.data)
			}

			this.backupCharacterStore[combinedId] = storeData;
			this.saveBackupStore();
		}
	}

	exchangeActor(originalActor, newActor, options = false) {
		ui.notifications.info(`Polymorphing ${originalActor.name} into a ${newActor.name}`);
		// creating a copy of the data of newActor to prevent any modification of the droped actor
		let newActorRawData = JSON.parse(JSON.stringify(newActor));
		let newActorData = {
			data: newActorRawData.data,
			items: newActorRawData.items,
			token: newActorRawData.token,
			img: newActorRawData.img,
			flags: {}
		}
		newActorData.token.actorId = originalActor.data.token.actorId;
		newActorData.token.actorLink = originalActor.data.token.actorLink;
		newActorData.token.name = originalActor.data.token.name;

		// make sure custom language/damage type get overwritten properly
		for (let trait in newActorData.data.traits) {
			let specialTraits = ['languages', 'di', 'dr', 'dv', 'ci'];
			if (specialTraits.indexOf(trait) !== -1) {
				if (newActorData.data.traits[trait].custom === undefined) {
					newActorData.data.traits[trait].custom = '';
				}
			}
		}

		if (!newActorData.flags.dnd5e) {
			newActorData.flags.dnd5e = {};
		}

		// we don't care about the polymorph status of the token we use to poly
		if (newActorData.flags.dnd5e.polymorpher !== undefined) {
			newActorData.flags.dnd5e.polymorpher = undefined;
		}

		// if we can, we want to preserve exhaustion and inspiration
		if (newActorData.type === 'character') {
			newActorData.data.attributes.exhaustion = originalActor.data.data.attributes.exhaustion;
			newActorData.data.attributes.inspiration = originalActor.data.data.attributes.inspiration;
		}

		// create new class item if the droped actor is an npc and doesnt have class levels
		let classItem = null;
		if (newActorData.data.details.cr) {
			classItem = {};
			classItem.name = `${newActorRawData.name}Class`;
			classItem.type = 'class';
			classItem.data = { levels: newActorData.data.details.cr };
		}

		// keep original values for some, as defined in options
		if (options !== false) {
			if (options.keepPhysical.value) {
				newActorData.data.abilities.str.value = originalActor.data.data.abilities.str.value;
				newActorData.data.abilities.dex.value = originalActor.data.data.abilities.dex.value;
				newActorData.data.abilities.con.value = originalActor.data.data.abilities.con.value;
			}
			if (options.keepMental.value) {
				newActorData.data.abilities.int.value = originalActor.data.data.abilities.int.value;
				newActorData.data.abilities.wis.value = originalActor.data.data.abilities.wis.value;
				newActorData.data.abilities.cha.value = originalActor.data.data.abilities.cha.value;
			}
			if (options.keepSaves.value) {
				newActorData.data.abilities.str.proficient = originalActor.data.data.abilities.str.proficient;
				newActorData.data.abilities.dex.proficient = originalActor.data.data.abilities.dex.proficient;
				newActorData.data.abilities.con.proficient = originalActor.data.data.abilities.con.proficient;
				newActorData.data.abilities.int.proficient = originalActor.data.data.abilities.int.proficient;
				newActorData.data.abilities.wis.proficient = originalActor.data.data.abilities.wis.proficient;
				newActorData.data.abilities.cha.proficient = originalActor.data.data.abilities.cha.proficient;
			}
			if (options.keepSkills.value) {
				newActorData.data.skills = originalActor.data.data.skills;
			}
			if (options.mergeSaves.value) {
				for (let ability in newActorData.data.abilities) {
					if (originalActor.data.data.abilities[ability].proficient > newActorData.data.abilities[ability].proficient) {
						newActorData.data.abilities[ability].proficient = originalActor.data.data.abilities[ability].proficient;
					}
				}
			}
			if (options.mergeSkills.value) {
				for (let skill in newActorData.data.skills) {
					if (originalActor.data.data.skills[skill].value >= newActorData.data.skills[skill].value) {
						if (!options.keepClass.value) {
							let oldProf = originalActor.data.data.attributes.prof * originalActor.data.data.skills[skill].value;
							let newProf = newActorData.data.attributes.prof * Math.max(newActorData.data.skills[skill].value, originalActor.data.data.skills[skill].value);
							let diff = oldProf - newProf;
							//console.log(skill, oldProf, newProf, diff);
							newActorData.data.skills[skill].bonus = diff;
						}
						newActorData.data.skills[skill].value = originalActor.data.data.skills[skill].value;
					}
				}
			}
			if (options.keepClass.value) {
				for (let item of originalActor.data.items) {
					if (item.type === 'class') {
						newActorData.items.push(item);
					}
				}
			}
			if (options.keepFeats.value) {
				for (let item of originalActor.data.items) {
					if (item.type === 'feat') {
						newActorData.items.push(item);
					}
				}
			}
			if (options.keepSpells.value) {
				for (let item of originalActor.data.items) {
					if (item.type === 'spell') {
						newActorData.items.push(item);
					}
				}
			}
			if (options.keepItems.value) {
				for (let item of originalActor.data.items) {
					if (item.type !== 'feat' && item.type !== 'spell' && item.type !== 'class') {
						newActorData.items.push(item);
					}
				}
			}
			if (options.keepBio.value) {
				newActorData.data.details.biography = originalActor.data.data.details.biography;
			}
			if (options.keepVision.value) {
				newActorData.data.traits.senses = originalActor.data.data.traits.senses;
				newActorData.token.dimSight = originalActor.data.token.dimSight;
				newActorData.token.brightSight = originalActor.data.token.brightSight;
				newActorData.token.dimLight = originalActor.data.token.dimLight;
				newActorData.token.brightLight = originalActor.data.token.brightLight;
			}
		}

		if (!originalActor.data.flags.dnd5e) {
			originalActor.data.flags.dnd5e = {};
		}

		// editing tokens owned by the polymorphed character
		let tokens = canvas.tokens.ownedTokens.filter(element => element.data.actorId === originalActor.data._id);
		for (let token of tokens) {
			let newRawTokenData = JSON.parse(JSON.stringify(newActorData.token));
			let oldRawTokenData = JSON.parse(JSON.stringify(token.data));

			// we only want to store the original actor data. If the target is already polymorphed and polymorphs again, we DONT want to set the current data as the original
			if (!originalActor.data.flags.dnd5e.polymorpher
				|| !originalActor.data.flags.dnd5e.polymorpher.data.isPolymorphed)
			{
				if (!newRawTokenData.flags.dnd5e) {
					newRawTokenData.flags.dnd5e = {};
				}

				newRawTokenData.flags.dnd5e.polymorpher = { originalTokenData: oldRawTokenData };
			}
			// do not change x/y coordinates
			delete newRawTokenData.x;
			delete newRawTokenData.y;

			// do not change display settings for name/bars
			delete newRawTokenData.displayName;
			delete newRawTokenData.displayBars;

			token.update(canvas.scene._id, newRawTokenData);
		}

		// we only want to store the original actor data. If the target is already polymorphed and polymorphs again, we DONT want to set the current data as the original
		if (!originalActor.data.flags.dnd5e.polymorpher
			|| !originalActor.data.flags.dnd5e.polymorpher.data.isPolymorphed)
		{
			newActorData.flags.dnd5e.polymorpher = {
				data: {
					isPolymorphed: true,
					originalData: JSON.stringify(originalActor.data)
				}
			};
		}

		originalActor.update(newActorData).then(obj => {
			// manually creating the class item to store the proper class
			if (classItem !== null && !options.keepClass.value) {
				obj.createOwnedItem(classItem);
			}
			// manually updating ac because that doesnt get updated for some reason
			obj.update({ 'data.attributes.ac.value': newActorData.data.attributes.ac.value }).then(obj => {
				obj.sheet.render();
			});
		});
	}

	enableRestoration(app, html, data) {
		let actor = app.object;
		let updateMode = false;
		let flag = actor.getFlag('dnd5e', 'polymorpher.data');
		// only do stuff if the actor has the apropiate flags
		if (flag === undefined) {
			return;
		}

		let appId = html[0].id;
		if (appId == '') {
			updateMode = true; // this applies if the sheet is rerendered after an update rather then opened
			appId = $(html).parents('.app')[0].id;
		}

		//if (data.actor.data.details.source !== undefined && data.actor.data.details.source.polymorpher !== undefined && data.actor.data.details.source.polymorpher.isPolymorphed) {
		if (flag !== undefined && flag.isPolymorphed) {
			let restoreBtn = $(`<a class="restore-actor"><i class="fas fa-backward"> Restore</a>`);
			restoreBtn.click(ev => {
				this.restoreActor(actor, flag.originalData);
			});

			$(`#${appId} .restore-actor`).remove();
			$(`#${appId} .configure-sheet`).before(restoreBtn);
		}

		if (updateMode && flag.isPolymorphed === false) {
			$(`#${appId} .restore-actor`).remove();
		}
	}

	async loadBackupStore() {
		try {
			await fetch('systems/dnd5e/bak/characterStore.json').then(async result => {
				let data = await result.json();
				this.backupCharacterStore = data;
			});
		} catch (e) {
			console.log(e);
			this.backupCharacterStore = {};
		}
	}

	saveBackupStore() {
		let data = new FormData();
		let blob = new Blob([JSON.stringify(this.backupCharacterStore)], { type: "application/json" });
		data.append("target", 'systems/dnd5e/bak');
		data.append("upload", blob, 'characterStore.json');
		data.append('source', 'data');

		let xhr = new XMLHttpRequest();
		xhr.open('POST', '/upload', true);
		xhr.send(data);
	}

	exportFromStorage(combinedId) {
		let originalDataJSON = this.backupCharacterStore[combinedId].data;
		saveDataToFile(originalDataJSON, "application/json", `characterBackup_${this.backupCharacterStore[combinedId].name}.json`);
	}

	restoreFromStorage(combinedId) {
		let originalDataJSON = this.backupCharacterStore[combinedId].data;
		let actorId = combinedId.split('.')[0]
		let actor = game.actors.get(actorId);

		this.restoreActor(actor, originalDataJSON);
	}

	removeFromStorage(combinedId) {
		new Dialog({
			title: "Delete Actor Backup",
			content: "<p>Are you sure?</p>",
			width:auto,
			buttons: {
				yes: {
					icon: '<i class="fas fa-check"></i>',
					label: "Yes",
					callback: () => {
						delete this.backupCharacterStore[combinedId];
						this.saveBackupStore();
						this.render();
					}
				},
				no: {
					icon: '<i class="fas fa-times"></i>',
					label: "No",
					callback: () => { }
				}
			},
			default: "no",
			close: () => { }
		}).render(true);
	}

	restoreActor(actor, originalDataJSON) {
		ui.notifications.info(`Restoring ${actor.name} to their former glory!`);
		let originalData = JSON.parse(originalDataJSON);
		let newFlag = {
			data: {
				isPolymorphed: false,
				originalData: ''
			}
		}

		// restoring token to original state
		let tokens = canvas.tokens.ownedTokens.filter(element => element.data.actorId === originalData._id);
		for (let token of tokens) {
			let originalTokenData = '';

			// we try to get the original token data that was saved for each token since they might not be the same as the prototype
			if (getProperty(token, 'data.flags.dnd5e.polymorpher.originalTokenData')) {
				originalTokenData = token.data.flags.dnd5e.polymorpher.originalTokenData;
			} else {
				// using prototype token data as a fallback
				originalTokenData = originalData.token;
			}
			// do not fall back on x/y coordinates
			delete originalTokenData.x;
			delete originalTokenData.y;
			token.update(canvas.scene._id, originalTokenData);
		}
		if (actor.data.type === 'character') {
			originalData.data.attributes.exhaustion = actor.data.data.attributes.exhaustion;
			originalData.data.attributes.inspiration = actor.data.data.attributes.inspiration;
		}

		if (!originalData.flags.dnd5e) {
			originalData.flags.dnd5e = {};
		}

		originalData.flags.dnd5e.polymorpher = newFlag;
		//actor.data.data = originalData.data; <- doesnt work after reloading

		for (let category in originalData.data) {
			for (let attr in originalData.data[category]) {
				if (typeof originalData.data[category][attr] === 'object' && (originalData.data[category][attr] === null || originalData.data[category][attr].value === undefined)) {
					if (originalData.data[category][attr] === null) {
						originalData.data[category][attr] = '';
					} else {
						originalData.data[category][attr].value = '';
					}
				}
				let specialTraits = ['languages', 'di', 'dr', 'dv', 'ci'];
				if (specialTraits.indexOf(attr) !== -1) {
					if (originalData.data[category][attr].custom === undefined) {
						originalData.data[category][attr].custom = '';
					}
				}
			}
		}

		actor.update(originalData).then(obj => {
			obj.sheet.render();
		});

		// removing backup in the settings
		/*
		this.backupCharacterStore[actor.data._id] = undefined;
		game.settings.set('Polymorpher', 'backup', this.backupCharacterStore);*/
	}
}
