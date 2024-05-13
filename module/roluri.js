// File: roluri.js
const Rights = require("./drepturi");

class Rol {
  constructor(cod) {
    this.cod = cod;
    this.drepturi = [];
  }

  get listaDrepturi() {
    return this.drepturi;
  }

  areDreptul(drept) {
    return this.drepturi.includes(drept);
  }
}

class RolClient extends Rol {
  constructor() {
    super("comun");
    this.drepturi = [Rights.VIEW_DATA, Rights.ADD_DATA];
  }
}

class RolAdmin extends Rol {
  constructor() {
    super("admin");
    this.drepturi = [
      Rights.VIEW_DATA,
      Rights.EDIT_DATA,
      Rights.DELETE_DATA,
      Rights.ADD_DATA,
      Rights.VIEW_REPORTS,
      Rights.EDIT_SETTINGS,
      Rights.MANAGE_USERS,
    ];
  }
}

class RolModerator extends Rol {
  constructor() {
    super("moderator");
    this.drepturi = [Rights.VIEW_DATA, Rights.EDIT_DATA, Rights.MANAGE_USERS];
  }
}

class RolFactory {
  static creeazaRol(cod) {
    switch (cod) {
      case "comun":
        return new RolClient();
      case "admin":
        return new RolAdmin();
      case "moderator":
        return new RolModerator();
      default:
        throw new Error("Unknown role code");
    }
  }
}

module.exports = { Rol, RolClient, RolAdmin, RolModerator, RolFactory };
