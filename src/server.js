const createApp = require('./app');
const InMemoryProductRepository = require('./repositories/inMemoryProductRepository');
const JsonFileProductRepository = require('./repositories/jsonFileProductRepository');

const repository = process.env.STORAGE === 'memory'
  ? new InMemoryProductRepository()
  : new JsonFileProductRepository();

const PORT = process.env.PORT || 3000;
createApp(repository).listen(PORT, () => {
  console.log(`Inventory system running at http://localhost:${PORT}`);
});
