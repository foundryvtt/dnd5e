
export class ClassHelper {
  /**
   * Calculate the Actor's level based on the class(es) they have configured
   * @param {Actor} items
   * @returns {Number}            Total number of levels we found within Items of type Class
   */
  static getLevelByClasses = function(actor) {
    if (actor.items) {
      return actor.items.reduce((totalLevels, item) => {
        if (item.type === "class") {
          if (item.data && item.data.levels > 0) {
            return Number(totalLevels) + Number(item.data.levels);
          }
        }
        return 0;
      }, []);
    }
    return 0;
  }

    /**
   * Loads a list of remaining hit dice based on the characters Class Features/Levels combined with "hdUsed"
   * @param {Object<ActorSheet5eCharacter>} actorData 
   * @returns {Array} 
   */
   static hitdiceRemaining = function(actorData){
    if (!Array.isArray(actorData.data.attributes.hdUsed)) {
      // Field has not been initialized, let's do this now
      actorData.data.attributes.hdUsed = [];
    }
    
    let hdAvailable = this.hitdiceAvailable(actorData);
    let hdUsed = actorData.data.attributes.hdUsed;

    hdUsed.forEach(element => {
      var index = hdAvailable.indexOf(element);
 
      if (index > -1) {
        hdAvailable.splice(index, 1);
      }
    });

    return hdAvailable;
  }

  /**
   * 
   * @param {Object<ActorSheet5eCharacter>} actorData 
   * @returns {Array}   strings that should be in dice format
   */
  static hitdiceAvailable = function(actorData) {
    if (!actorData || !actorData.items) {
      return [];
    }

    let classes = actorData.items.filter(item => item.type === "class");

    if (classes.length == 0) { return []; }

    let hd = [];

    // for each class with levels, push an appropriate amount of HD into the array
    classes.forEach(element => {
      for (let i = 0; i < element.data.levels; i++) {
        hd.push(element.data.hitdice)
      }
    });

    return hd;
  }
}
