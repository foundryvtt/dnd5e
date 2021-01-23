import Datastore from 'nedb-promises';
import Actor5e from 'module/actor/entity';
import { DND5E } from 'module/config.js'

let db;

beforeAll(async () => {
  global.DND5E = DND5E;

  db = await new Datastore({filename: 'packs/heroes.db', autoload: true});
});

describe('hero db', () => {
  test('a hero should be named Merric', async () => {
    const dbQuery = await db.find({ _id: '1tAXamEdCqcLQwpM' });
    const hero = dbQuery[0];
  
    expect(hero.name).toBe('Merric (Halfling Barbarian)');
  })

  test('a hero exists in the db', async () => {
    const dbQuery = await db.find({ _id: '1tAXamEdCqcLQwpM' });
    const hero = dbQuery[0];
  
    expect(hero).toMatchSnapshot();
  });
  
})


describe('hero entity', () => {
  test('some test', async () => {
    const dbQuery = await db.find({ _id: '1tAXamEdCqcLQwpM' });
    const hero = dbQuery[0];

    const heroActor = new Actor5e(hero);

    heroActor.update('foo');

    expect(heroActor.update).toHaveBeenCalledWith('foo');


    // want to test any other method and see if `heroActor.update` was called with a consistent set of arguments (snapshot test those)

  });

  test('getRollData snapshot', async () => {

    const dbQuery = await db.find({ _id: '1tAXamEdCqcLQwpM' });
    const hero = dbQuery[0];

    const heroActor = new Actor5e(hero);

    const rollData = heroActor.getRollData();

    console.log('rollData', rollData)

    expect(rollData).toMatchSnapshot();
  });
})