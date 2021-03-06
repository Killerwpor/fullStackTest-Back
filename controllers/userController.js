//Requires
const jwt = require("jsonwebtoken");
const { User, Coin, CoinUser } = require("../dbConfig");
const dotenv = require("dotenv");
const axios = require("axios").default;
const coinController = require("../controllers/coinController");

exports.guardarUsuario = async (req, res) => {
  let monedaFavorita = [req.body.monedaPreferida];
  const infoMoneda = await coinController.obtenerInfoMonedas(monedaFavorita); //Se busca si la moneda que mandó el usuario si existe
  if (infoMoneda.length != 0) {
    //Guardar usuario
    const user = User.create(req.body)
      .then(function (model) {
        //Guardar moneda

        const coin = Coin.create(infoMoneda[0])
          .then(function (model) {})
          .catch(function (e) {});
        //Guardar relación usuario-moneda
        const infoCoinMoneda = {
          CoinId: infoMoneda[0].id,
          UserUserName: req.body.userName,
          favorita: true,
        };
        const coinUser = CoinUser.create(infoCoinMoneda)
          .then(function (model) {})
          .catch(function (e) {});
        //console.log(model);
        res.json(model);
      })
      .catch(function (e) {});
  } else {
    //Si no existe se le indica
    res.send("Moneda favorita no existe");
  }
};

exports.login = async (req, res) => {
  User.findOne({
    where: {
      username: req.body.userName,
    },
    attributes: ["password"],
  })
    .then(function (response) {
      if (response.password == req.body.password) {
        // get config vars
        dotenv.config();

        const payload = {
          check: true,
        };
        const token = jwt.sign(payload, process.env.TOKEN_SECRET, {
          expiresIn: 600,
        });
        try {
          User.update(
            { token: token },
            { where: { username: req.body.userName } }
          );
        } catch (err) {
          console.log(err);
        }
        res.json({
          message: "Autenticación correcta",
          token: token,
        });
      } else {
        res.json({
          message: "Usuario o contraseña incorrecta",
        });
      }
    })
    .catch(function (e) {
      if (e.message == "Cannot read property 'password' of null")
        res.json({
          message: "Usuario o contraseña incorrecta",
        });
      else
        res.json({
          message: e.message,
        });
    });
};

exports.listarMonedas = async (req, res) => {
  // //Comprobar si esta guardando a su usuario
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  const user = await User.findByPk(req.body.userName);
  if (user.token != null && user.token == token) {
    //Listar monedas
    var monedas = await Coin.findAll({
      raw: true,
      attributes: ["id", "name", "symbol"],

      include: [
        {
          model: User,
          attributes: [],
          where: { userName: req.body.userName },
          through: {
            attributes: [],
          },
        },
      ],
    });
    // En monedas se tiene el array de monedas
    // Ahora a hacer la conversión y mostrar el precio

    const monedaFavorita = await CoinUser.findOne({
      attributes: ["CoinId"],
      where: {
        UserUserName: req.body.userName,
        favorita: true,
      },
    });
    const precioEnMonedaFavorita = await coinController.conversionMonedas(
      monedas,
      monedaFavorita.CoinId
    );

    //Ya se tienen los precios en la monedad favorita del usuario, ahora a organizarlos y mostrarlos
    for (i in monedas) {
      monedas[i].precio = precioEnMonedaFavorita[i];
    }
    //Se muestra el resultado
    res.send(monedas);
  } else {
    res.send("No tiene permiso");
  }
};

exports.topTresMonedas = async (req, res) => {
  // //Comprobar si esta guardando a su usuario
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  const user = await User.findByPk(req.body.userName);
  if (user.token != null && user.token == token) {
    //Listar monedas
    var monedas = await Coin.findAll({
      raw: true,
      attributes: ["id", "name", "symbol"],

      include: [
        {
          model: User,
          attributes: [],
          where: { userName: req.body.userName },
          through: {
            where: { favorita: false },
            attributes: [],
          },
        },
      ],
    });
    // En monedas se tiene el array de monedas
    // Ahora a hacer la conversión y mostrar el precio

    const monedaFavorita = await CoinUser.findOne({
      attributes: ["CoinId"],
      where: {
        UserUserName: req.body.userName,
        favorita: true,
      },
    });
    //console.log(monedas.length);
    const precioEnMonedaFavorita = await coinController.conversionMonedas(
      monedas,
      monedaFavorita.CoinId
    );

    //Ya se tienen los precios en la monedad favorita del usuario, ahora a organizarlos y mostrarlos
    for (i in monedas) {
      monedas[i].precio = precioEnMonedaFavorita[i];
    }

    //Se ordena y se corta el array para sacar el top 3
    monedas = monedas.sort((a, b) => b.precio - a.precio);
    monedas = monedas.slice(0, 3);

    //Si ingresa true en el parametro asc se muestra ascendente
    if (req.body.asc == "true") {
      monedas = monedas.sort((a, b) => a.precio - b.precio);
    }

    //Se muestra el resultado
    res.send(monedas);
  } else {
    res.send("No tiene permiso");
  }
};
