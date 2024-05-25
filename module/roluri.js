// File: roluri.js
const Rights = require("./drepturi");

class Rol {
  constructor(cod) {
    this.cod = cod;
    this.rights = [];
  }

  get getRights() {
    return this.rights;
  }

  hasRight(right) {
    return this.rights.includes(right);
  }
}

class RolComun extends Rol {
  constructor() {
    super("comun");
    this.rights = [];
  }
}

class RolConfirmat extends Rol {
  constructor() {
    super("confirmat");
    this.rights = [
      Rights.LOGIN,
      Rights.VIEW_PRODUCT,
      Rights.BUY_PRODUCT,
      Rights.VIEW_USER,
    ];
  }
}

class RolAdmin extends Rol {
  constructor() {
    super("admin");
    this.drepturi = Object.values(Rights);
  }
}

class RolModerator extends Rol {
  constructor() {
    super("moderator");
    this.drepturi = [
      Rights.LOGIN,
      Rights.VIEW_USER,
      Rights.EDIT_USER,
      Rights.DELETE_USER,
      Rights.ADD_USER,
    ];
  }
}

class RolFactory {
  static creeazaRol(cod) {
    switch (cod) {
      case "comun":
        return new RolComun();
      case "confirmat":
        return new RolConfirmat();
      case "admin":
        return new RolAdmin();
      case "moderator":
        return new RolModerator();
      default:
        throw new Error("Unknown role code");
    }
  }
}

module.exports = {
  Rol,
  RolComun,
  RolConfirmat,
  RolAdmin,
  RolModerator,
  RolFactory,
};
