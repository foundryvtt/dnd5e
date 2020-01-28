
export class ClassHelper {
  /**
   * Calculate the Actor's level based on the class(es) they have configured
   * @param {Actor} items
   * @returns {Number}            Total number of levels we found within Items of type Class
   */
  static getLevelByClasses = function(actor) {

    // manually entered level
    if (!game.settings.get("dnd5e", "useClassLevels")) {
      return actor.data.details.level.value
    } 

    // level calculated by Class Features
    if ( !actor.items.length) { return 0; }

    return actor.items.reduce((totalLevels, item) => {
      if (item.type === "class") {
        if (item.data && item.data.levels > 0) {
          return Number(totalLevels) + Number(item.data.levels);
        }
      }
      return totalLevels;
    }, []);
  }

  /**
   * 
   * @param {Object<ActorSheet5eCharacter>} actorData 
   * @returns {Array<ClassHitDice>}   list of details for the hit dice of each class on the actor
   */
  static listClassHitDice = function(actorData) {
    if (!actorData || !actorData.items) {
      return [];
    }

    let classes = this.listClasses(actorData);

    if (classes.length == 0) { return []; }

    let hd = [];

    // for each class with levels, push an appropriate amount of HD into the array
    classes.forEach(element => {
      let featureId = element._id;
      let className = element.name;
      let classLevels = element.data.levels ? Number(element.data.levels) : 0;
      let hitDice = element.data.hitDice;
      let hitDiceUsed = element.data.hitDiceUsed ? Number(element.data.hitDiceUsed) : 0;

      hd.push(new ClassHitDice(featureId, className, classLevels, hitDice, hitDiceUsed));
    });

    return hd;
  }

  static hitDiceRemainingCount = function(actorData) {
    let list = this.listClassHitDice(actorData);

    return list.reduce((totalLevels, item) => {
      if (item && item.level > 0 && item.hitDiceUsed >= 0) {
        return Number(totalLevels) + Number(item.level) - Number(item.hitDiceUsed);
      }

      return totalLevels;
    }, []);
  }

  static listClasses = function(actorData) {
    let classes = actorData.items.filter(item => item.type === "class")
    return classes;
  }
}

export class ClassHitDice {
  constructor(featureId, className, level, hitDice, hitDiceUsed){
    this._featureId = featureId;
    this._className = className;
    this._level = level;
    this._hitDice = hitDice;
    this._hitDiceUsed = hitDiceUsed;
  }

  get featureId() {
    return this._featureId;
  }

  get className() {
    return this._className;
  }

  get level() {
    return this._level;
  }

  get hitDice() {
    return this._hitDice;
  }
  
  get hitDiceUsed(){
    return this._hitDiceUsed;
  }
}