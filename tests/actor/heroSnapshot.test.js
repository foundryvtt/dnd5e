import { expect, test } from '@jest/globals';
import Datastore from 'nedb-promises';
import Actor5e from '../../module/actor/entity';

let db;

beforeAll(async () => {
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

    // heroActor.update = jest.fn(x => x);

    console.log('hero actor', heroActor);

    heroActor.update('foo');

    expect(heroActor.update).toHaveBeenCalled();

    expect(heroActor).toBeDefined();
  })
})