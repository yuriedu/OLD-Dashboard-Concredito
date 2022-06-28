const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}, error => {
  if (error) {
    console.log(`[Consultas WebSite] => Erro na DataBase: ${error}`);
    return process.exit(1);
  }
  return console.log(`[Consultas WebSite] => Database Connected!`);
});

var banksMolde = new mongoose.Schema({
  _id: String,
  simulation: String,
  total: String,
})

var lotesMolde = new mongoose.Schema({
  _id: String,
  banks: [banksMolde],
})

var lotesSchema = new mongoose.Schema({
  _id: String,
  cpfs: [lotesMolde]
})

var Lotes = mongoose.model('Lotes', lotesSchema)
exports.Lotes = Lotes