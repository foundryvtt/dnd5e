import Datastore from 'nedb-promises';
import Actor5e from 'module/actor/entity';
import { DND5E } from 'module/config.js'

let db;
let actor5eCharacter;

beforeAll(async () => {
  global.DND5E = DND5E;

  db = await new Datastore({filename: 'packs/heroes.db', autoload: true});
});

describe('hero db', () => {
  it('should have Merric', async () => {
    const dbQuery = await db.find({ _id: '1tAXamEdCqcLQwpM' });
    const hero = dbQuery[0];

    expect(hero).toMatchSnapshot();
  });

  it('should have Zanna', async () => {
    const dbQuery = await db.find({ _id: 'p6FusMkGMOMBTDkt' });
    const hero = dbQuery[0];

    expect(hero).toMatchSnapshot();
  });
});

describe('Actor5e#longRest', () => {
  beforeEach(async () => {
    const dbQuery = await db.find({ _id: 'p6FusMkGMOMBTDkt' }); // gnome wizard
    const hero = dbQuery[0];
    actor5eCharacter = new Actor5e(hero);

  })

  it('should restore spell slots to max', async () => {
    // set spells to 0
    actor5eCharacter.data.data.spells.spell1.value = 0;

    await actor5eCharacter.longRest({dialog: false});

    expect(actor5eCharacter.data.data.spells).toMatchSnapshot();
    expect(actor5eCharacter.update.mock.calls).toMatchSnapshot();
  });

  it('should restore spell slots to overriden max', async () => {
    // set level 1 spell override to 100
    actor5eCharacter.data.data.spells.spell1.override = 100;

    await actor5eCharacter.longRest({dialog: false});

    expect(actor5eCharacter.data.data.spells).toMatchSnapshot();
    expect(actor5eCharacter.update.mock.calls).toMatchSnapshot();
  });

  it('should restore hp', async () => {
    // set hp to 1
    actor5eCharacter.data.data.attributes.hp.value = 1;
    
    await actor5eCharacter.longRest({dialog: false});

    expect(actor5eCharacter.data.data.attributes.hp).toMatchSnapshot();
    expect(actor5eCharacter.update.mock.calls).toMatchSnapshot();
  });
});

describe('Actor5e#applyDamage', () => {
  beforeEach(async () => {
    const dbQuery = await db.find({ _id: '1tAXamEdCqcLQwpM' }); // halfling barbarian
    const hero = dbQuery[0];
    actor5eCharacter = new Actor5e(hero);
  })

  it('should apply 3 damage', async () => {
    await actor5eCharacter.applyDamage(3);

    expect(actor5eCharacter.data.data.attributes.hp).toMatchSnapshot();
    expect(Hooks.call.mock.calls).toMatchSnapshot();
    expect(actor5eCharacter.update.mock.calls).toMatchSnapshot();
  });

  it('should apply 3 damage with a multiplier of 2', async () => {
    await actor5eCharacter.applyDamage(3, 2);

    expect(actor5eCharacter.data.data.attributes.hp).toMatchSnapshot();
    expect(Hooks.call.mock.calls).toMatchSnapshot();
    expect(actor5eCharacter.update.mock.calls).toMatchSnapshot();
  });
});

describe('Actor5e#getRollData', () => {
  beforeEach(async () => {
    const dbQuery = await db.find({ _id: '1tAXamEdCqcLQwpM' }); // halfling barbarian
    const hero = dbQuery[0];
    actor5eCharacter = new Actor5e(hero);
  });

  it('should return the rollData', async () => {
    const dbQuery = await db.find({ _id: '1tAXamEdCqcLQwpM' }); // halfling barbarian
    const hero = dbQuery[0];
    const heroActor = new Actor5e(hero);

    const rollData = heroActor.getRollData();

    expect(rollData).toMatchSnapshot();
  });
});